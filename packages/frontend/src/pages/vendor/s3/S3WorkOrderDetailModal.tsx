/**
 * S3 Work Order Detail — Section 15.5–15.11
 * Read-only: WO, Ticket, Store, Category, Urgency, work report, attachments, asset.
 * Editable invoice table: auto rows (Arrival + Labor) + manual rows; Complete/Edit Proposal; Send Cost Proposal.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  workOrdersAPI,
  type WorkOrderDetail,
  type VendorPriceListItem,
} from '../../../api/work-orders';
import { useSession } from '../../../contexts/SessionContext';
import { Button, Badge } from '../../../components/shared';
import { getS3WODraft, setS3WODraft, clearS3WODraft } from './s3Draft';
import { formatCategory, formatHistoryAction } from '../../../utils/formatters';

const NOT_IN_PRICELIST_VALUE = '__not_in_list__';

interface InvoiceRowInput {
  description: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  priceListItemId?: number;
  isFromPriceList: boolean;
  /** When true, user chose "Item not in pricelist" and can enter free text in description */
  isNotInPricelist?: boolean;
}

interface S3WorkOrderDetailModalProps {
  workOrderId: number;
  onClose: () => void;
}

function laborHoursFromCheckInOut(checkinTs: string | null, checkoutTs: string | null): number {
  if (checkinTs == null || checkoutTs == null) return 0;
  const start = new Date(checkinTs).getTime();
  const end = new Date(checkoutTs).getTime();
  const durationMs = end - start;
  if (durationMs <= 0) return 0;
  const durationQuarters = Math.ceil(durationMs / (15 * 60 * 1000));
  return durationQuarters * 0.25;
}

/** Total labor hours across all visit pairs (supports any number of visits, e.g. repeated "follow up visit needed"). */
function totalLaborHoursFromVisitPairs(
  visitPairs: Array<{ checkinTs: string; checkoutTs: string | null }> | undefined,
  fallbackCheckin: string | null,
  fallbackCheckout: string | null
): number {
  if (visitPairs != null && visitPairs.length > 0) {
    return visitPairs.reduce(
      (sum, p) => sum + laborHoursFromCheckInOut(p.checkinTs, p.checkoutTs),
      0
    );
  }
  return laborHoursFromCheckInOut(fallbackCheckin, fallbackCheckout);
}

/** Billed units for service-time billing: ceil(duration / unitMinutes). */
function serviceTimeUnitsFromCheckInOut(
  checkinTs: string | null,
  checkoutTs: string | null,
  unitMinutes: number
): number {
  if (checkinTs == null || checkoutTs == null) return 0;
  const start = new Date(checkinTs).getTime();
  const end = new Date(checkoutTs).getTime();
  const durationMs = end - start;
  if (durationMs <= 0) return 0;
  const units = Math.ceil(durationMs / (unitMinutes * 60 * 1000));
  return units;
}

/** Total service-time units across all visit pairs (any number of visits). */
function totalServiceTimeUnitsFromVisitPairs(
  visitPairs: Array<{ checkinTs: string; checkoutTs: string | null }> | undefined,
  unitMinutes: number,
  fallbackCheckin: string | null,
  fallbackCheckout: string | null
): number {
  if (visitPairs != null && visitPairs.length > 0) {
    return visitPairs.reduce(
      (sum, p) => sum + serviceTimeUnitsFromCheckInOut(p.checkinTs, p.checkoutTs, unitMinutes),
      0
    );
  }
  return serviceTimeUnitsFromCheckInOut(fallbackCheckin, fallbackCheckout, unitMinutes);
}

