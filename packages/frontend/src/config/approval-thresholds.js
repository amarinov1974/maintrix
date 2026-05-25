/**
 * Approval chain thresholds for ticket cost estimation routing.
 *
 * Routing rules:
 *   amount ≤ AM_MAX                      → AM only
 *   AM_MAX < amount ≤ DIRECTOR_MAX       → AM → D → C2
 *   amount > DIRECTOR_MAX                → AM → D → C2 → BOD
 *
 * MUST match backend `packages/backend/src/config/approval-thresholds.ts`.
 */
export const APPROVAL_THRESHOLDS = {
    AM_MAX: 1000,
    DIRECTOR_MAX: 3000,
};
/** Format a euro amount with Croatian locale (e.g. 1000 → "€1.000"). */
export function formatEuro(amount) {
    return `€${amount.toLocaleString('hr-HR')}`;
}
/** Short label for the approval chain that applies to `amount`. */
export function getApprovalChainLabel(amount) {
    if (amount <= APPROVAL_THRESHOLDS.AM_MAX)
        return 'Samo AM';
    if (amount <= APPROVAL_THRESHOLDS.DIRECTOR_MAX)
        return 'AM → D → C2';
    return 'AM → D → C2 → BOD';
}
