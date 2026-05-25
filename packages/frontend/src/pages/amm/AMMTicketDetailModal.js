import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AMM Ticket Detail — Section 11 (Urgent Flow) and other AMM states
 * Header, read-only core block, Create WO / Request Clarification / Reject.
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { workOrdersAPI } from '../../api/work-orders';
import { authAPI } from '../../api/auth';
import { useSession } from '../../contexts/SessionContext';
import { TicketStatus, WorkOrderStatus } from '../../types/statuses';
import { Button, Badge, SuccessOverlay } from '../../components/shared';
import { formatCategory, formatHistoryAction, formatStatus, formatStatusAny } from '../../utils/formatters';
import { useSuccessOverlay } from '../../hooks/useSuccessOverlay';
const INTERNAL_ROLE_LABELS = {
    SM: 'Voditelj poslovnice (kreator)',
    AM: 'Voditelj regije',
    AMM: 'Voditelj održavanja',
    D: 'Direktor prodaje',
    C2: 'Direktor održavanja',
    BOD: 'Upravni odbor',
};
export function AMMTicketDetailModal({ ticketId, onClose, }) {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [clarificationComment, setClarificationComment] = useState('');
    const [assignToRole, setAssignToRole] = useState('SM');
    const [rejectReason, setRejectReason] = useState('');
    const [costAmount, setCostAmount] = useState('');
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [commentToVendor, setCommentToVendor] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const costEstimationFileInputRef = useRef(null);
    const [showClarificationPopup, setShowClarificationPopup] = useState(false);
    const [woSuccessState, setWoSuccessState] = useState(null);
    const navigate = useNavigate();
    const { message: successMessage, showSuccess } = useSuccessOverlay(() => {
        onClose();
        navigate('/amm');
    });
    const { data: ticket, isLoading } = useQuery({
        queryKey: ['ticket', ticketId],
        queryFn: () => ticketsAPI.getById(ticketId),
    });
    const { data: workOrdersForTicket = [] } = useQuery({
        queryKey: ['work-orders', 'ticket', ticketId],
        queryFn: () => workOrdersAPI.list({ ticketId }),
        enabled: !!ticketId,
    });
    const { data: vendorUsers = [] } = useQuery({
        queryKey: ['vendor-users'],
        queryFn: authAPI.getVendorUsers,
        enabled: showWorkOrderForm || woSuccessState === 'sent',
    });
    const vendorCompanies = Array.from(new Map(vendorUsers
        .filter((u) => u.vendorCompanyId != null && u.vendorCompanyName != null)
        .map((u) => [u.vendorCompanyId, { id: u.vendorCompanyId, name: u.vendorCompanyName }])).values());
    const clarifyMutation = useMutation({
        mutationFn: ({ comment, role }) => ticketsAPI.requestClarification(ticketId, comment, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            setClarificationComment('');
            setShowClarificationPopup(false);
            showSuccess('Prijava vraćena na pojašnjenje.');
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
    const rejectMutation = useMutation({
        mutationFn: (reason) => ticketsAPI.reject(ticketId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            showSuccess('Prijava odbijena.');
        },
    });
    const submitCostMutation = useMutation({
        mutationFn: (estimatedAmount) => ticketsAPI.submitCostEstimation(ticketId, estimatedAmount),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            setCostAmount('');
            showSuccess('Procjena troška poslana voditelju regije na odobrenje.');
        },
    });
    const handleCostEstimationFileChange = async (e) => {
        const files = e.target.files;
        if (!files?.length)
            return;
        setUploadingAttachment(true);
        try {
            for (let i = 0; i < files.length; i++) {
                await ticketsAPI.uploadAttachment(ticketId, files[i], true);
            }
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
        }
        catch (err) {
            console.error('Upload failed:', err);
        }
        finally {
            setUploadingAttachment(false);
            e.target.value = '';
        }
    };
    const createWOMutation = useMutation({
        mutationFn: workOrdersAPI.create,
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            await queryClient.refetchQueries({ queryKey: ['tickets'] });
            setWoSuccessState('sent');
            setShowWorkOrderForm(false);
            setSelectedVendorId('');
            setCommentToVendor('');
        },
    });
    const archiveMutation = useMutation({
        mutationFn: () => ticketsAPI.archive(ticketId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            showSuccess('Prijava arhivirana.');
        },
    });
    const handleCreateWO = () => {
        const vid = parseInt(selectedVendorId, 10);
        if (Number.isNaN(vid) || !commentToVendor.trim())
            return;
        createWOMutation.mutate({
            ticketId,
            vendorCompanyId: vid,
            description: commentToVendor.trim(),
        });
    };
    const handleCreateAnotherWO = (yes) => {
        setWoSuccessState(null);
        if (yes)
            setShowWorkOrderForm(true);
        else
            onClose();
    };
    if (isLoading || ticket == null) {
        return (_jsx("div", { style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }, children: _jsx("div", { style: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px' }, children: _jsx("p", { children: "U\u010Ditavanje detalja prijave..." }) }) }));
    }
    const isOwner = session?.userId != null && ticket.currentOwnerUserId === session.userId;
    const canReturnToRequester = ticket.currentStatus === TicketStatus.AWAITING_CREATOR_RESPONSE &&
        isOwner &&
        ticket.clarificationRequestedByUserId != null;
    // AMM can send back to SM (or other involved role) whenever ticket is with AMM in these statuses — urgent and non-urgent.
    const canRequestClarification = ticket.currentStatus === TicketStatus.SUBMITTED ||
        ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
        ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED;
    const canReject = ticket.currentStatus === TicketStatus.SUBMITTED ||
        ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
        ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED;
    // Urgent tickets skip cost estimation; only show for non-urgent.
    const canSubmitCost = ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED && !ticket.urgent;
    // Urgent: create WO directly from Submitted, Updated Submitted, or Cost Estimation Needed (after clarification). Non-urgent: only after cost approved or WO in progress.
    const canCreateWO = (ticket.urgent &&
        (ticket.currentStatus === TicketStatus.SUBMITTED ||
            ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
            ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED ||
            ticket.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS)) ||
        (!ticket.urgent &&
            (ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVED ||
                ticket.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS));
    const archivableTicketStatus = ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVED ||
        ticket.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS;
    const hasWorkOrders = workOrdersForTicket.length > 0;
    const terminalWorkOrderStatuses = [
        WorkOrderStatus.COST_PROPOSAL_APPROVED,
        WorkOrderStatus.CLOSED_WITHOUT_COST,
        WorkOrderStatus.REJECTED,
    ];
    const allWorkOrdersTerminal = hasWorkOrders && workOrdersForTicket.every((wo) => wo.currentStatus != null && terminalWorkOrderStatuses.includes(wo.currentStatus));
    const showArchiveSection = archivableTicketStatus && hasWorkOrders;
    const submittedAt = ticket.submittedAt ??
        (ticket.currentStatus !== TicketStatus.DRAFT ? ticket.createdAt : null);
    // AMM is part of the internal team — sees both SM-uploaded (public) and
    // internal attachments (e.g. cost estimation files AMM uploaded).
    const visibleAttachments = ticket.attachments ?? [];
    return (_jsx("div", { style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }, children: successMessage ? (_jsx(SuccessOverlay, { message: successMessage })) : (_jsxs("div", { style: { backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '760px', width: '100%', margin: '32px auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }, children: [_jsx("div", { style: { padding: '20px 28px', borderBottom: '1px solid #E8E8ED', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', flexShrink: 0, borderRadius: '16px 16px 0 0' }, children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h1", { style: { fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }, children: "Detalji prijave" }), _jsxs("p", { style: { fontSize: '13px', color: '#6E6E73', marginTop: '2px' }, children: ["Prijava #", ticket.id] })] }), _jsx(Button, { type: "button", variant: "secondary", onClick: onClose, children: "Natrag" })] }) }), _jsxs("div", { className: "p-6 space-y-6 overflow-y-auto flex-1", children: [_jsxs("section", { children: [_jsx("h2", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Informacije o prijavi" }), _jsxs("div", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "ID prijave" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: ticket.id })] }), submittedAt != null && (_jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Datum i vrijeme prijave" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: new Date(submittedAt).toLocaleString() })] })), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Kreirao" }), _jsxs("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: [ticket.createdByUserName, ticket.createdByUserRole != null ? ` (${ticket.createdByUserRole})` : ''] })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Trenutni vlasnik" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—' })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Poslovnica" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: ticket.storeName })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Kategorija" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: formatCategory(ticket.category) })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Hitnost" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: ticket.urgent ? 'HITNO' : 'Nije hitno' })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Trenutni status" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: formatStatus(ticket.currentStatus) })] })] }), _jsxs("div", { style: { marginTop: '12px' }, children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Originalni opis problema (zaklju\u010Dano)" }), _jsx("p", { style: { fontSize: '14px', color: '#1D1D1F', whiteSpace: 'pre-wrap' }, children: ticket.originalDescription ?? ticket.description })] }), (ticket.assetId != null || ticket.assetDescription != null) && (_jsxs("div", { style: { marginTop: '12px' }, children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Oprema" }), _jsxs("p", { style: { fontSize: '14px', color: '#1D1D1F' }, children: [ticket.assetId != null && `ID: ${ticket.assetId}`, ticket.assetDescription != null && ` — ${ticket.assetDescription}`] })] })), visibleAttachments.length > 0 && (_jsxs("div", { style: { marginTop: '12px' }, children: [_jsx("p", { style: { fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }, children: "Privici" }), _jsx("ul", { className: "mt-1 text-sm list-disc list-inside", children: visibleAttachments.map((a) => (_jsx("li", { children: _jsx("button", { type: "button", onClick: () => ticketsAPI.downloadAttachment(a.id, a.fileName), className: "text-blue-600 hover:underline", children: a.fileName }) }, a.id))) })] }))] })] }), woSuccessState === 'sent' && (_jsxs("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: [_jsx("p", { className: "font-medium text-green-800 mb-2", children: "Radni nalog uspje\u0161no poslan." }), _jsx("p", { className: "text-sm text-green-700 mb-3", children: "Kreirati jo\u0161 jedan radni nalog?" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "primary", onClick: () => handleCreateAnotherWO(false), size: "sm", children: "Ne" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => handleCreateAnotherWO(true), size: "sm", children: "Da" })] })] })), workOrdersForTicket.length > 0 && (_jsxs("section", { className: "bg-gray-50 border border-gray-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Radni nalozi za ovu prijavu" }), _jsx("ul", { className: "space-y-2", children: workOrdersForTicket.map((wo) => (_jsxs("li", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm bg-white rounded-lg p-3 border border-gray-200", children: [_jsx("span", { className: "font-medium text-gray-900", children: wo.vendorCompanyName }), _jsx(Badge, { variant: wo.currentStatus === WorkOrderStatus.CREATED ? 'default' : 'warning', children: wo.currentStatus != null ? formatStatus(wo.currentStatus) : '—' }), _jsx("span", { className: "text-gray-500", children: new Date(wo.createdAt).toLocaleString() })] }, wo.id))) })] })), woSuccessState !== 'sent' && canCreateWO && (_jsxs("section", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #34C759' }, children: [_jsx("h3", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Kreiranje radnog naloga" }), ticket.urgent && (_jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: "Hitno: kreirajte radni nalog direktno \u2014 bez procjene tro\u0161ka." })), createWOMutation.isError && (_jsx("p", { className: "text-sm text-red-600 bg-red-50 p-2 rounded mb-2", children: (() => {
                                        const err = createWOMutation.error;
                                        return err?.response?.data?.error ?? err?.message ?? 'Failed to create work order.';
                                    })() })), !showWorkOrderForm ? (_jsx(Button, { type: "button", onClick: () => setShowWorkOrderForm(true), children: "Kreiraj radni nalog" })) : (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }, children: "Odabir izvo\u0111a\u010Da *" }), _jsxs("select", { value: selectedVendorId, onChange: (e) => setSelectedVendorId(e.target.value), style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }, children: [_jsx("option", { value: "", children: "\u2014 Odaberite izvo\u0111a\u010Da \u2014" }), vendorCompanies.map((v) => (_jsx("option", { value: v.id, children: v.name }, v.id)))] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }, children: "Komentar izvo\u0111a\u010Du *" }), _jsx("textarea", { value: commentToVendor, onChange: (e) => setCommentToVendor(e.target.value), placeholder: "Opi\u0161ite problem i dajte upute izvo\u0111a\u010Du...", rows: 4, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", onClick: handleCreateWO, disabled: !selectedVendorId ||
                                                        !commentToVendor.trim() ||
                                                        createWOMutation.isPending, children: createWOMutation.isPending ? 'Slanje...' : 'Pošalji radni nalog' }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => setShowWorkOrderForm(false), children: "Odustani" })] })] }))] })), canReturnToRequester && (_jsxs("section", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }, children: [_jsx("h3", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Odgovor na zahtjev za poja\u0161njenje" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: ticket.clarificationRequestedByUserName != null || ticket.clarificationRequestedByUserRole != null
                                        ? `${ticket.clarificationRequestedByUserName ?? 'Requester'}${ticket.clarificationRequestedByUserRole != null ? ` (${INTERNAL_ROLE_LABELS[ticket.clarificationRequestedByUserRole] ?? ticket.clarificationRequestedByUserRole})` : ''} zatražio pojašnjenje. Možete vratiti prijavu samo njima.`
                                        : 'Vratite prijavu ulozi koja je zatražila pojašnjenje.' }), _jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }, children: "Komentar (opcionalno)" }), _jsx("textarea", { value: clarificationComment, onChange: (e) => setClarificationComment(e.target.value), placeholder: "Dodajte komentar (opcionalno)...", rows: 3, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' } }), _jsx(Button, { type: "button", onClick: () => submitResponseToRequesterMutation.mutate(clarificationComment.trim() || undefined), disabled: submitResponseToRequesterMutation.isPending, children: submitResponseToRequesterMutation.isPending ? 'Slanje...' : `Vrati na ${ticket.clarificationRequestedByUserName ?? 'podnositelja'}` })] })), canSubmitCost && (_jsxs("section", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }, children: [_jsx("h3", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Predaja procjene tro\u0161ka" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: "Unesite procijenjeni tro\u0161ak i opcijski prilo\u017Eite dokumentaciju. Prijava \u0107e pro\u0107i kroz lanac odobrenja." }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }, children: "Procijenjeni iznos (EUR)" }), _jsx("input", { type: "number", value: costAmount, onChange: (e) => setCostAmount(e.target.value), placeholder: "Iznos u EUR", min: "0", step: "0.01", style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }, children: "Dokumenti (opcionalno)" }), _jsx("p", { className: "text-xs text-gray-600 mb-2", children: "Prilo\u017Eite prate\u0107u dokumentaciju za procjenu tro\u0161ka." }), _jsx("input", { ref: costEstimationFileInputRef, type: "file", multiple: true, accept: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,image/*", className: "hidden", onChange: handleCostEstimationFileChange }), _jsx(Button, { type: "button", variant: "secondary", size: "sm", onClick: () => costEstimationFileInputRef.current?.click(), disabled: uploadingAttachment, children: uploadingAttachment ? 'Učitavanje...' : 'Dodaj dokument(e)' }), ticket.attachments != null && ticket.attachments.length > 0 && (_jsx("ul", { className: "mt-2 text-sm text-gray-600 list-disc list-inside", children: ticket.attachments.map((a) => (_jsx("li", { children: a.fileName }, a.id))) }))] }), _jsx("div", { className: "flex gap-2 pt-1", children: _jsx(Button, { type: "button", onClick: () => submitCostMutation.mutate(parseFloat(costAmount)), disabled: !costAmount || parseFloat(costAmount) <= 0 || submitCostMutation.isPending, children: submitCostMutation.isPending ? 'Slanje...' : 'Pošalji na odobrenje' }) })] })] })), canRequestClarification && (_jsxs("section", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF9500' }, children: [_jsx("h3", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Zahtjev za poja\u0161njenje" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }, children: "Po\u0161aljite prijavu ulozi koja je bila uklju\u010Dena. Nakon a\u017Euriranja, prijava se vra\u0107a Vama." }), clarifyMutation.isError && (_jsx("p", { className: "text-sm text-red-600 bg-red-50 p-2 rounded mb-2", children: (() => {
                                        const err = clarifyMutation.error;
                                        return err?.response?.data?.error ?? err?.message ?? 'Request clarification failed.';
                                    })() })), !showClarificationPopup ? (_jsx(Button, { type: "button", onClick: () => { const baseRoles = ticket.involvedInternalRoles ?? ['SM']; const options = baseRoles.filter((r) => r !== ticket.currentOwnerUserRole); const targetOptions = options.length > 0 ? options : ['SM']; setAssignToRole(targetOptions[0] ?? 'SM'); setShowClarificationPopup(true); }, children: "Zatra\u017Ei poja\u0161njenje" })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }, children: "Po\u0161alji zahtjev za poja\u0161njenje prema" }), _jsx("select", { value: assignToRole, onChange: (e) => setAssignToRole(e.target.value), style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }, children: (() => { const baseRoles = ticket.involvedInternalRoles ?? ['SM']; const options = baseRoles.filter((r) => r !== ticket.currentOwnerUserRole); const targetOptions = options.length > 0 ? options : ['SM']; return targetOptions.map((r) => (_jsx("option", { value: r, children: INTERNAL_ROLE_LABELS[r] ?? r }, r))); })() }), _jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }, children: "Tekst poja\u0161njenja (obavezno)" }), _jsx("textarea", { value: clarificationComment, onChange: (e) => setClarificationComment(e.target.value), placeholder: "Opi\u0161ite \u0161to treba pojasniti...", rows: 4, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", onClick: () => clarifyMutation.mutate({ comment: clarificationComment, role: assignToRole }), disabled: !clarificationComment.trim() || clarifyMutation.isPending, children: clarifyMutation.isPending ? 'Slanje...' : 'Pošalji' }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => setShowClarificationPopup(false), children: "Odustani" })] })] }))] })), canReject && (_jsxs("section", { style: { backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF3B30' }, children: [_jsx("h3", { style: { fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }, children: "Odbijanje prijave" }), !showRejectForm ? (_jsx(Button, { type: "button", variant: "danger", onClick: () => setShowRejectForm(true), children: "Odbij prijavu" })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }, children: "Razlog (obavezno)" }), _jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), placeholder: "Razlog odbijanja...", rows: 3, style: { width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' } }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "danger", onClick: () => rejectMutation.mutate(rejectReason), disabled: !rejectReason.trim() || rejectMutation.isPending, children: rejectMutation.isPending ? 'Odbijanje...' : 'Potvrdi odbijanje' }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => setShowRejectForm(false), children: "Odustani" })] })] }))] })), showArchiveSection && (_jsxs("section", { className: "bg-gray-50 border border-gray-200 rounded-lg p-4", children: [_jsx("p", { id: `archive-reason-${ticket.id}`, className: "text-sm text-gray-700 mb-2", children: allWorkOrdersTerminal
                                        ? 'Prijava je odobrena. Arhivirajte kada su svi radni nalozi završeni.'
                                        : 'Nije moguće arhivirati — postoje aktivni radni nalozi.' }), archiveMutation.isError && (_jsx("div", { className: "mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800", children: archiveMutation.error?.response?.data?.error ??
                                        'Archive failed' })), _jsx(Button, { type: "button", variant: "secondary", onClick: () => archiveMutation.mutate(), disabled: archiveMutation.isPending || !allWorkOrdersTerminal, "aria-describedby": `archive-reason-${ticket.id}`, children: archiveMutation.isPending ? 'Arhiviranje...' : 'Arhiviraj prijavu' })] })), ticket.comments != null && ticket.comments.length > 0 && (_jsxs("section", { children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Komentari" }), _jsx("div", { className: "space-y-3", children: [...ticket.comments]
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((c) => (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsxs("div", { className: "flex justify-between items-start mb-1", children: [_jsx("span", { className: "font-medium text-gray-900", children: c.authorUserName }), _jsx("span", { className: "text-xs text-gray-500", children: new Date(c.createdAt).toLocaleString() })] }), _jsx("p", { className: "text-sm text-gray-700", children: c.text })] }, c.id))) })] })), ticket.auditLog != null && ticket.auditLog.length > 0 && (_jsxs("section", { children: [_jsx("h3", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }, children: "Povijest" }), _jsx("div", { children: ticket.auditLog.map((entry) => (_jsxs("div", { style: { padding: '12px 0', borderBottom: '1px solid #F0F0F5' }, children: [_jsx("span", { style: { fontSize: '12px', color: '#6E6E73' }, children: new Date(entry.createdAt).toLocaleString() }), ' — ', _jsx("span", { style: { fontSize: '12px', color: '#6E6E73' }, children: formatHistoryAction(entry.actionType) }), entry.prevStatus != null && (_jsxs("span", { style: { fontSize: '12px', color: '#6E6E73' }, children: [" (", formatStatusAny(entry.prevStatus), " \u2192 ", formatStatusAny(entry.newStatus), ")"] })), _jsxs("p", { style: { fontSize: '13px', color: '#1D1D1F', fontWeight: 500, marginTop: '4px' }, children: ["Izvr\u0161io ", entry.actorName, entry.actorRole != null ? ` (${entry.actorRole})` : ''] }), entry.comment != null && _jsxs("p", { style: { fontSize: '13px', color: '#3C3C43', marginTop: '4px' }, children: ["\"", entry.comment, "\""] })] }, entry.id))) })] }))] }), _jsx("div", { className: "p-6 border-t border-gray-200 sticky bottom-0 bg-white shrink-0", children: _jsx(Button, { type: "button", variant: "secondary", onClick: onClose, className: "w-full", children: "Natrag" }) })] })) }));
}
