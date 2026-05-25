import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Check-In Modal (S2) — Section 14.5, 18.7, 18.9
 * SM inputs number of technicians when generating check-in QR. S2 cannot change it:
 * - Confirm: check in with that number (scan QR / paste token).
 * - Return to store: send task back to SM so they can generate a new QR with the correct number.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { Button } from '../../../components/shared';
import { QrScannerModal } from '../../../components/QrScannerModal';
export function CheckInModal({ workOrderId, declaredTechCount, onClose, onSuccess, }) {
    const queryClient = useQueryClient();
    const [qrToken, setQrToken] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const checkInMutation = useMutation({
        mutationFn: workOrdersAPI.checkIn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
            onSuccess?.();
            onClose();
        },
    });
    const returnMutation = useMutation({
        mutationFn: () => workOrdersAPI.returnForTechCount(workOrderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
            onSuccess?.();
            onClose();
        },
    });
    const techCountValid = declaredTechCount != null && declaredTechCount >= 1;
    const canConfirm = qrToken.trim() !== '';
    const handleConfirm = () => {
        if (!canConfirm)
            return;
        const payload = {
            workOrderId,
            qrToken: qrToken.trim(),
        };
        // Keep techCount optional here: when S2 UI is stale, backend can still read confirmed count from QR token.
        if (techCountValid) {
            payload.techCountConfirmed = declaredTechCount;
        }
        checkInMutation.mutate(payload);
    };
    const handleReturnToStore = () => {
        returnMutation.mutate();
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg max-w-md w-full", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Prijava dolaska" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["WO #", workOrderId] })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: _jsxs("p", { className: "text-sm text-blue-700", children: [_jsx("strong", { children: "Koraci:" }), " Poslovnica je odredila broj tehni\u010Dara. Mo\u017Eete ", _jsx("strong", { children: "potvrditi" }), " (skenirajte QR i prijavite se) ili ", _jsx("strong", { children: "vratiti poslovnici" }), " za novi QR s ispravnim brojem."] }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Broj tehni\u010Dara (odredio voditelj poslovnice)" }), declaredTechCount != null && declaredTechCount >= 1 ? (_jsxs("p", { className: "p-3 bg-gray-100 rounded-lg text-gray-800 font-medium", children: [declaredTechCount, " \u2014 ne mo\u017Ee se mijenjati ovdje. Vratite poslovnici ako je neto\u010Dno."] })) : (_jsx("p", { className: "text-sm text-amber-700", children: "Poslovnica jo\u0161 nije generirala QR kod. Zatra\u017Eite od poslovnice da generira QR kod za prijavu (s brojem tehni\u010Dara)." }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "QR kod * (skenirajte ili unesite)" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: qrToken, onChange: (e) => setQrToken(e.target.value), placeholder: "Skenirajte QR ili unesite token...", className: "flex-1 min-w-0 p-3 border border-gray-300 rounded-lg", autoFocus: true }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => setShowScanner(true), title: "Otvorite kameru za skeniranje QR koda", children: "Skeniraj" })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Skenirajte QR na telefonu poslovnice ili unesite token. Istje\u010De za 5 minuta." })] }), showScanner && (_jsx(QrScannerModal, { title: "Skeniraj QR za prijavu", onScan: (token) => {
                                setQrToken(token);
                                setShowScanner(false);
                            }, onClose: () => setShowScanner(false) })), (checkInMutation.isError || returnMutation.isError) && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsx("p", { className: "text-sm text-red-700", children: (checkInMutation.error || returnMutation.error)?.response?.data?.error ??
                                    'Akcija nije uspjela' }) }))] }), _jsxs("div", { className: "p-6 border-t border-gray-200 flex flex-wrap gap-3", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onClose, children: "Odustani" }), declaredTechCount != null && declaredTechCount >= 1 && (_jsx(Button, { type: "button", variant: "secondary", onClick: handleReturnToStore, disabled: returnMutation.isPending || checkInMutation.isPending, children: returnMutation.isPending ? 'Vraćanje...' : 'Vrati poslovnici' })), _jsx(Button, { type: "button", onClick: handleConfirm, disabled: !canConfirm || checkInMutation.isPending, className: "flex-1 min-w-0", children: checkInMutation.isPending ? 'Prijava u tijeku...' : 'Potvrdi prijavu dolaska' })] })] }) }));
}
