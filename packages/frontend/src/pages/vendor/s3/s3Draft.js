/**
 * S3 work order draft — persist invoice proposal rows when leaving the work order detail screen.
 */
const KEY_PREFIX = 's3-wo-draft-';
export function getS3WODraft(workOrderId) {
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
export function setS3WODraft(workOrderId, data) {
    try {
        const existing = getS3WODraft(workOrderId) ?? {};
        const merged = { ...existing, ...data };
        localStorage.setItem(KEY_PREFIX + workOrderId, JSON.stringify(merged));
    }
    catch {
        // ignore
    }
}
export function clearS3WODraft(workOrderId) {
    try {
        localStorage.removeItem(KEY_PREFIX + workOrderId);
    }
    catch {
        // ignore
    }
}
