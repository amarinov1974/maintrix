/**
 * Approval chain thresholds for ticket cost estimation routing.
 *
 * Routing rules:
 *   amount ≤ AM_MAX                      → AM only
 *   AM_MAX < amount ≤ DIRECTOR_MAX       → AM → D → C2
 *   amount > DIRECTOR_MAX                → AM → D → C2 → BOD
 *
 * MUST stay in sync with frontend `src/config/approval-thresholds.ts`.
 */
export const APPROVAL_THRESHOLDS = {
  AM_MAX: 1000,
  DIRECTOR_MAX: 3000,
} as const;
