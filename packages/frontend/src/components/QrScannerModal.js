import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * QR Scanner Modal
 * Opens device camera and scans QR codes (e.g. SM's phone) for check-in/check-out tokens.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './shared';
export function QrScannerModal({ onScan, onClose, title = 'Scan QR Code', }) {
    const [error, setError] = useState(null);
    const [scanning, setScanning] = useState(false);
    const html5QrRef = useRef(null);
    const containerId = 'qr-reader-container';
    const handledRef = useRef(false);
    const handleScan = useCallback((token) => {
        if (handledRef.current)
            return;
        handledRef.current = true;
        onScan(token);
        onClose();
    }, [onScan, onClose]);
    useEffect(() => {
        const startScan = async () => {
            try {
                setError(null);
                const html5Qr = new Html5Qrcode(containerId);
                html5QrRef.current = html5Qr;
                await html5Qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
                    if (handledRef.current)
                        return;
                    const token = String(decodedText || '').trim();
                    if (!token)
                        return;
                    html5Qr.stop().catch(() => { });
                    html5QrRef.current = null;
                    handleScan(token);
                }, () => { });
                setScanning(true);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg || 'Camera access failed. Check permissions.');
            }
        };
        startScan();
        return () => {
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => { });
                try {
                    html5QrRef.current.clear();
                }
                catch {
                    // ignore
                }
                html5QrRef.current = null;
            }
        };
    }, [handleScan]);
    return (_jsx("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]", children: _jsxs("div", { className: "bg-white rounded-lg max-w-sm w-full overflow-hidden", children: [_jsxs("div", { className: "p-4 border-b border-gray-200 flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-bold text-gray-900", children: title }), _jsx(Button, { type: "button", variant: "secondary", size: "sm", onClick: onClose, children: "Cancel" })] }), _jsx("div", { className: "p-4", children: error ? (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-red-600", children: error }), _jsx("p", { className: "text-xs text-gray-500", children: "You can still paste the token manually in the input field." })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-sm text-gray-600 mb-3", children: "Point your camera at the QR code on the store's phone." }), _jsx("div", { id: containerId, className: "rounded-lg overflow-hidden bg-gray-900" }), scanning && (_jsx("p", { className: "text-xs text-gray-500 mt-2 text-center", children: "Scanning..." }))] })) })] }) }));
}
