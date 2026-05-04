/**
 * Work Order State Machine (Section 17 — Global Workflow)
 * Defines all allowed work order state transitions, ownership, and invariants.
 * Authoritative spec: docs/SECTION_17_STATE_MACHINE.md
 * LOCKED - DO NOT MODIFY WITHOUT FUNCTIONAL SPEC UPDATE
 */

import { WorkOrderStatus } from '../../types/statuses.js';
import { InternalRoles, VendorRoles } from '../../types/roles.js';
import type { StateTransition, ValidationResult } from './types.js';

export const WORK_ORDER_TRANSITIONS: StateTransition[] = [
  // ============================================================================
  // CREATED → ACCEPTED_TECHNICIAN_ASSIGNED
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.CREATED,
    action: 'ASSIGN_TECHNICIAN',
    allowedRoles: [VendorRoles.SERVICE_ADMIN],
    toStatus: WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED,
    requiresOwnership: true,
    newOwnerRole: VendorRoles.TECHNICIAN,
  },

  // ============================================================================
  // CREATED → RETURN_FOR_CLARIFICATION (back to AMM)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.CREATED,
    action: 'RETURN_FOR_CLARIFICATION',
    allowedRoles: [VendorRoles.SERVICE_ADMIN],
    toStatus: WorkOrderStatus.CREATED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // CREATED → same (AMM resends to vendor S1 after clarification)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.CREATED,
    action: 'RESEND_TO_VENDOR',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: WorkOrderStatus.CREATED,
    requiresOwnership: true,
    newOwnerRole: VendorRoles.SERVICE_ADMIN,
  },

  // ============================================================================
  // CREATED → REJECTED (S1 or AMM when WO returned to AMM)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.CREATED,
    action: 'REJECT',
    allowedRoles: [VendorRoles.SERVICE_ADMIN, InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: WorkOrderStatus.REJECTED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // ACCEPTED_TECHNICIAN_ASSIGNED → same (return to SM to correct technician count)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED,
    action: 'RETURN_FOR_TECH_COUNT',
    allowedRoles: [VendorRoles.TECHNICIAN],
    toStatus: WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.STORE_MANAGER,
  },

  // ============================================================================
  // ACCEPTED_TECHNICIAN_ASSIGNED → SERVICE_IN_PROGRESS (QR check-in)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED,
    action: 'CHECKIN',
    allowedRoles: [VendorRoles.TECHNICIAN],
    toStatus: WorkOrderStatus.SERVICE_IN_PROGRESS,
    requiresOwnership: true,
    validator: async (_request): Promise<ValidationResult> => {
      return { valid: true };
    },
  },

  // ============================================================================
  // SERVICE_IN_PROGRESS → SERVICE_COMPLETED (checkout: Issue Fixed)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.SERVICE_IN_PROGRESS,
    action: 'CHECKOUT_FIXED',
    allowedRoles: [VendorRoles.TECHNICIAN],
    toStatus: WorkOrderStatus.SERVICE_COMPLETED,
    requiresOwnership: true,
    newOwnerRole: VendorRoles.FINANCE_BACKOFFICE,
    validator: async (_request): Promise<ValidationResult> => {
      return { valid: true };
    },
  },

  // ============================================================================
  // SERVICE_IN_PROGRESS → FOLLOW_UP_REQUESTED
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.SERVICE_IN_PROGRESS,
    action: 'CHECKOUT_FOLLOW_UP',
    allowedRoles: [VendorRoles.TECHNICIAN],
    toStatus: WorkOrderStatus.FOLLOW_UP_REQUESTED,
    requiresOwnership: true,
    newOwnerRole: VendorRoles.TECHNICIAN,
  },

  // ============================================================================
  // SERVICE_IN_PROGRESS → NEW_WO_NEEDED
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.SERVICE_IN_PROGRESS,
    action: 'CHECKOUT_NEW_WO_NEEDED',
    allowedRoles: [VendorRoles.TECHNICIAN],
    toStatus: WorkOrderStatus.NEW_WO_NEEDED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // SERVICE_IN_PROGRESS → REPAIR_UNSUCCESSFUL
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.SERVICE_IN_PROGRESS,
    action: 'CHECKOUT_UNSUCCESSFUL',
    allowedRoles: [VendorRoles.TECHNICIAN],
    toStatus: WorkOrderStatus.REPAIR_UNSUCCESSFUL,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // SERVICE_IN_PROGRESS → COST_PROPOSAL_PREPARED (direct from technician)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.SERVICE_IN_PROGRESS,
    action: 'SUBMIT_COST_PROPOSAL',
    allowedRoles: [VendorRoles.TECHNICIAN],
    toStatus: WorkOrderStatus.COST_PROPOSAL_PREPARED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // SERVICE_IN_PROGRESS → CLOSED_WITHOUT_COST
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.SERVICE_IN_PROGRESS,
    action: 'CLOSE_WITHOUT_COST',
    allowedRoles: [VendorRoles.TECHNICIAN],
    toStatus: WorkOrderStatus.CLOSED_WITHOUT_COST,
    requiresOwnership: true,
  },

  // ============================================================================
  // FOLLOW_UP_REQUESTED → ACCEPTED_TECHNICIAN_ASSIGNED (schedule follow-up)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.FOLLOW_UP_REQUESTED,
    action: 'SCHEDULE_FOLLOW_UP',
    allowedRoles: [VendorRoles.SERVICE_ADMIN],
    toStatus: WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED,
    requiresOwnership: true,
    newOwnerRole: VendorRoles.TECHNICIAN,
  },

  // ============================================================================
  // SERVICE_COMPLETED → COST_PROPOSAL_PREPARED
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.SERVICE_COMPLETED,
    action: 'SUBMIT_COST_PROPOSAL',
    allowedRoles: [VendorRoles.FINANCE_BACKOFFICE],
    toStatus: WorkOrderStatus.COST_PROPOSAL_PREPARED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // COST_PROPOSAL_PREPARED → COST_PROPOSAL_APPROVED
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.COST_PROPOSAL_PREPARED,
    action: 'APPROVE_COST',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: WorkOrderStatus.COST_PROPOSAL_APPROVED,
    requiresOwnership: true,
  },

  // ============================================================================
  // COST_PROPOSAL_PREPARED → COST_REVISION_REQUESTED
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.COST_PROPOSAL_PREPARED,
    action: 'REQUEST_REVISION',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: WorkOrderStatus.COST_REVISION_REQUESTED,
    requiresOwnership: true,
    newOwnerRole: VendorRoles.FINANCE_BACKOFFICE,
  },

  // ============================================================================
  // COST_PROPOSAL_PREPARED → REJECTED
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.COST_PROPOSAL_PREPARED,
    action: 'REJECT',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: WorkOrderStatus.REJECTED,
    requiresOwnership: true,
  },

  // ============================================================================
  // COST_PROPOSAL_PREPARED → CLOSED_WITHOUT_COST
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.COST_PROPOSAL_PREPARED,
    action: 'CLOSE_WITHOUT_COST',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: WorkOrderStatus.CLOSED_WITHOUT_COST,
    requiresOwnership: true,
  },

  // ============================================================================
  // COST_REVISION_REQUESTED → COST_PROPOSAL_PREPARED (resubmit)
  // ============================================================================
  {
    fromStatus: WorkOrderStatus.COST_REVISION_REQUESTED,
    action: 'RESUBMIT_COST_PROPOSAL',
    allowedRoles: [VendorRoles.FINANCE_BACKOFFICE],
    toStatus: WorkOrderStatus.COST_PROPOSAL_PREPARED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },
];

/**
 * Get all valid transitions from a given status
 */
export function getValidTransitionsForStatus(status: string): StateTransition[] {
  return WORK_ORDER_TRANSITIONS.filter((t) => t.fromStatus === status);
}

/**
 * Find a specific transition
 */
export function findTransition(
  fromStatus: string,
  action: string
): StateTransition | undefined {
  return WORK_ORDER_TRANSITIONS.find(
    (t) => t.fromStatus === fromStatus && t.action === action
  );
}
