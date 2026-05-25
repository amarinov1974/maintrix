import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Area Manager Ticket Detail — Section 12
 * Initial review: Approve for Cost Estimation, Request Clarification, Reject.
 * Approval chain: Approve / Return (comment mandatory) / Reject.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Button, Badge, SuccessOverlay } from '../../components/shared';
import { formatCategory, formatHistoryAction, formatStatus, formatStatusAny } from '../../utils/formatters';
import { TicketStatus } from '../../types/statuses';
import { useSuccessOverlay } from '../../hooks/useSuccessOverlay';
const INTERNAL_ROLE_LABELS = {
    SM: 'Voditelj poslovnice (kreator)',
    AM: 'Voditelj regije',
    AMM: 'Voditelj održavanja',
    D: 'Direktor prodaje',
    C2: 'Direktor održavanja',
    BOD: 'Upravni odbor',
};
export function AMTicketDetailModal({ ticketId, onClose, }) {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [clarificationComment, setClarificationComment] = useState('');
    const [assignToRole, setAssignToRole] = useState('SM');
    const [showClarificationForm, setShowClarificationForm] = useState(false);
    const [returnComment, setReturnComment] = useState('');
    const [approveComment, setApproveComment] = useState('');
    const navigate = useNavigate();
    const { message: successMessage, showSuccess } = useSuccessOverlay(() => {
        onClose();
        navigate('/area-manager');
    });
    const { data: ticket, isLoading } = useQuery({
        queryKey: ['ticket', ticketId],
        queryFn: () => ticketsAPI.getById(ticketId),
    });
    const approveForEstimationMutation = useMutation({
        mutationFn: () => ticketsAPI.approveForEstimation(ticketId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            showSuccess('Prijava poslana voditelju održavanja na procjenu troška.');
        },
    });
    const clarifyMutation = useMutation({
        mutationFn: ({ comment, role }) => ticketsAPI.requestClarification(ticketId, comment, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            setClarificationComment('');
            setShowClarificationForm(false);
            showSuccess('Prijava vraćena na pojašnjenje.');
        },
    });
    const rejectMutation = useMutation({
        mutationFn: (reason) => ticketsAPI.reject(ticketId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            showSuccess('Prijava odbijena.');
        },
    });
    const approveCostMutation = useMutation({
        mutationFn: () => ticketsAPI.approveCostEstimation(ticketId, approveComment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            showSuccess('Procjena troška odobrena.');
        },
    });
    const returnCostMutation = useMutation({
        mutationFn: () => ticketsAPI.returnCostEstimation(ticketId, returnComment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            showSuccess('Procjena troška vraćena voditelju održavanja.');
        },
    });
    const submitResponseToRequesterMutation = useMutation({
        mutationFn: (comment) => ticketsAPI.submitUpdated(ticketId, undefined, comment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            showSuccess('Prijava poslana sljedećem odobravatelju.');
        },
    });
    if (isLoading || ticket == null) {
        return (_jsx("div", { style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }, children: _jsx("div", { style: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px' }, children: _jsx("p", { children: "U\u010Ditavanje detalja prijave..." }) }) }));
    }
    const isInitialReview = ticket.currentStatus === TicketStatus.SUBMITTED ||
        ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED;
    const isApprovalChain = ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED;
    const isOwner = session?.userId != null && ticket.currentOwnerUserId === session.userId;
    const canInitialReview = isInitialReview && isOwner;
    const canReturnToRequester = ticket.currentStatus === TicketStatus.AWAITING_CREATOR_RESPONSE &&
        isOwner &&
        ticket.clarificationRequestedByUserId != null;
    const canApprovalChain = isApprovalChain && isOwner && ticket.costEstimation;
    const costAmount = ticket.costEstimation?.estimatedAmount != null
        ? Number(ticket.costEstimation.estimatedAmount)
        : null;
    return (_jsx("div", { style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }, children: successMessage ? (_jsx(SuccessOverlay, { message: successMessage })) : (_jsxs("div", { style: { backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '760px', width: '100%', margin: '32px auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }, children: [_jsx("div", { style: { padding: '20px 28px', borderBottom: '1px solid #E8E8ED', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', flexShrink: 0, borderRadius: '16px 16px 0 0' }, children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h1", { style: { fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }, children: "Detalji prijave" }), _jsxs("div", { className: "flex items-center gap-3 mt-2", children: [_jsxs("span", { style: { fontSize: '13px', color: '#6E6E73', marginTop: '2px' }, children: ["Prijava #", ticket.id] }), _jsx(Badge, { variant: ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVED
                                                    ? 'success'
                                                    : 'warning', children: formatStatus(ticket.currentStatus) })] }), _jsxs("p", { style: { fontSize: '13px', color: '#6E6E73', marginTop: '2px' }, children: ["Poslovnica: ", ticket.storeName, " \u2022 Kreirao: ", ticket.createdByUserName] })] }), _jsx(Button, { type: "button", variant: "secondary", onClick: onClose, children: "Natrag" })] }) }), _jsxs("div", { className: "p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto", children: [_jsxs("section", { children: [_jsx("h2", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Informacije o prijavi" }), _jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Kategorija" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: formatCategory(ticket.category) })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Trenutni vlasnik" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—' })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Datum i vrijeme prijave" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: new Date(ticket.createdAt).toLocaleString() })] })] }), _jsxs("div", { style: { marginTop: '12px' }, children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Originalni opis problema (zaklju\u010Dano)" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: ticket.originalDescription ?? ticket.description })] })] })] }), ticket.attachments != null && ticket.attachments.length > 0 && (_jsxs("section", { children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Privici" }), _jsx("ul", { className: "bg-gray-50 rounded-lg p-4 space-y-2", children: ticket.attachments.map((a) => (_jsxs("li", { className: "flex items-center justify-between text-sm", children: [_jsx("button", { type: "button", onClick: () => ticketsAPI.downloadAttachment(a.id, a.fileName), className: "text-left text-blue-600 hover:underline", children: a.fileName }), _jsx("span", { className: "text-gray-500", children: new Date(a.createdAt).toLocaleDateString() })] }, a.id))) })] })), canReturnToRequester && (_jsxs("section", { className: "space-y-4", children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Odgovor na zahtjev za poja\u0161njenje" }), _jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }, children: [_jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: ticket.clarificationRequestedByUserName != null || ticket.clarificationRequestedByUserRole != null
                                                ? `${ticket.clarificationRequestedByUserName ?? 'Requester'}${ticket.clarificationRequestedByUserRole != null ? ` (${INTERNAL_ROLE_LABELS[ticket.clarificationRequestedByUserRole] ?? ticket.clarificationRequestedByUserRole})` : ''} requested clarification. You can only return the ticket to them.`
                                                : 'Vratite prijavu ulozi koja je zatražila pojašnjenje.' }), _jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }, children: "Komentar (opcionalno)" }), _jsx("textarea", { value: clarificationComment, onChange: (e) => setClarificationComment(e.target.value), placeholder: "Dodajte komentar (opcionalno)...", rows: 3, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' } }), _jsx(Button, { type: "button", onClick: () => submitResponseToRequesterMutation.mutate(clarificationComment.trim() || undefined), disabled: submitResponseToRequesterMutation.isPending, children: submitResponseToRequesterMutation.isPending ? 'Slanje...' : `Vrati na ${ticket.clarificationRequestedByUserName ?? 'podnositelja'}` })] })] })), canInitialReview && (_jsxs("section", { className: "space-y-4", children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Po\u010Detni pregled" }), _jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #34C759' }, children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Odobrenje za procjenu tro\u0161ka" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: "\u0160alje prijavu Voditelju odr\u017Eavanja na procjenu tro\u0161ka." }), _jsx(Button, { type: "button", onClick: () => approveForEstimationMutation.mutate(), disabled: approveForEstimationMutation.isPending, children: approveForEstimationMutation.isPending ? 'Odobravanje...' : 'Odobri za procjenu troška' })] }), _jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF9500' }, children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Zahtjev za poja\u0161njenje" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: "Po\u0161aljite prijavu ulozi koja je bila uklju\u010Dena. Nakon a\u017Euriranja, prijava se vra\u0107a Vama." }), !showClarificationForm ? (_jsx(Button, { type: "button", variant: "secondary", onClick: () => { const options = (ticket.involvedInternalRoles ?? ['SM']).filter((r) => r !== ticket.currentOwnerUserRole); setAssignToRole(options[0] ?? 'SM'); setShowClarificationForm(true); }, children: "Zatra\u017Ei poja\u0161njenje" })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }, children: "Po\u0161alji zahtjev za poja\u0161njenje prema" }), _jsx("select", { value: assignToRole, onChange: (e) => setAssignToRole(e.target.value), style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }, children: ((ticket.involvedInternalRoles ?? ['SM']).filter((r) => r !== ticket.currentOwnerUserRole)).map((r) => (_jsx("option", { value: r, children: INTERNAL_ROLE_LABELS[r] ?? r }, r))) }), _jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }, children: "Tekst poja\u0161njenja (obavezno)" }), _jsx("textarea", { value: clarificationComment, onChange: (e) => setClarificationComment(e.target.value), placeholder: "Opi\u0161ite \u0161to treba pojasniti...", rows: 4, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", onClick: () => clarifyMutation.mutate({ comment: clarificationComment, role: assignToRole }), disabled: !clarificationComment.trim() || clarifyMutation.isPending, children: clarifyMutation.isPending ? 'Slanje...' : 'Pošalji' }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => {
                                                                setShowClarificationForm(false);
                                                                setClarificationComment('');
                                                            }, children: "Odustani" })] })] }))] }), _jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF3B30' }, children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Odbijanje prijave" }), !showRejectForm ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-sm text-red-700 mb-3", children: "Odbijte prijavu uz navo\u0111enje razloga." }), _jsx(Button, { type: "button", variant: "danger", onClick: () => setShowRejectForm(true), children: "Odbij prijavu" })] })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }, children: "Razlog (obavezno)" }), _jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), placeholder: "Razlog odbijanja...", rows: 3, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "danger", onClick: () => rejectMutation.mutate(rejectReason), disabled: !rejectReason.trim() || rejectMutation.isPending, children: rejectMutation.isPending ? 'Odbijanje...' : 'Potvrdi odbijanje' }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => {
                                                                setShowRejectForm(false);
                                                                setRejectReason('');
                                                            }, children: "Odustani" })] })] }))] })] })), canApprovalChain && costAmount != null && (_jsxs("section", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }, children: [_jsx("h3", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Odobrenje procjene tro\u0161ka" }), _jsxs("p", { className: "text-sm text-gray-700 mb-3", children: ["Iznos: ", _jsxs("strong", { children: ["\u20AC", costAmount.toLocaleString()] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }, children: "Komentar (opcionalno za odobrenje)" }), _jsx("textarea", { value: approveComment, onChange: (e) => setApproveComment(e.target.value), placeholder: "Komentar za odobrenje...", rows: 2, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } })] }), _jsx(Button, { type: "button", onClick: () => approveCostMutation.mutate(), disabled: approveCostMutation.isPending, children: approveCostMutation.isPending ? 'Odobravanje...' : 'Odobri' })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-blue-200 space-y-3", children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }, children: "Vrati na VMO (komentar obavezan)" }), _jsx("textarea", { value: returnComment, onChange: (e) => setReturnComment(e.target.value), placeholder: "Razlog vra\u0107anja...", rows: 2, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => returnCostMutation.mutate(), disabled: !returnComment.trim() || returnCostMutation.isPending, children: returnCostMutation.isPending ? 'Vraćanje...' : 'Vrati na VMO' })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-blue-200", children: [_jsx(Button, { type: "button", variant: "danger", onClick: () => setShowRejectForm(true), children: "Odbij" }), showRejectForm && (_jsxs("div", { className: "mt-3 space-y-2", children: [_jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), placeholder: "Razlog odbijanja...", rows: 2, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "danger", onClick: () => rejectMutation.mutate(rejectReason), disabled: !rejectReason.trim() || rejectMutation.isPending, children: "Potvrdi odbijanje" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => setShowRejectForm(false), children: "Odustani" })] })] }))] })] })), ticket.comments != null && ticket.comments.length > 0 && (_jsxs("section", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Komentari" }), _jsx("div", { className: "space-y-3", children: [...ticket.comments]
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((c) => (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("span", { className: "font-medium text-gray-900", children: c.authorUserName }), _jsx("span", { className: "text-xs text-gray-500", children: new Date(c.createdAt).toLocaleString() })] }), _jsx("p", { className: "text-sm text-gray-700", children: c.text })] }, c.id))) })] })), ticket.auditLog != null && ticket.auditLog.length > 0 && (_jsxs("section", { children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Povijest" }), _jsx("div", { children: ticket.auditLog.map((entry) => (_jsxs("div", { style: { padding: '12px 0', borderBottom: '1px solid #F0F0F5' }, children: [_jsx("span", { style: { fontSize: '12px', color: '#6E6E73' }, children: new Date(entry.createdAt).toLocaleString() }), ' — ', _jsx("span", { style: { fontSize: '12px', color: '#6E6E73' }, children: formatHistoryAction(entry.actionType) }), entry.prevStatus != null && (_jsxs("span", { style: { fontSize: '12px', color: '#6E6E73' }, children: [" (", formatStatusAny(entry.prevStatus), " \u2192 ", formatStatusAny(entry.newStatus), ")"] })), entry.actorRole != null && (_jsxs("p", { style: { fontSize: '13px', color: '#1D1D1F', fontWeight: 500, marginTop: '4px' }, children: ["Izvr\u0161io ", entry.actorName, " (", entry.actorRole, ")"] })), entry.comment != null && (_jsxs("p", { style: { fontSize: '13px', color: '#3C3C43', marginTop: '4px' }, children: ["\"", entry.comment, "\""] }))] }, entry.id))) })] })), (approveForEstimationMutation.isError ||
                            clarifyMutation.isError ||
                            rejectMutation.isError ||
                            approveCostMutation.isError ||
                            returnCostMutation.isError) && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("p", { className: "text-sm text-red-700", children: ["Gre\u0161ka:", ' ', approveForEstimationMutation.error?.response?.data?.error ??
                                        clarifyMutation.error?.response?.data?.error ??
                                        rejectMutation.error?.response?.data?.error ??
                                        approveCostMutation.error?.response?.data?.error ??
                                        returnCostMutation.error?.response?.data?.error ??
                                        'Akcija nije uspjela'] }) }))] }), _jsx("div", { className: "p-6 border-t border-gray-200 sticky bottom-0 bg-white", children: _jsx(Button, { type: "button", variant: "secondary", onClick: onClose, className: "w-full", children: "Natrag" }) })] })) }));
}
