/**
 * S2 work order draft — persist work report and checkout form when leaving screen.
 */
const KEY_PREFIX = 's2-wo-draft-';
export function getS2WODraft(workOrderId) {
    try {
        const raw = localStorage.getItem(KEY_PREFIX + workOrderId);
        if (raw == null)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function setS2WODraft(workOrderId, data) {
    try {
        const existing = getS2WODraft(workOrderId) ?? {};
        const merged = { ...existing, ...data };
        localStorage.setItem(KEY_PREFIX + workOrderId, JSON.stringify(merged));
    }
    catch {
        // ignore
    }
}
export function clearS2WODraft(workOrderId) {
    try {
        localStorage.removeItem(KEY_PREFIX + workOrderId);
    }
    catch {
        // ignore
    }
}
