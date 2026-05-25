import { useEffect, useState } from 'react';
/**
 * Brief inline notification (top of viewport) that auto-dismisses.
 * Unlike `useSuccessOverlay`, this does NOT close any modal or navigate;
 * it just shows the message for a couple of seconds.
 */
export function useToast(autoDismissMs = 2500) {
    const [message, setMessage] = useState(null);
    useEffect(() => {
        if (message == null)
            return;
        const t = setTimeout(() => setMessage(null), autoDismissMs);
        return () => clearTimeout(t);
    }, [message, autoDismissMs]);
    return {
        message,
        showToast: setMessage,
        clearToast: () => setMessage(null),
    };
}
