/**
 * Preventive Maintenance Service
 * Parse Excel/CSV and create PreventiveMaintenancePlan records
 */

import { prisma } from '../../config/database.js';
import type { PmScheduleType } from '@prisma/client';
import * as XLSX from 'xlsx';
import { writeTicketAudit } from '../audit/audit-service.js';

export interface ParsedPmRow {
  asset_name: string;
  task_description: string;
  vendor_company_id: number;
  vendor_user_id?: number;
  schedule_type: 'INTERVAL' | 'SPECIFIC_DATES';
  interval_days?: number;
  specific_dates?: string;
}

export interface ParseResult {
  rows: ParsedPmRow[];
  errors: string[];
}

function findColumnKey(row: Record<string, unknown>, ...names: string[]): string | null {
  const keys = Object.keys(row);
  const lower = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');
  for (const name of names) {
    const n = lower(name);
    const key = keys.find(
      (k) =>
        lower(k) === n ||
        lower(k).replace(/\s+/g, '') === n.replace(/_/g, '') ||
        lower(k).startsWith(n)
    );
    if (key) return key;
  }
  return null;
}

function getCell(row: Record<string, unknown>, ...names: string[]): unknown {
  const key = findColumnKey(row, ...names);
  return key ? row[key] : undefined;
}

function toString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function toInt(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.floor(v);
  if (typeof v === 'string') {
    const n = parseInt(v.replace(/[^\d-]/g, ''), 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * Parse Excel or CSV buffer into PM rows
 */
export function parsePmFile(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return { rows: [], errors: ['No sheet found in file'] };
  }
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const rows: ParsedPmRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // 1-based + header

    const assetName = toString(getCell(row, 'asset_name', 'asset name'));
    const taskDesc = toString(getCell(row, 'task_description', 'task description'));
    const vendorCompanyId = toInt(getCell(row, 'vendor_company_id', 'vendor_company_id'));
    const vendorUserId = toInt(getCell(row, 'vendor_user_id', 'vendor_user_id'));
    const scheduleTypeRaw = toString(
      getCell(row, 'schedule_type', 'schedule type')
    ).toUpperCase();
    const intervalDays = toInt(getCell(row, 'interval_days', 'interval_days'));
    const specificDates = toString(getCell(row, 'specific_dates', 'specific dates'));

    if (!assetName) {
      errors.push(`Row ${rowNum}: asset_name is required`);
      continue;
    }
    if (!taskDesc) {
      errors.push(`Row ${rowNum}: task_description is required`);
      continue;
    }
    if (vendorCompanyId == null || vendorCompanyId < 1) {
      errors.push(`Row ${rowNum}: vendor_company_id must be a positive integer`);
      continue;
    }

    const scheduleType =
      scheduleTypeRaw === 'INTERVAL' || scheduleTypeRaw === 'SPECIFIC_DATES'
        ? scheduleTypeRaw
        : null;

    if (!scheduleType) {
      errors.push(
        `Row ${rowNum}: schedule_type must be INTERVAL or SPECIFIC_DATES`
      );
      continue;
    }

    if (scheduleType === 'INTERVAL' && (intervalDays == null || intervalDays < 1)) {
      errors.push(`Row ${rowNum}: interval_days is required for INTERVAL schedule`);
      continue;
    }

    if (scheduleType === 'SPECIFIC_DATES' && !specificDates) {
      errors.push(
        `Row ${rowNum}: specific_dates is required for SPECIFIC_DATES schedule`
      );
      continue;
    }

    rows.push({
      asset_name: assetName,
      task_description: taskDesc,
      vendor_company_id: vendorCompanyId,
      vendor_user_id: vendorUserId && vendorUserId > 0 ? vendorUserId : undefined,
      schedule_type: scheduleType,
      interval_days: scheduleType === 'INTERVAL' ? intervalDays : undefined,
      specific_dates:
        scheduleType === 'SPECIFIC_DATES' ? specificDates : undefined,
    });
  }

  return { rows, errors };
}

/**
 * Import parsed rows into DB for the given company
 */
export async function importPmPlans(
  companyId: number,
  createdById: number,
  rows: ParsedPmRow[]
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { stores: { include: { assets: true } } },
  });
  if (!company) {
    return { created: 0, errors: ['Company not found'] };
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      // Resolve asset by name (match description in company's stores)
      let assetId: number | undefined;
      let storeId: number | undefined;
      for (const store of company.stores) {
        const asset = store.assets.find(
          (a) =>
            (a.description ?? '').toLowerCase().trim() ===
            r.asset_name.toLowerCase().trim()
        );
        if (asset) {
          assetId = asset.id;
          storeId = store.id;
          break;
        }
      }

      // Verify vendor company exists
      const vendorCompany = await prisma.vendorCompany.findUnique({
        where: { id: r.vendor_company_id },
      });
      if (!vendorCompany) {
        errors.push(`Row ${i + 1}: vendor_company_id ${r.vendor_company_id} not found`);
        continue;
      }

      // Verify vendor user if provided
      if (r.vendor_user_id) {
        const vendorUser = await prisma.vendorUser.findFirst({
          where: {
            id: r.vendor_user_id,
            vendorCompanyId: r.vendor_company_id,
          },
        });
        if (!vendorUser) {
          errors.push(
            `Row ${i + 1}: vendor_user_id ${r.vendor_user_id} not found or not in vendor company`
          );
          continue;
        }
      }

      await prisma.preventiveMaintenancePlan.create({
        data: {
          companyId,
          assetId: assetId ?? undefined,
          assetName: r.asset_name,
          storeId: storeId ?? undefined,
          taskDescription: r.task_description,
          vendorCompanyId: r.vendor_company_id,
          vendorUserId: r.vendor_user_id,
          scheduleType: r.schedule_type as PmScheduleType,
          intervalDays: r.interval_days,
          specificDates: r.specific_dates,
          createdById,
        },
      });
      created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Row ${i + 1}: ${msg}`);
    }
  }

  return { created, errors };
}

/**
 * Create tickets and work orders from selected PM plans
 */
export async function createWorkOrdersFromPlans(
  planIds: number[],
  companyId: number,
  createdByUserId: number
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;

  const amm = await prisma.internalUser.findFirst({
    where: { companyId, role: 'AMM', active: true },
  });
  if (!amm) {
    return { created: 0, errors: ['No AMM user found for company'] };
  }

  for (const planId of planIds) {
    try {
      const plan = await prisma.preventiveMaintenancePlan.findFirst({
        where: { id: planId, companyId },
        include: { store: true, asset: true, vendorCompany: true },
      });
      if (!plan) {
        errors.push(`Plan ${planId} not found`);
        continue;
      }
      if (!plan.storeId) {
        errors.push(`Plan ${planId}: store required`);
        continue;
      }

      const s1 = await prisma.vendorUser.findFirst({
        where: { vendorCompanyId: plan.vendorCompanyId, role: 'S1', active: true },
      });
      if (!s1) {
        errors.push(`Plan ${planId}: Vendor has no S1 user`);
        continue;
      }

      const ticket = await prisma.ticket.create({
        data: {
          companyId,
          storeId: plan.storeId,
          createdByUserId,
          category: 'OTHER',
          description: `[Preventive] ${plan.taskDescription}`,
          originalDescription: `[Preventive] ${plan.taskDescription}`,
          urgent: false,
          currentStatus: 'COST_ESTIMATION_APPROVED',
          currentOwnerUserId: amm.id,
          assetId: plan.assetId ?? undefined,
        },
      });

      await prisma.costEstimation.create({
        data: {
          ticketId: ticket.id,
          estimatedAmount: 0,
          createdByUserId: amm.id,
        },
      });

      await prisma.approvalRecord.create({
        data: {
          ticketId: ticket.id,
          approverUserId: amm.id,
          role: 'AMM',
          decision: 'APPROVED',
          comment: 'Auto-approved from preventive maintenance plan',
        },
      });

      await prisma.workOrder.create({
        data: {
          ticketId: ticket.id,
          vendorCompanyId: plan.vendorCompanyId,
          assignedTechnicianId: plan.vendorUserId ?? undefined,
          assetId: plan.assetId ?? undefined,
          currentStatus: 'CREATED',
          currentOwnerType: 'VENDOR',
          currentOwnerId: s1.id,
          commentToVendor: plan.taskDescription,
        },
      });

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { currentStatus: 'WORK_ORDER_IN_PROGRESS' },
      });

      await writeTicketAudit({
        ticketId: ticket.id,
        prevStatus: 'Ticket Cost Estimation Approved',
        newStatus: 'Work Order In Progress',
        actionType: 'CREATE_WO_FROM_PM',
        actorType: 'INTERNAL',
        actorId: createdByUserId,
      });

      created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Plan ${planId}: ${msg}`);
    }
  }

  return { created, errors };
}

