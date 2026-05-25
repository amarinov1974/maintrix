import { useEffect, useRef, useState } from 'react';
/**
 * Wires up a "success message → auto-close after 2s" flow used by ticket
 * modals. Call `showSuccess(message)` from a mutation `onSuccess` handler;
 * read `message` to render the overlay; the modal will auto-close.
 */
export function useSuccessOverlay(onClose) {
    const [message, setMessage] = useState(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    useEffect(() => {
        if (message == null)
            return;
        const t = setTimeout(() => onCloseRef.current(), 2000);
        return () => clearTimeout(t);
    }, [message]);
    return { message, showSuccess: setMessage };
}
