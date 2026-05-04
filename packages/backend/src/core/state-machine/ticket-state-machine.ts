/**
 * Ticket State Machine (Section 17 — Global Workflow)
 * Defines all allowed ticket state transitions, ownership, and invariants.
 * Authoritative spec: docs/SECTION_17_STATE_MACHINE.md
 * LOCKED - DO NOT MODIFY WITHOUT FUNCTIONAL SPEC UPDATE
 */

import { TicketStatus } from '../../types/statuses.js';
import { InternalRoles } from '../../types/roles.js';
import type { StateTransition, ValidationResult } from './types.js';

export const TICKET_TRANSITIONS: StateTransition[] = [
  // ============================================================================
  // DRAFT → SUBMITTED
  // ============================================================================
  {
    fromStatus: TicketStatus.DRAFT,
    action: 'SUBMIT',
    allowedRoles: [InternalRoles.STORE_MANAGER, InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: TicketStatus.SUBMITTED,
    requiresOwnership: true,
  },

  // ============================================================================
  // SUBMITTED → CLARIFICATION (AMM urgent path or AM non-urgent path)
  // ============================================================================
  {
    fromStatus: TicketStatus.SUBMITTED,
    action: 'REQUEST_CLARIFICATION',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER, InternalRoles.AREA_MANAGER],
    toStatus: TicketStatus.AWAITING_CREATOR_RESPONSE,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.STORE_MANAGER,
  },

  // ============================================================================
  // SUBMITTED → REJECTED (AMM or AM for non-urgent)
  // ============================================================================
  {
    fromStatus: TicketStatus.SUBMITTED,
    action: 'REJECT',
    allowedRoles: [
      InternalRoles.AREA_MAINTENANCE_MANAGER,
      InternalRoles.AREA_MANAGER,
    ],
    toStatus: TicketStatus.REJECTED,
    requiresOwnership: true,
  },

  // ============================================================================
  // SUBMITTED → COST_ESTIMATION_NEEDED (Non-urgent path - AM approves)
  // ============================================================================
  {
    fromStatus: TicketStatus.SUBMITTED,
    action: 'APPROVE_FOR_ESTIMATION',
    allowedRoles: [InternalRoles.AREA_MANAGER],
    toStatus: TicketStatus.COST_ESTIMATION_NEEDED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // AWAITING_CREATOR_RESPONSE → UPDATED_SUBMITTED (assignee returns to requester only)
  // SM, AM, AMM when owner: only action is to submit response; backend routes to clarificationRequestedByUserId.
  // Clarification ping-pong is unbounded: SM may submit as many times as AMM (or AM) returns the ticket.
  // ============================================================================
  {
    fromStatus: TicketStatus.AWAITING_CREATOR_RESPONSE,
    action: 'SUBMIT_UPDATED',
    allowedRoles: [
      InternalRoles.STORE_MANAGER,
      InternalRoles.AREA_MANAGER,
      InternalRoles.AREA_MAINTENANCE_MANAGER,
    ],
    toStatus: TicketStatus.UPDATED_SUBMITTED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // AWAITING_CREATOR_RESPONSE → WITHDRAWN
  // ============================================================================
  {
    fromStatus: TicketStatus.AWAITING_CREATOR_RESPONSE,
    action: 'WITHDRAW',
    allowedRoles: [InternalRoles.STORE_MANAGER],
    toStatus: TicketStatus.WITHDRAWN,
    requiresOwnership: true,
  },

  // ============================================================================
  // UPDATED_SUBMITTED → CLARIFICATION (AMM or AM). Unbounded: can request clarification again after SM responds.
  // ============================================================================
  {
    fromStatus: TicketStatus.UPDATED_SUBMITTED,
    action: 'REQUEST_CLARIFICATION',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER, InternalRoles.AREA_MANAGER],
    toStatus: TicketStatus.AWAITING_CREATOR_RESPONSE,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.STORE_MANAGER,
  },

  // ============================================================================
  // UPDATED_SUBMITTED → REJECTED
  // ============================================================================
  {
    fromStatus: TicketStatus.UPDATED_SUBMITTED,
    action: 'REJECT',
    allowedRoles: [
      InternalRoles.AREA_MAINTENANCE_MANAGER,
      InternalRoles.AREA_MANAGER,
    ],
    toStatus: TicketStatus.REJECTED,
    requiresOwnership: true,
  },

  // ============================================================================
  // UPDATED_SUBMITTED → COST_ESTIMATION_NEEDED (AM can approve after update)
  // ============================================================================
  {
    fromStatus: TicketStatus.UPDATED_SUBMITTED,
    action: 'APPROVE_FOR_ESTIMATION',
    allowedRoles: [InternalRoles.AREA_MANAGER],
    toStatus: TicketStatus.COST_ESTIMATION_NEEDED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // COST_ESTIMATION_NEEDED → APPROVAL_NEEDED
  // ============================================================================
  {
    fromStatus: TicketStatus.COST_ESTIMATION_NEEDED,
    action: 'REQUEST_APPROVAL',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MANAGER,
  },

  // ============================================================================
  // COST_ESTIMATION_NEEDED → CLARIFICATION (urgent path: AMM can send back to SM again; unbounded).
  // ============================================================================
  {
    fromStatus: TicketStatus.COST_ESTIMATION_NEEDED,
    action: 'REQUEST_CLARIFICATION',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: TicketStatus.AWAITING_CREATOR_RESPONSE,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.STORE_MANAGER,
  },

  // ============================================================================
  // COST_ESTIMATION_NEEDED → REJECTED
  // ============================================================================
  {
    fromStatus: TicketStatus.COST_ESTIMATION_NEEDED,
    action: 'REJECT',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: TicketStatus.REJECTED,
    requiresOwnership: true,
  },

  // ============================================================================
  // APPROVAL_NEEDED → APPROVED (final approver)
  // ============================================================================
  {
    fromStatus: TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED,
    action: 'APPROVE',
    allowedRoles: [
      InternalRoles.AREA_MANAGER,
      InternalRoles.SALES_DIRECTOR,
      InternalRoles.MAINTENANCE_DIRECTOR,
      InternalRoles.BOARD_OF_DIRECTORS,
    ],
    toStatus: TicketStatus.COST_ESTIMATION_APPROVED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
    validator: async (_request): Promise<ValidationResult> => {
      return { valid: true };
    },
  },

  // ============================================================================
  // APPROVAL_NEEDED → ESCALATE (to next approver)
  // ============================================================================
  {
    fromStatus: TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED,
    action: 'ESCALATE',
    allowedRoles: [
      InternalRoles.AREA_MANAGER,
      InternalRoles.SALES_DIRECTOR,
      InternalRoles.MAINTENANCE_DIRECTOR,
    ],
    toStatus: TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED,
    requiresOwnership: true,
  },

  // ============================================================================
  // APPROVAL_NEEDED → RETURN (back to AMM)
  // ============================================================================
  {
    fromStatus: TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED,
    action: 'RETURN',
    allowedRoles: [
      InternalRoles.AREA_MANAGER,
      InternalRoles.SALES_DIRECTOR,
      InternalRoles.MAINTENANCE_DIRECTOR,
      InternalRoles.BOARD_OF_DIRECTORS,
    ],
    toStatus: TicketStatus.COST_ESTIMATION_NEEDED,
    requiresOwnership: true,
    newOwnerRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
  },

  // ============================================================================
  // APPROVAL_NEEDED → REJECTED
  // ============================================================================
  {
    fromStatus: TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED,
    action: 'REJECT',
    allowedRoles: [
      InternalRoles.AREA_MANAGER,
      InternalRoles.SALES_DIRECTOR,
      InternalRoles.MAINTENANCE_DIRECTOR,
      InternalRoles.BOARD_OF_DIRECTORS,
    ],
    toStatus: TicketStatus.REJECTED,
    requiresOwnership: true,
  },

  // ============================================================================
  // APPROVED → ARCHIVED (when all work orders complete)
  // ============================================================================
  {
    fromStatus: TicketStatus.COST_ESTIMATION_APPROVED,
    action: 'ARCHIVE',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: TicketStatus.ARCHIVED,
    requiresOwnership: false,
    validator: async (_request): Promise<ValidationResult> => {
      return { valid: true };
    },
  },

  // ============================================================================
  // WORK_ORDER_IN_PROGRESS → ARCHIVED (when all work orders terminal)
  // Governance: ticket stays owned by AMM until all WOs complete.
  // ============================================================================
  {
    fromStatus: TicketStatus.WORK_ORDER_IN_PROGRESS,
    action: 'ARCHIVE',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: TicketStatus.ARCHIVED,
    requiresOwnership: false,
  },

  // ============================================================================
  // SUBMITTED → ARCHIVED (urgent path, after all WOs complete)
  // ============================================================================
  {
    fromStatus: TicketStatus.SUBMITTED,
    action: 'ARCHIVE',
    allowedRoles: [InternalRoles.AREA_MAINTENANCE_MANAGER],
    toStatus: TicketStatus.ARCHIVED,
    requiresOwnership: false,
  },
];

/**
 * Get all valid transitions from a given status
 */
export function getValidTransitionsForStatus(status: string): StateTransition[] {
  return TICKET_TRANSITIONS.filter((t) => t.fromStatus === status);
}

/**
 * Find a specific transition
 */
export function findTransition(
  fromStatus: string,
  action: string
): StateTransition | undefined {
  return TICKET_TRANSITIONS.find(
    (t) => t.fromStatus === fromStatus && t.action === action
  );
}
