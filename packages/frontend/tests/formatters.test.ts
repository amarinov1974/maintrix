import { describe, expect, it } from 'vitest';
import { formatHistoryAction, formatStatus, formatStatusAny } from '../src/utils/formatters';
import { TicketStatus, WorkOrderStatus } from '../src/types/statuses';

describe('formatHistoryAction', () => {
  it('translates known ticket actions to Croatian', () => {
    expect(formatHistoryAction('CREATE')).toBe('Kreirano');
    expect(formatHistoryAction('SUBMIT')).toBe('Prijavljeno');
    expect(formatHistoryAction('APPROVE')).toBe('Odobreno');
    expect(formatHistoryAction('REJECT')).toBe('Odbijeno');
  });

  it('translates known work-order actions to Croatian', () => {
    expect(formatHistoryAction('ASSIGN_TECHNICIAN')).toBe('Dodijeljen tehničar');
    expect(formatHistoryAction('CHECKIN')).toBe('Dolazak na lokaciju');
    expect(formatHistoryAction('CHECKOUT_FIXED')).toBe('Odjava — popravljeno');
    expect(formatHistoryAction('QR_GENERATED')).toBe('QR kod generiran');
    expect(formatHistoryAction('SUBMIT_COST_PROPOSAL')).toBe('Ponuda troška predana');
  });

  it('falls back to a humanized form for unknown actions', () => {
    expect(formatHistoryAction('SOMETHING_NEW')).toBe('SOMETHING NEW');
  });
});

describe('formatStatusAny', () => {
  it('translates a Prisma enum key (work-order)', () => {
    expect(formatStatusAny('ACCEPTED_TECHNICIAN_ASSIGNED')).toBe('Zakazan posjet servisera');
    expect(formatStatusAny('SERVICE_IN_PROGRESS')).toBe('Servis u tijeku');
  });

  it('translates a Prisma enum key (ticket)', () => {
    expect(formatStatusAny('SUBMITTED')).toBe('Prijava podnesena');
    expect(formatStatusAny('COST_ESTIMATION_NEEDED')).toBe('Potrebna procjena troška');
  });

  it('translates a state-machine display string', () => {
    expect(formatStatusAny('Service In Progress')).toBe('Servis u tijeku');
    expect(formatStatusAny(TicketStatus.SUBMITTED)).toBe('Prijava podnesena');
    expect(formatStatusAny(WorkOrderStatus.COST_PROPOSAL_PREPARED)).toBe('Ponuda troška pripremljena');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(formatStatusAny(null)).toBe('');
    expect(formatStatusAny(undefined)).toBe('');
    expect(formatStatusAny('')).toBe('');
  });

  it('preserves unknown values verbatim (no false translation)', () => {
    // Confirms the same fallback formatStatus has — keeps the symptom visible
    expect(formatStatusAny('UnknownXYZ')).toBe('UnknownXYZ');
  });
});

describe('formatStatus', () => {
  it('still works for direct display-string lookups', () => {
    expect(formatStatus('Service In Progress')).toBe('Servis u tijeku');
    expect(formatStatus('Draft')).toBe('Nacrt');
  });
});