export function S3WorkOrderDetailModal({ workOrderId, onClose }: S3WorkOrderDetailModalProps) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [proposalCompleted, setProposalCompleted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRowInput[]>([]);
  const [initialized, setInitialized] = useState(false);
  const invoiceRowsRef = useRef<InvoiceRowInput[]>([]);
  invoiceRowsRef.current = invoiceRows;

  const { data: wo, isLoading: loadingWO } = useQuery({
    queryKey: ['work-order', workOrderId],
    queryFn: () => workOrdersAPI.getById(workOrderId),
    enabled: workOrderId > 0,
  });

  const { data: priceList = [] } = useQuery({
    queryKey: ['price-list', session?.companyId],
    queryFn: () => workOrdersAPI.getPriceList(session!.companyId),
    enabled: session?.companyId != null,
  });

  // Items selectable in dropdown (exclude auto-applied billing rules e.g. Arrival to location, Service time)
  const selectablePriceList = useMemo(
    () => priceList.filter((p) => p.selectableInUI !== false),
    [priceList]
  );
  const autoApplyItems = useMemo(
    () => priceList.filter((p) => p.selectableInUI === false),
    [priceList]
  );

  const isEditable =
    wo?.currentStatus === 'Service Completed' || wo?.currentStatus === 'Cost Revision Requested';
  const isOwner = session?.userId != null && wo?.currentOwnerId === session.userId;
  const canEditAndSubmit = isEditable && isOwner;
  const techCount = Math.max(1, wo?.declaredTechCount ?? 1);

  const categories = useMemo(() => {
    const set = new Set(selectablePriceList.map((p) => p.category));
    return Array.from(set).sort();
  }, [selectablePriceList]);

  const byCategory = useMemo(() => {
    const map = new Map<string, VendorPriceListItem[]>();
    for (const p of selectablePriceList) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return map;
  }, [selectablePriceList]);

  const arrivalItem = useMemo(
    () =>
      priceList.find((p) => {
        const desc = p.description.toLowerCase();
        const category = p.category.toLowerCase();
        const unit = p.unit.toLowerCase();
        return (
          desc.includes('arrival') ||
          desc.includes('dolazak') ||
          (category === 'fixed fees' && (unit.includes('visit') || unit.includes('arrival')))
        );
      }) ??
      priceList.find((p) => p.category.toLowerCase() === 'fixed fees'),
    [priceList]
  );

  const laborItem = useMemo(
    () =>
      priceList.find((p) => {
        const desc = p.description.toLowerCase();
        const category = p.category.toLowerCase();
        return (
          category === 'labor' &&
          (p.unitMinutes != null ||
            desc.includes('service time') ||
            desc.includes('service hours') ||
            desc.includes('hour') ||
            desc.includes('radni sati') ||
            desc.includes('vrijeme servisa'))
        );
      }) ?? priceList.find((p) => p.category.toLowerCase() === 'labor'),
    [priceList]
  );

  const isServiceTimeInvoiceRow = (row: Pick<InvoiceRowInput, 'description' | 'priceListItemId'>): boolean => {
    const desc = row.description.toLowerCase();
    if (
      desc.includes('service time') ||
      desc.includes('service hours') ||
      desc.includes('radni sati') ||
      desc.includes('vrijeme servisa')
    ) {
      return true;
    }
    if (row.priceListItemId == null) return false;
    const item = priceList.find((p) => p.id === row.priceListItemId);
    return (item?.unitMinutes ?? 0) > 0;
  };

  const normalizeServiceTimeRowsPerTechnician = (rows: InvoiceRowInput[]): InvoiceRowInput[] => {
    if (techCount <= 1) return rows;
    const serviceRows = rows.filter((row) => isServiceTimeInvoiceRow(row));
    if (serviceRows.length === 0 || serviceRows.length >= techCount) return rows;

    const firstServiceIndex = rows.findIndex((row) => isServiceTimeInvoiceRow(row));
    if (firstServiceIndex < 0) return rows;

    const additionalRows = Array.from({ length: techCount - serviceRows.length }, () => ({
      ...serviceRows[0],
    }));
    const nonServiceRowsAfterFirst = rows
      .slice(firstServiceIndex)
      .filter((row) => !isServiceTimeInvoiceRow(row));

    return [
      ...rows.slice(0, firstServiceIndex),
      ...serviceRows,
      ...additionalRows,
      ...nonServiceRowsAfterFirst,
    ];
  };

  useEffect(() => {
    if (wo == null || priceList.length === 0 || initialized) return;
    const draft = getS3WODraft(workOrderId);
    if (draft?.invoiceRows != null && draft.invoiceRows.length > 0) {
      setInvoiceRows(normalizeServiceTimeRowsPerTechnician(draft.invoiceRows));
      setInitialized(true);
      return;
    }
    if (wo.invoiceRows != null && wo.invoiceRows.length > 0) {
      const mappedRows = wo.invoiceRows.map((r) => {
        const fromList = r.priceListItemId != null;
        return {
          description: r.description,
          unit: r.unit,
          quantity: r.quantity,
          pricePerUnit: r.pricePerUnit,
          priceListItemId: r.priceListItemId ?? undefined,
          isFromPriceList: fromList,
          isNotInPricelist: !fromList && r.description.trim() !== '',
        };
      });
      setInvoiceRows(normalizeServiceTimeRowsPerTechnician(mappedRows));
    } else {
      const visitPairs = wo.visitPairs;
      // Arrival count = number of site visits (supports many visits when S2 repeatedly chooses "follow up visit needed")
      const visitCount =
        visitPairs != null && visitPairs.length > 0
          ? visitPairs.length
          : (wo.checkinTs != null && wo.checkoutTs != null ? 1 : 0);
      const totalLaborH = totalLaborHoursFromVisitPairs(
        visitPairs,
        wo.checkinTs ?? null,
        wo.checkoutTs ?? null
      );

      const rows: InvoiceRowInput[] = [];
      if (autoApplyItems.length > 0) {
        for (const item of autoApplyItems) {
          if (item.unitMinutes == null) {
            rows.push({
              description: item.description,
              unit: item.unit,
              quantity: visitCount,
              pricePerUnit: item.pricePerUnit,
              priceListItemId: item.id,
              isFromPriceList: true,
            });
          } else {
            const units = totalServiceTimeUnitsFromVisitPairs(
              visitPairs,
              item.unitMinutes,
              wo.checkinTs ?? null,
              wo.checkoutTs ?? null
            );
            for (let i = 0; i < techCount; i++) {
              rows.push({
                description: item.description,
                unit: item.unit,
                quantity: units,
                pricePerUnit: item.pricePerUnit,
                priceListItemId: item.id,
                isFromPriceList: true,
              });
            }
          }
        }
      } else {
        if (arrivalItem) {
          rows.push({
            description: arrivalItem.description,
            unit: arrivalItem.unit,
            quantity: visitCount,
            pricePerUnit: arrivalItem.pricePerUnit,
            priceListItemId: arrivalItem.id,
            isFromPriceList: true,
          });
        }
        if (laborItem && (totalLaborH > 0 || techCount > 0)) {
          for (let i = 0; i < techCount; i++) {
            rows.push({
              description: laborItem.description,
              unit: laborItem.unit,
              quantity: totalLaborH,
              pricePerUnit: laborItem.pricePerUnit,
              priceListItemId: laborItem.id,
              isFromPriceList: true,
            });
          }
        }
        if (rows.length === 0 && arrivalItem) {
          rows.push({
            description: arrivalItem.description,
            unit: arrivalItem.unit,
            quantity: visitCount,
            pricePerUnit: arrivalItem.pricePerUnit,
            priceListItemId: arrivalItem.id,
            isFromPriceList: true,
          });
        }
      }
      setInvoiceRows(rows);
    }
    setInitialized(true);
  }, [wo, priceList, autoApplyItems, arrivalItem, laborItem, initialized, techCount]);

  const submitMutation = useMutation({
    mutationFn: workOrdersAPI.submitCostProposal,
    onSuccess: () => {
      clearS3WODraft(workOrderId);
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      setSubmitSuccess(true);
    },
  });

  const saveDraftAndClose = () => {
    setS3WODraft(workOrderId, { invoiceRows });
    onClose();
  };

  useEffect(() => {
    return () => {
      if (workOrderId > 0 && invoiceRowsRef.current.length > 0) {
        setS3WODraft(workOrderId, { invoiceRows: invoiceRowsRef.current });
      }
    };
  }, [workOrderId]);

  const addRow = () => {
    if (proposalCompleted) return;
    setInvoiceRows((prev) => [
      ...prev,
      { description: '', unit: '', quantity: 0, pricePerUnit: 0, isFromPriceList: false, isNotInPricelist: false },
    ]);
  };

  const updateRow = (
    index: number,
    field: keyof InvoiceRowInput,
    value: string | number | boolean
  ) => {
    if (proposalCompleted) return;
    const next = [...invoiceRows];
    next[index] = { ...next[index], [field]: value };
    setInvoiceRows(next);
  };

  const selectPriceItem = (index: number, item: VendorPriceListItem) => {
    if (proposalCompleted) return;
    const next = [...invoiceRows];
    next[index] = {
      description: item.description,
      unit: item.unit,
      quantity: 1,
      pricePerUnit: item.pricePerUnit,
      priceListItemId: item.id,
      isFromPriceList: true,
      isNotInPricelist: false,
    };
    setInvoiceRows(next);
  };

  const removeRow = (index: number) => {
    if (proposalCompleted) return;
    setInvoiceRows((prev) => prev.filter((_, i) => i !== index));
  };

  const canComplete =
    invoiceRows.length > 0 &&
    invoiceRows.every(
      (r) =>
        r.description.trim() !== '' &&
        r.unit.trim() !== '' &&
        r.quantity >= 0 &&
        !Number.isNaN(r.quantity) &&
        r.pricePerUnit >= 0 &&
        !Number.isNaN(r.pricePerUnit)
    );

  const isServiceTimeRow = (index: number): boolean => {
    const row = invoiceRows[index];
    if (!row) return false;
    const desc = row.description.toLowerCase();
    if (
      desc.includes('service time') ||
      desc.includes('service hours') ||
      desc.includes('radni sati') ||
      desc.includes('vrijeme servisa')
    ) {
      return true;
    }
    if (row.priceListItemId == null) return false;
    const item = priceList.find((p) => p.id === row.priceListItemId);
    return (item?.unitMinutes ?? 0) > 0;
  };

  /** Arrival-to-location row: auto-applied, quantity always 1 (not editable in Service Completed) */
  const isArrivalRow = (index: number): boolean => {
    const row = invoiceRows[index];
    if (!row) return false;
    const desc = row.description.toLowerCase();
    if (desc.includes('arrival') || desc.includes('dolazak')) return true;
    if (row.priceListItemId == null) return false;
    const item = priceList.find((p) => p.id === row.priceListItemId);
    return item?.selectableInUI === false && (item?.unitMinutes ?? 0) === 0;
  };

  const isAutoGeneratedRow = (index: number): boolean =>
    isArrivalRow(index) || isServiceTimeRow(index);

  const isAutoGeneratedInvoiceRowReadonly = (row: { description: string; unit: string }): boolean => {
    const desc = row.description.toLowerCase();
    const unit = row.unit.toLowerCase();
    return (
      desc.includes('arrival') ||
      desc.includes('dolazak') ||
      desc.includes('service time') ||
      desc.includes('service hours') ||
      desc.includes('radni sati') ||
      desc.includes('vrijeme servisa') ||
      unit.includes('15 min')
    );
  };

  const total = useMemo(
    () =>
      invoiceRows.reduce(
        (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.pricePerUnit) || 0),
        0
      ),
    [invoiceRows]
  );

  const handleSend = () => {
    if (!canComplete) return;
    submitMutation.mutate({
      workOrderId,
      invoiceRows: invoiceRows.map((r, index) => {
        const qty = isArrivalRow(index) ? 1 : r.quantity;
        return {
          description: r.description,
          unit: r.unit,
          quantity: qty,
          pricePerUnit: r.pricePerUnit,
          priceListItemId: r.priceListItemId,
        };
      }),
    });
  };

  if (loadingWO || wo == null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              Ponuda troška poslana VMO-u.
            </p>
          </div>
          <Button type="button" onClick={onClose} className="w-full">
            Natrag na nadzornu ploču
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Detalji radnog naloga</h1>
              <p className="text-sm text-gray-600 mt-1">WO #{wo.id} • Ticket #{wo.ticketId}</p>
              <Badge variant={wo.urgent ? 'danger' : 'secondary'} className="mt-2">
                {wo.urgent ? 'Hitno' : 'Nije hitno'}
              </Badge>
            </div>
            <Button type="button" variant="secondary" onClick={saveDraftAndClose}>
              Natrag
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Detalji (samo pregled)</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div><span className="text-gray-600">Poslovnica:</span> {wo.storeName ?? '—'}</div>
              {wo.storeAddress != null && wo.storeAddress !== '' && (
                  <div><span className="text-gray-600">Adresa:</span> {wo.storeAddress}</div>
              )}
                <div><span className="text-gray-600">Kategorija:</span> {wo.category ? formatCategory(wo.category) : '—'}</div>
                <div><span className="text-gray-600">Komentar VMO:</span> {wo.commentToVendor ?? '—'}</div>
              {wo.assetDescription != null && wo.assetDescription !== '' && (
                  <div><span className="text-gray-600">Oprema:</span> {wo.assetDescription}</div>
              )}
              {wo.attachments != null && wo.attachments.length > 0 && (
                <div>
                    <span className="text-gray-600">Privici:</span>
                  <ul className="list-disc list-inside mt-1">
                    {wo.attachments.map((a) => (
                      <li key={a.id}>{a.fileName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {wo.workReport != null && wo.workReport.length > 0 && (
            <section>
              <h2 className="font-semibold text-gray-900 mb-2">Izvještaj tehničara (samo pregled)</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-left p-2">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wo.workReport.map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{row.description}</td>
                        <td className="p-2">{row.unit}</td>
                        <td className="p-2">{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {canEditAndSubmit && (
            <section>
              <h2 className="font-semibold text-gray-900 mb-2">Ponuda troška</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 w-10">#</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-right p-2">Kol.</th>
                      <th className="text-right p-2">Price/Unit</th>
                      <th className="text-right p-2">Ukupno stavke</th>
                      {!proposalCompleted && <th className="w-20" />}
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceRows.map((row, index) => (
                      <tr
                        key={index}
                        className={`border-t border-gray-100 ${
                          !row.isFromPriceList
                            ? 'bg-red-50'
                            : isAutoGeneratedRow(index)
                              ? 'bg-yellow-50'
                              : 'bg-green-50'
                        }`}
                      >
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">
                          {proposalCompleted ? (
                            row.description
                          ) : !isAutoGeneratedRow(index) ? (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <select
                                value={row.isNotInPricelist ? NOT_IN_PRICELIST_VALUE : (row.priceListItemId != null ? String(row.priceListItemId) : '')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    const next = [...invoiceRows];
                                    next[index] = {
                                      description: '',
                                      unit: '',
                                      quantity: 0,
                                      pricePerUnit: 0,
                                      isFromPriceList: false,
                                      isNotInPricelist: false,
                                    };
                                    setInvoiceRows(next);
                                  } else if (val === NOT_IN_PRICELIST_VALUE) {
                                    const next = [...invoiceRows];
                                    next[index] = {
                                      ...next[index],
                                      description: next[index]?.description ?? '',
                                      unit: next[index]?.unit ?? '',
                                      quantity: next[index]?.quantity ?? 0,
                                      pricePerUnit: next[index]?.pricePerUnit ?? 0,
                                      isFromPriceList: false,
                                      priceListItemId: undefined,
                                      isNotInPricelist: true,
                                    };
                                    setInvoiceRows(next);
                                  } else {
                                    const id = parseInt(val, 10);
                                    const item = priceList.find((p) => p.id === id);
                                    if (item) selectPriceItem(index, item);
                                  }
                                }}
                                className="p-2 border border-gray-300 rounded flex-shrink-0 w-48"
                              >
                                <option value="">Select item from pricelist</option>
                                {categories.map((cat) => (
                                  <optgroup key={cat} label={cat}>
                                    {(byCategory.get(cat) ?? []).map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.description} — €{p.pricePerUnit}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                                <option value={NOT_IN_PRICELIST_VALUE}>Item not in pricelist</option>
                              </select>
                              {row.isNotInPricelist && (
                                <input
                                  type="text"
                                  value={row.description}
                                  onChange={(e) => updateRow(index, 'description', e.target.value)}
                                  placeholder="Enter item name"
                                  className="p-2 border border-gray-300 rounded flex-1 min-w-0"
                                />
                              )}
                            </div>
                          ) : (
                            row.description
                          )}
                        </td>
                        <td className="p-2">
                          {proposalCompleted ||
                          isArrivalRow(index) ||
                          isServiceTimeRow(index) ||
                          row.isFromPriceList ? (
                            row.unit
                          ) : (
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) => updateRow(index, 'unit', e.target.value)}
                              className="p-2 border border-gray-300 rounded w-24"
                            />
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {proposalCompleted ? (
                            row.quantity
                          ) : isServiceTimeRow(index) ? (
                            <span title="Calculated from check-in/check-out (round up to 15 min units)">
                              {row.quantity}
                            </span>
                          ) : isArrivalRow(index) ? (
                            <span title="Arrival to location is always 1 per intervention">
                              1
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={row.quantity}
                              onChange={(e) => updateRow(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="p-2 border border-gray-300 rounded w-20 text-right"
                            />
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {proposalCompleted ||
                          isArrivalRow(index) ||
                          isServiceTimeRow(index) ||
                          row.isFromPriceList ? (
                            `€${Number(row.pricePerUnit).toFixed(2)}`
                          ) : (
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={row.pricePerUnit}
                              onChange={(e) => updateRow(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                              className="p-2 border border-gray-300 rounded w-24 text-right"
                            />
                          )}
                        </td>
                        <td className="p-2 text-right font-medium">
                          €{((row.quantity || 0) * (row.pricePerUnit || 0)).toFixed(2)}
                        </td>
                        {!proposalCompleted && (
                          <td className="p-2">
                            {!isAutoGeneratedRow(index) ? (
                              <button
                                type="button"
                                onClick={() => removeRow(index)}
                                className="text-red-600 hover:text-red-800"
                                aria-label="Remove row"
                              >
                                ✕
                              </button>
                            ) : null}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!proposalCompleted && (
                <Button type="button" size="sm" variant="secondary" onClick={addRow} className="mt-2">
                  + Dodaj stavku
                </Button>
              )}
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {proposalCompleted ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setProposalCompleted(false)}>
                    Uredi ponudu
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setProposalCompleted(true)}
                    disabled={!canComplete}
                  >
                    Zaključi ponudu
                  </Button>
                )}
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                <span className="font-semibold text-gray-900">Ukupno:</span>
                <span className="text-2xl font-bold text-blue-900">€{total.toFixed(2)}</span>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={!proposalCompleted || !canComplete || submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Slanje...' : 'Pošalji ponudu'}
                </Button>
              </div>
            </section>
          )}

          {!canEditAndSubmit && (
            wo.invoiceRows != null &&
            wo.invoiceRows.length > 0 && (
              <section>
                <h2 className="font-semibold text-gray-900 mb-2">Ponuda troška (samo pregled)</h2>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Unit</th>
                        <th className="text-right p-2">Kol.</th>
                        <th className="text-right p-2">Price/Unit</th>
                        <th className="text-right p-2">Ukupno</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wo.invoiceRows.map((r) => (
                        <tr
                          key={r.id}
                          className={`border-t border-gray-100 ${
                            r.priceListItemId == null
                              ? 'bg-red-50'
                              : isAutoGeneratedInvoiceRowReadonly(r)
                                ? 'bg-yellow-50'
                                : 'bg-green-50'
                          }`}
                        >
                          <td className="p-2">{r.rowNumber}</td>
                          <td className="p-2">{r.description}</td>
                          <td className="p-2">{r.unit}</td>
                          <td className="p-2 text-right">{r.quantity}</td>
                          <td className="p-2 text-right">€{Number(r.pricePerUnit).toFixed(2)}</td>
                          <td className="p-2 text-right">€{Number(r.lineTotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Boje: svijetlo žuto = automatski generirano (dolazak/radno vrijeme), svijetlo zeleno = stavka iz cjenika, svijetlo crveno = stavka izvan cjenika.
                </p>
                {wo.totalCost != null && (
                  <p className="mt-2 font-semibold">Ukupno: €{Number(wo.totalCost).toFixed(2)}</p>
                )}
              </section>
            )
          )}

          {/* History — work order workflow (statuses + comments) */}
          {wo.auditLog != null && wo.auditLog.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Povijest</h3>
              <div className="space-y-2">
                {wo.auditLog.map((entry) => (
                  <div key={entry.id} className="text-sm bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-600">{new Date(entry.createdAt).toLocaleString()}</span>
                    {' — '}
                    <span className="font-medium">{formatHistoryAction(entry.actionType)}</span>
                    {entry.prevStatus != null && (
                      <span className="text-gray-600"> ({entry.prevStatus} → {entry.newStatus})</span>
                    )}
                    <p className="mt-1 text-gray-600">
                      Izvršio {entry.actorName}{entry.actorRole != null ? ` (${entry.actorRole})` : ''}
                    </p>
                    {entry.comment != null && <p className="text-gray-600 mt-1">&quot;{entry.comment}&quot;</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {submitMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                {(submitMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Failed to submit'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
