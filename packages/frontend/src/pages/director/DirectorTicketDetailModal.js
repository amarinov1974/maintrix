import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Director Ticket Detail Modal
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Button, Badge, SuccessOverlay } from '../../components/shared';
import { formatCategory } from '../../utils/formatters';
import { TicketStatus } from '../../types/statuses';
import { APPROVAL_THRESHOLDS, getApprovalChainLabel } from '../../config/approval-thresholds';
import { useSuccessOverlay } from '../../hooks/useSuccessOverlay';
function getThresholdInfo(amount) {
    const chain = getApprovalChainLabel(amount);
    if (amount <= APPROVAL_THRESHOLDS.AM_MAX)
        return { chain, color: 'text-green-700' };
    if (amount <= APPROVAL_THRESHOLDS.DIRECTOR_MAX)
        return { chain, color: 'text-yellow-700' };
    return { chain, color: 'text-red-700' };
}
export function DirectorTicketDetailModal({ ticketId, onClose, }) {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [comment, setComment] = useState('');
    const [returnComment, setReturnComment] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showReturnForm, setShowReturnForm] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const navigate = useNavigate();
    const { message: successMessage, showSuccess } = useSuccessOverlay(() => {
        onClose();
        navigate('/director');
    });
    const { data: ticket, isLoading } = useQuery({
        queryKey: ['ticket', ticketId],
        queryFn: () => ticketsAPI.getById(ticketId),
    });
    const costEstimation = ticket?.costEstimation;
    const approveMutation = useMutation({
        mutationFn: () => ticketsAPI.approveCostEstimation(ticketId, comment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            showSuccess('Procjena troška odobrena.');
        },
    });
    const returnMutation = useMutation({
        mutationFn: () => ticketsAPI.returnCostEstimation(ticketId, returnComment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            showSuccess('Procjena troška vraćena voditelju održavanja.');
        },
    });
    const rejectMutation = useMutation({
        mutationFn: () => ticketsAPI.reject(ticketId, rejectReason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            showSuccess('Prijava odbijena.');
        },
    });
    if (isLoading || ticket == null) {
        return (_jsx("div", { style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }, children: _jsx("div", { style: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px' }, children: _jsx("p", { children: "U\u010Ditavanje detalja prijave..." }) }) }));
    }
    // Only the current owner can perform actions (approve / return / reject)
    const isCurrentOwner = session?.userId != null && ticket.currentOwnerUserId === session.userId;
    const canApprove = ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED && isCurrentOwner;
    const amount = costEstimation != null
        ? typeof costEstimation.estimatedAmount === 'number'
            ? costEstimation.estimatedAmount
            : parseFloat(String(costEstimation.estimatedAmount))
        : 0;
    const thresholdInfo = costEstimation ? getThresholdInfo(amount) : null;
    return (_jsx("div", { style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }, children: successMessage ? (_jsx(SuccessOverlay, { message: successMessage })) : (_jsxs("div", { style: { backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '760px', width: '100%', margin: '32px auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }, children: [_jsx("div", { style: { padding: '20px 28px', borderBottom: '1px solid #E8E8ED', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', flexShrink: 0, borderRadius: '16px 16px 0 0' }, children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h2", { style: { fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }, children: "Detalji prijave" }), _jsx(Badge, { variant: "warning", children: "\u010Ceka odobrenje tro\u0161ka" })] }), _jsxs("p", { style: { fontSize: '13px', color: '#6E6E73', marginTop: '2px' }, children: ["Prijava #", ticket.id, " \u2022"] }), _jsxs("p", { style: { fontSize: '13px', color: '#6E6E73', marginTop: '2px' }, children: ["Poslovnica: ", ticket.storeName, " \u2022 Kreirao:", ' ', ticket.createdByUserName] })] }), _jsx("button", { type: "button", onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-2xl", "aria-label": "Zatvori", children: "\u00D7" })] }) }), _jsxs("div", { className: "p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto", children: [_jsxs("div", { children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Informacije o prijavi" }), _jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Kategorija" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: formatCategory(ticket.category) })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Trenutni vlasnik" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—' })] })] }), _jsxs("div", { style: { marginTop: '12px' }, children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Originalni opis problema (zaklju\u010Dano)" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: ticket.originalDescription ?? ticket.description })] })] })] }), ticket.attachments != null && ticket.attachments.length > 0 && (_jsxs("section", { children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Privici" }), _jsx("ul", { className: "bg-gray-50 rounded-lg p-4 space-y-2", children: ticket.attachments.map((a) => (_jsxs("li", { className: "flex items-center justify-between text-sm", children: [_jsx("button", { type: "button", onClick: () => ticketsAPI.downloadAttachment(a.id, a.fileName), className: "text-left text-blue-600 hover:underline", children: a.fileName }), _jsx("span", { className: "text-gray-500", children: new Date(a.createdAt).toLocaleDateString() })] }, a.id))) })] })), costEstimation != null && (_jsxs("div", { children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Procjena tro\u0161ka" }), _jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Procijenjeni iznos:" }), _jsxs("span", { className: "text-3xl font-bold text-blue-900", children: ["\u20AC", amount.toLocaleString()] })] }), thresholdInfo != null && (_jsxs("div", { className: "mt-3 pt-3 border-t border-blue-200", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Lanac odobrenja:" }), ' ', _jsx("span", { className: `text-sm font-semibold ${thresholdInfo.color}`, children: thresholdInfo.chain })] })), _jsxs("div", { className: "mt-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Predao:" }), ' ', _jsx("span", { className: "text-sm text-gray-900", children: costEstimation.createdByUserName })] }), _jsxs("div", { className: "mt-1", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Predano:" }), ' ', _jsx("span", { className: "text-sm text-gray-900", children: new Date(costEstimation.createdAt).toLocaleString() })] })] })] })), ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED && !isCurrentOwner && (_jsx("div", { className: "bg-slate-50 border border-slate-200 rounded-lg p-4", children: _jsx("p", { className: "text-sm text-slate-700", children: "Niste trenutni vlasnik ove prijave. Samo trenutni vlasnik mo\u017Ee odobriti, vratiti na reviziju ili odbiti. Ovaj prikaz je samo za pregled." }) })), canApprove && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }, children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Odobrenje procjene tro\u0161ka" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: "Odobravanje \u0107e eskalirati sljede\u0107em odobravatelju ili, ako ste zadnji u lancu, vratit \u0107e prijavu VMO-u za kreiranje radnog naloga." }), _jsx("textarea", { value: comment, onChange: (e) => setComment(e.target.value), placeholder: "Komentar (opcionalno)...", rows: 2, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' } }), _jsx(Button, { type: "button", onClick: () => approveMutation.mutate(), disabled: approveMutation.isPending, children: approveMutation.isPending ? 'Odobravanje...' : 'Odobri' })] }), _jsx("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF9500' }, children: !showReturnForm ? (_jsxs("div", { children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Povrat na VMO" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: "Ako procjena tro\u0161ka treba reviziju, mo\u017Eete je vratiti Voditelju odr\u017Eavanja." }), _jsx(Button, { type: "button", onClick: () => setShowReturnForm(true), size: "sm", variant: "secondary", children: "Vrati na reviziju" })] })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }, children: "Povrat na VMO" }), _jsx("textarea", { value: returnComment, onChange: (e) => setReturnComment(e.target.value), placeholder: "Opi\u0161ite \u0161to treba revidirati (obavezno)...", rows: 3, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }, autoFocus: true }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", onClick: () => returnMutation.mutate(), disabled: !returnComment.trim() ||
                                                            returnMutation.isPending, size: "sm", children: returnMutation.isPending
                                                            ? 'Vraćanje...'
                                                            : 'Potvrdi povrat' }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => {
                                                            setShowReturnForm(false);
                                                            setReturnComment('');
                                                        }, size: "sm", children: "Odustani" })] })] })) }), _jsx("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF3B30' }, children: !showRejectForm ? (_jsxs("div", { children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Odbijanje prijave" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: "Ako procjena tro\u0161ka nije prihvatljiva, mo\u017Eete odbiti cijelu prijavu." }), _jsx(Button, { type: "button", variant: "danger", onClick: () => setShowRejectForm(true), size: "sm", children: "Odbij prijavu" })] })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }, children: "Odbijanje prijave" }), _jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), placeholder: "Razlog odbijanja (obavezno)...", rows: 3, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "danger", onClick: () => rejectMutation.mutate(), disabled: !rejectReason.trim() ||
                                                            rejectMutation.isPending, size: "sm", children: rejectMutation.isPending
                                                            ? 'Odbijanje...'
                                                            : 'Potvrdi odbijanje' }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => {
                                                            setShowRejectForm(false);
                                                            setRejectReason('');
                                                        }, size: "sm", children: "Odustani" })] })] })) })] })), ticket.approvalRecords != null &&
                            ticket.approvalRecords.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-3", children: "Povijest odobrenja" }), _jsx("div", { className: "space-y-2", children: ticket.approvalRecords.map((approval) => (_jsxs("div", { className: "bg-gray-50 rounded-lg p-3", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "font-medium text-gray-900", children: approval.approverUserName }), _jsxs("span", { className: "text-sm text-gray-600", children: ["(", approval.role, ")"] }), _jsx(Badge, { variant: approval.decision === 'APPROVED'
                                                            ? 'success'
                                                            : approval.decision === 'REJECTED'
                                                                ? 'danger'
                                                                : 'warning', children: approval.decision === 'APPROVED' ? 'ODOBRENO' : approval.decision === 'REJECTED' ? 'ODBIJENO' : approval.decision })] }), approval.comment != null && (_jsx("p", { className: "text-sm text-gray-600 mt-1", children: approval.comment })), _jsx("span", { className: "text-xs text-gray-500", children: new Date(approval.createdAt).toLocaleString() })] }, approval.id))) })] })), ticket.comments != null && ticket.comments.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-3", children: "Komentari" }), _jsx("div", { className: "space-y-3", children: [...ticket.comments]
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((c) => (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("span", { className: "font-medium text-gray-900", children: c.authorUserName }), _jsx("span", { className: "text-xs text-gray-500", children: new Date(c.createdAt).toLocaleString() })] }), _jsx("p", { className: "text-sm text-gray-700", children: c.text })] }, c.id))) })] })), approveMutation.isError && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("p", { className: "text-sm text-red-700", children: ["Gre\u0161ka:", ' ', approveMutation.error?.response?.data?.error ??
                                        'Odobravanje nije uspjelo'] }) })), returnMutation.isError && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("p", { className: "text-sm text-red-700", children: ["Gre\u0161ka:", ' ', returnMutation.error?.response?.data?.error ??
                                        'Vraćanje nije uspjelo'] }) })), rejectMutation.isError && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("p", { className: "text-sm text-red-700", children: ["Gre\u0161ka:", ' ', rejectMutation.error?.response?.data?.error ??
                                        'Odbijanje nije uspjelo'] }) }))] }), _jsx("div", { className: "p-6 border-t border-gray-200 sticky bottom-0 bg-white", children: _jsx(Button, { type: "button", variant: "secondary", onClick: onClose, className: "w-full", children: "Zatvori" }) })] })) }));
}
