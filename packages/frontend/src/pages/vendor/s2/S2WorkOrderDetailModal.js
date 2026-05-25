import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * S2 Work Order Detail — Section 14.4–14.10
 * Before check-in: read-only + Scan QR Code.
 * Service In Progress: read-only + work report table (Complete/Edit) + checkout (outcome, comment, Scan QR).
 */
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { useSession } from '../../../contexts/SessionContext';
import { Button, Badge, SuccessOverlay } from '../../../components/shared';
import { WorkOrderStatus } from '../../../types/statuses';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import { getS2WODraft, setS2WODraft, clearS2WODraft } from './s2Draft';
import { useSuccessOverlay } from '../../../hooks/useSuccessOverlay';
import { formatCategory, formatHistoryAction, formatStatus, formatStatusAny } from '../../../utils/formatters';
const INITIAL_ROW = { description: '', unit: '', quantity: '' };
function normalizeWorkReportRow(r) {
    const q = r.quantity;
    const quantityStr = typeof q === 'number' && !Number.isNaN(q) ? String(q) : String(q ?? '');
    return { description: r.description, unit: r.unit, quantity: quantityStr };
}
export function S2WorkOrderDetailModal({ workOrderId, onClose, }) {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [showCheckOut, setShowCheckOut] = useState(false);
    const [workReport, setWorkReport] = useState([]);
    const [reportCompleted, setReportCompleted] = useState(false);
    const { message: successMessage, showSuccess } = useSuccessOverlay(onClose);
    const { data: wo, isLoading } = useQuery({
        queryKey: ['work-order', workOrderId],
        queryFn: () => workOrdersAPI.getById(workOrderId),
        enabled: workOrderId > 0,
        // Keep WO details fresh while check-in modal is open (SM may generate QR in parallel).
        refetchInterval: showCheckIn ? 3000 : false,
    });
    const isAssigned = wo?.currentStatus === WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED;
    const inProgress = wo?.currentStatus === WorkOrderStatus.SERVICE_IN_PROGRESS;
    const isOwner = session?.userId != null && wo?.currentOwnerId === session.userId;
    // Follow-up visit: WO was checked out before (checkoutTs set), then came back. Don't load old report/draft — same behaviour as first visit.
    const isFollowUpVisit = wo?.checkoutTs != null && wo.checkoutTs !== '';
    useEffect(() => {
        if (workOrderId <= 0 || wo == null)
            return;
        if (isFollowUpVisit)
            return; // follow-up: don't pre-fill work report from draft
        const draft = getS2WODraft(workOrderId);
        if (draft?.workReport != null && Array.isArray(draft.workReport) && draft.workReport.length > 0) {
            setWorkReport(draft.workReport.map((r) => normalizeWorkReportRow(r)));
        }
        if (draft?.reportCompleted === true) {
            setReportCompleted(true);
        }
    }, [workOrderId, wo?.id, isFollowUpVisit]);
    const saveDraftAndClose = () => {
        const reportToSave = workReport.length
            ? workReport
            : wo?.workReport != null && wo.workReport.length > 0
                ? wo.workReport.map((r) => normalizeWorkReportRow(r))
                : [INITIAL_ROW];
        setS2WODraft(workOrderId, { workReport: reportToSave, reportCompleted });
        onClose();
    };
    const effectiveReport = useMemo(() => {
        if (workReport.length > 0)
            return workReport;
        // Follow-up visit: don't show previous visit's work report — same as first visit (empty)
        if (isFollowUpVisit)
            return [INITIAL_ROW];
        if (wo?.workReport != null && wo.workReport.length > 0) {
            return wo.workReport.map((r) => normalizeWorkReportRow(r));
        }
        return [INITIAL_ROW];
    }, [workReport, wo?.workReport, isFollowUpVisit]);
    const addRow = () => {
        if (reportCompleted)
            return;
        setWorkReport((prev) => (prev.length ? [...prev, { ...INITIAL_ROW }] : [...effectiveReport, { ...INITIAL_ROW }]));
    };
    const updateRow = (index, field, value) => {
        if (reportCompleted)
            return;
        const base = workReport.length ? workReport : effectiveReport;
        const next = [...base];
        next[index] = { ...next[index], [field]: value };
        setWorkReport(next);
    };
    const removeRow = (index) => {
        if (reportCompleted)
            return;
        const base = workReport.length ? workReport : effectiveReport;
        if (base.length <= 1) {
            setWorkReport([{ ...INITIAL_ROW }]);
            return;
        }
        setWorkReport(base.filter((_, i) => i !== index));
    };
    const canCompleteReport = effectiveReport.every((r) => String(r.description).trim() !== '' &&
        String(r.unit).trim() !== '' &&
        String(r.quantity).trim() !== '');
    const markReportComplete = () => {
        if (!canCompleteReport)
            return;
        setWorkReport(effectiveReport);
        setReportCompleted(true);
    };
    const editReport = () => {
        setReportCompleted(false);
    };
    const onCheckInSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
        setShowCheckIn(false);
        showSuccess('Vaš dolazak na lokaciju je registriran. Sada možete započeti rad.');
    };
    const onCheckOutSuccess = () => {
        clearS2WODraft(workOrderId);
        queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
        setShowCheckOut(false);
        onClose();
    };
    if (isLoading || wo == null) {
        return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50", children: _jsx("div", { className: "bg-white rounded-lg p-6", children: _jsx("p", { children: "U\u010Ditavanje..." }) }) }));
    }
    const reportToSend = workReport.length ? workReport : effectiveReport;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto", children: successMessage ? (_jsx(SuccessOverlay, { message: successMessage })) : (_jsxs("div", { className: "bg-white rounded-lg max-w-2xl w-full my-8", children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-gray-900", children: "Detalji radnog naloga" }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["WO #", wo.id, " \u2022 Prijava #", wo.ticketId] }), _jsx(Badge, { variant: wo.urgent ? 'danger' : 'secondary', className: "mt-2", children: wo.urgent ? 'Hitno' : 'Nije hitno' })] }), _jsx(Button, { type: "button", variant: "secondary", onClick: saveDraftAndClose, children: "Natrag" })] }) }), _jsxs("div", { className: "p-6 space-y-6 max-h-[70vh] overflow-y-auto", children: [_jsxs("section", { children: [_jsx("h2", { className: "font-semibold text-gray-900 mb-2", children: "Detalji" }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4 space-y-2 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Poslovnica:" }), " ", wo.storeName ?? '—'] }), wo.storeAddress != null && wo.storeAddress !== '' && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Adresa:" }), " ", wo.storeAddress] })), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Kategorija:" }), " ", wo.category ? formatCategory(wo.category) : '—'] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Komentar VMO:" }), " ", wo.commentToVendor ?? '—'] }), wo.assetDescription != null && wo.assetDescription !== '' && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Oprema:" }), " ", wo.assetDescription] })), wo.attachments != null && wo.attachments.length > 0 && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Privici:" }), _jsx("ul", { className: "list-disc list-inside mt-1", children: wo.attachments.map((a) => (_jsx("li", { children: a.fileName }, a.id))) })] })), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Trenutni status:" }), " ", _jsx("strong", { children: formatStatus(wo.currentStatus) })] })] })] }), isOwner && isAssigned && (_jsxs("section", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-blue-900 mb-2", children: "Prijava dolaska na lokaciji" }), _jsx("p", { className: "text-sm text-blue-700 mb-3", children: "Skenirajte QR kod u poslovnici za prijavu dolaska. Broj tehni\u010Dara potvr\u0111uje se prema QR kodu koji je poslovnica generirala." }), _jsx(Button, { type: "button", onClick: () => setShowCheckIn(true), children: "Prijava dolaska" })] })), isOwner && inProgress && (_jsxs(_Fragment, { children: [_jsxs("section", { className: "border border-gray-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Izvje\u0161taj rada" }), _jsx("p", { className: "text-sm text-gray-600 mb-3", children: "Dodajte stavke; sva polja su obavezna. Dovr\u0161ite izvje\u0161taj prije odjave." }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200", children: [_jsx("th", { className: "text-left p-2", children: "#" }), _jsx("th", { className: "text-left p-2", children: "Opis *" }), _jsx("th", { className: "text-left p-2", children: "Jedinica *" }), _jsx("th", { className: "text-left p-2 min-w-[6rem]", children: "Koli\u010Dina *" }), _jsx("th", { className: "w-10 p-2", children: _jsx("span", { className: "sr-only", children: "Ukloni stavku" }) })] }) }), _jsx("tbody", { children: effectiveReport.map((row, index) => (_jsxs("tr", { className: "border-b border-gray-100", children: [_jsx("td", { className: "p-2", children: index + 1 }), _jsx("td", { className: "p-2", children: _jsx("input", { type: "text", value: row.description, onChange: (e) => updateRow(index, 'description', e.target.value), placeholder: "Opis", disabled: reportCompleted, className: "w-full p-2 border border-gray-300 rounded" }) }), _jsx("td", { className: "p-2", children: _jsx("input", { type: "text", value: row.unit, onChange: (e) => updateRow(index, 'unit', e.target.value), placeholder: "npr. sati, kom", disabled: reportCompleted, className: "w-full p-2 border border-gray-300 rounded" }) }), _jsx("td", { className: "p-2", children: _jsx("input", { type: "text", value: row.quantity, onChange: (e) => updateRow(index, 'quantity', e.target.value), placeholder: "npr. 2, 1.5 h, 3 kom", disabled: reportCompleted, className: "w-full min-w-[5rem] p-2 border border-gray-300 rounded" }) }), _jsx("td", { className: "p-2 text-right align-middle", children: !reportCompleted && (_jsx("button", { type: "button", onClick: () => removeRow(index), className: "text-gray-400 hover:text-gray-600 text-lg leading-none px-1.5 py-0.5 rounded hover:bg-gray-100", "aria-label": "Ukloni stavku", title: "Ukloni stavku", children: "\u00D7" })) })] }, index))) })] }) }), !reportCompleted && (_jsx(Button, { type: "button", size: "sm", variant: "secondary", onClick: addRow, className: "mt-2", children: "+ Dodaj stavku" })), _jsx("div", { className: "mt-3", children: reportCompleted ? (_jsx(Button, { type: "button", variant: "secondary", size: "sm", onClick: editReport, children: "Uredi izvje\u0161taj rada" })) : (_jsx(Button, { type: "button", size: "sm", onClick: markReportComplete, disabled: !canCompleteReport, children: "Zaklju\u010Di izvje\u0161taj rada" })) })] }), _jsxs("section", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-green-900 mb-2", children: "Odjava" }), _jsx("p", { className: "text-sm text-green-700 mb-3", children: "Odaberite ishod, dodajte komentar ako je obavezan, zatim skenirajte QR kod za odjavu. Izvje\u0161taj mora biti zaklju\u010Den." }), _jsx(Button, { type: "button", onClick: () => setShowCheckOut(true), disabled: !reportCompleted, children: "Odjava s posla" })] })] })), wo.auditLog != null && wo.auditLog.length > 0 && (_jsxs("section", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Povijest" }), _jsx("div", { className: "space-y-2", children: wo.auditLog.map((entry) => (_jsxs("div", { className: "text-sm bg-gray-50 rounded-lg p-3", children: [_jsx("span", { className: "text-gray-600", children: new Date(entry.createdAt).toLocaleString() }), ' — ', _jsx("span", { className: "font-medium", children: formatHistoryAction(entry.actionType) }), entry.prevStatus != null && (_jsxs("span", { className: "text-gray-600", children: [" (", formatStatusAny(entry.prevStatus), " \u2192 ", formatStatusAny(entry.newStatus), ")"] })), _jsxs("p", { className: "mt-1 text-gray-600", children: ["Izvr\u0161io ", entry.actorName, entry.actorRole != null ? ` (${entry.actorRole})` : ''] }), entry.comment != null && _jsxs("p", { className: "text-gray-600 mt-1", children: ["\"", entry.comment, "\""] })] }, entry.id))) })] }))] })] })) }), showCheckIn && (_jsx(CheckInModal, { workOrderId: workOrderId, declaredTechCount: wo.declaredTechCount ?? null, onClose: () => setShowCheckIn(false), onSuccess: onCheckInSuccess })), showCheckOut && (_jsx(CheckOutModal, { workOrderId: workOrderId, workReport: reportToSend, onClose: () => setShowCheckOut(false), onSuccess: onCheckOutSuccess }))] }));
}
