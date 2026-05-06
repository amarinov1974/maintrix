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

interface AMMTicketDetailModalProps {
  ticketId: number;
  onClose: () => void;
}

const INTERNAL_ROLE_LABELS: Record<string, string> = {
  SM: 'Voditelj poslovnice (kreator)',
  AM: 'Voditelj regije',
  AMM: 'Voditelj održavanja',
  D: 'Direktor prodaje',
  C2: 'Direktor održavanja',
  BOD: 'Upravni odbor',
};

export function AMMTicketDetailModal({
  ticketId,
  onClose,
}: AMMTicketDetailModalProps) {
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
  const costEstimationFileInputRef = useRef<HTMLInputElement>(null);
  const [showClarificationPopup, setShowClarificationPopup] = useState(false);
  const [woSuccessState, setWoSuccessState] = useState<'sent' | null>(null);
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
  const vendorCompanies = Array.from(
    new Map(
      vendorUsers
        .filter((u) => u.vendorCompanyId != null && u.vendorCompanyName != null)
        .map((u) => [u.vendorCompanyId!, { id: u.vendorCompanyId!, name: u.vendorCompanyName! }])
    ).values()
  );

  const clarifyMutation = useMutation({
    mutationFn: ({ comment, role }: { comment: string; role: string }) =>
      ticketsAPI.requestClarification(ticketId, comment, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setClarificationComment('');
      setShowClarificationPopup(false);
      showSuccess('Prijava vraćena na pojašnjenje.');
    },
  });

  const submitResponseToRequesterMutation = useMutation({
    mutationFn: (comment?: string) =>
      ticketsAPI.submitUpdated(ticketId, undefined, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      showSuccess('Prijava poslana sljedećem odobravatelju.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => ticketsAPI.reject(ticketId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      showSuccess('Prijava odbijena.');
    },
  });

  const submitCostMutation = useMutation({
    mutationFn: (estimatedAmount: number) =>
      ticketsAPI.submitCostEstimation(ticketId, estimatedAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setCostAmount('');
      showSuccess('Procjena troška poslana voditelju regije na odobrenje.');
    },
  });

  const handleCostEstimationFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await ticketsAPI.uploadAttachment(ticketId, files[i], true);
      }
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
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
    if (Number.isNaN(vid) || !commentToVendor.trim()) return;
    createWOMutation.mutate({
      ticketId,
      vendorCompanyId: vid,
      description: commentToVendor.trim(),
    });
  };

  const handleCreateAnotherWO = (yes: boolean) => {
    setWoSuccessState(null);
    if (yes) setShowWorkOrderForm(true);
    else onClose();
  };

  if (isLoading || ticket == null) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px' }}>
          <p>Učitavanje detalja prijave...</p>
        </div>
      </div>
    );
  }

  const isOwner =
    session?.userId != null && ticket.currentOwnerUserId === session.userId;
  const canReturnToRequester =
    ticket.currentStatus === TicketStatus.AWAITING_CREATOR_RESPONSE &&
    isOwner &&
    ticket.clarificationRequestedByUserId != null;
  // AMM can send back to SM (or other involved role) whenever ticket is with AMM in these statuses — urgent and non-urgent.
  const canRequestClarification =
    ticket.currentStatus === TicketStatus.SUBMITTED ||
    ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
    ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED;

  const canReject =
    ticket.currentStatus === TicketStatus.SUBMITTED ||
    ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
    ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED;

  // Urgent tickets skip cost estimation; only show for non-urgent.
  const canSubmitCost =
    ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED && !ticket.urgent;

  // Urgent: create WO directly from Submitted, Updated Submitted, or Cost Estimation Needed (after clarification). Non-urgent: only after cost approved or WO in progress.
  const canCreateWO =
    (ticket.urgent &&
      (ticket.currentStatus === TicketStatus.SUBMITTED ||
        ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
        ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED ||
        ticket.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS)) ||
    (!ticket.urgent &&
      (ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVED ||
        ticket.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS));

  const archivableTicketStatus =
    ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVED ||
    ticket.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS;
  const hasWorkOrders = workOrdersForTicket.length > 0;
  const terminalWorkOrderStatuses: string[] = [
    WorkOrderStatus.COST_PROPOSAL_APPROVED,
    WorkOrderStatus.CLOSED_WITHOUT_COST,
    WorkOrderStatus.REJECTED,
  ];
  const allWorkOrdersTerminal = hasWorkOrders && workOrdersForTicket.every(
    (wo) => wo.currentStatus != null && terminalWorkOrderStatuses.includes(wo.currentStatus)
  );
  const showArchiveSection = archivableTicketStatus && hasWorkOrders;

  const submittedAt =
    ticket.submittedAt ??
    (ticket.currentStatus !== TicketStatus.DRAFT ? ticket.createdAt : null);
  // AMM is part of the internal team — sees both SM-uploaded (public) and
  // internal attachments (e.g. cost estimation files AMM uploaded).
  const visibleAttachments = ticket.attachments ?? [];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
      {successMessage ? (
        <SuccessOverlay message={successMessage} />
      ) : (
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '760px', width: '100%', margin: '32px auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        {/* 11.1 Screen Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #E8E8ED', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', flexShrink: 0, borderRadius: '16px 16px 0 0' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }}>Detalji prijave</h1>
              <p style={{ fontSize: '13px', color: '#6E6E73', marginTop: '2px' }}>Prijava #{ticket.id}</p>
            </div>
            <Button type="button" variant="secondary" onClick={onClose}>
              Natrag
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 11.2 Ticket Core Information (Read-Only Block) */}
          <section>
            <h2 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Informacije o prijavi</h2>
            <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>ID prijave</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.id}</p>
                </div>
                {submittedAt != null && (
                  <div>
                    <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Datum i vrijeme prijave</p>
                    <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{new Date(submittedAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Kreirao</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.createdByUserName}{ticket.createdByUserRole != null ? ` (${ticket.createdByUserRole})` : ''}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Trenutni vlasnik</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Poslovnica</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.storeName}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Kategorija</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{formatCategory(ticket.category)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Hitnost</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.urgent ? 'HITNO' : 'Nije hitno'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Trenutni status</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{formatStatus(ticket.currentStatus)}</p>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Originalni opis problema (zaključano)</p>
                <p style={{ fontSize: '14px', color: '#1D1D1F', whiteSpace: 'pre-wrap' }}>{ticket.originalDescription ?? ticket.description}</p>
              </div>
              {(ticket.assetId != null || ticket.assetDescription != null) && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Oprema</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>
                    {ticket.assetId != null && `ID: ${ticket.assetId}`}
                    {ticket.assetDescription != null && ` — ${ticket.assetDescription}`}
                  </p>
                </div>
              )}
              {visibleAttachments.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Privici</p>
                  <ul className="mt-1 text-sm list-disc list-inside">
                    {visibleAttachments.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => ticketsAPI.downloadAttachment(a.id, a.fileName)}
                          className="text-blue-600 hover:underline"
                        >
                          {a.fileName}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* 11.4 / 11.5 Action Section — Urgent flow: Create WO, Request Clarification, Reject */}
          {woSuccessState === 'sent' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-medium text-green-800 mb-2">Radni nalog uspješno poslan.</p>
              <p className="text-sm text-green-700 mb-3">Kreirati još jedan radni nalog?</p>
              <div className="flex gap-2">
                <Button type="button" variant="primary" onClick={() => handleCreateAnotherWO(false)} size="sm">Ne</Button>
                <Button type="button" variant="secondary" onClick={() => handleCreateAnotherWO(true)} size="sm">Da</Button>
              </div>
            </div>
          )}

          {workOrdersForTicket.length > 0 && (
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Radni nalozi za ovu prijavu</h3>
              <ul className="space-y-2">
                {workOrdersForTicket.map((wo) => (
                  <li key={wo.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm bg-white rounded-lg p-3 border border-gray-200">
                    <span className="font-medium text-gray-900">{wo.vendorCompanyName}</span>
                    <Badge variant={wo.currentStatus === WorkOrderStatus.CREATED ? 'default' : 'warning'}>{wo.currentStatus != null ? formatStatus(wo.currentStatus) : '—'}</Badge>
                    <span className="text-gray-500">{new Date(wo.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {woSuccessState !== 'sent' && canCreateWO && (
            <section style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #34C759' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Kreiranje radnog naloga</h3>
              {ticket.urgent && (
                <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>Hitno: kreirajte radni nalog direktno — bez procjene troška.</p>
              )}
              {createWOMutation.isError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
                  {(() => {
                    const err = createWOMutation.error as { response?: { data?: { error?: string } }; message?: string };
                    return err?.response?.data?.error ?? err?.message ?? 'Failed to create work order.';
                  })()}
                </p>
              )}
              {!showWorkOrderForm ? (
                <Button type="button" onClick={() => setShowWorkOrderForm(true)}>Kreiraj radni nalog</Button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }}>Odabir izvođača *</label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                    >
                      <option value="">— Odaberite izvođača —</option>
                      {vendorCompanies.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }}>Komentar izvođaču *</label>
                    <textarea
                      value={commentToVendor}
                      onChange={(e) => setCommentToVendor(e.target.value)}
                      placeholder="Opišite problem i dajte upute izvođaču..."
                      rows={4}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleCreateWO}
                      disabled={
                        !selectedVendorId ||
                        !commentToVendor.trim() ||
                        createWOMutation.isPending
                      }
                    >
                      {createWOMutation.isPending ? 'Slanje...' : 'Pošalji radni nalog'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowWorkOrderForm(false)}>Odustani</Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {canReturnToRequester && (
            <section style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Odgovor na zahtjev za pojašnjenje</h3>
              <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>
                {ticket.clarificationRequestedByUserName != null || ticket.clarificationRequestedByUserRole != null
                  ? `${ticket.clarificationRequestedByUserName ?? 'Requester'}${ticket.clarificationRequestedByUserRole != null ? ` (${INTERNAL_ROLE_LABELS[ticket.clarificationRequestedByUserRole] ?? ticket.clarificationRequestedByUserRole})` : ''} zatražio pojašnjenje. Možete vratiti prijavu samo njima.`
                  : 'Vratite prijavu ulozi koja je zatražila pojašnjenje.'}
              </p>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }}>Komentar (opcionalno)</label>
              <textarea
                value={clarificationComment}
                onChange={(e) => setClarificationComment(e.target.value)}
                placeholder="Dodajte komentar (opcionalno)..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
              />
              <Button
                type="button"
                onClick={() => submitResponseToRequesterMutation.mutate(clarificationComment.trim() || undefined)}
                disabled={submitResponseToRequesterMutation.isPending}
              >
                {submitResponseToRequesterMutation.isPending ? 'Slanje...' : `Vrati na ${ticket.clarificationRequestedByUserName ?? 'podnositelja'}`}
              </Button>
            </section>
          )}

          {canSubmitCost && (
            <section style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Predaja procjene troška</h3>
              <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>Unesite procijenjeni trošak i opcijski priložite dokumentaciju. Prijava će proći kroz lanac odobrenja.</p>
              <div className="space-y-3">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }}>Procijenjeni iznos (EUR)</label>
                  <input
                    type="number"
                    value={costAmount}
                    onChange={(e) => setCostAmount(e.target.value)}
                    placeholder="Iznos u EUR"
                    min="0"
                    step="0.01"
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }}>Dokumenti (opcionalno)</label>
                  <p className="text-xs text-gray-600 mb-2">Priložite prateću dokumentaciju za procjenu troška.</p>
                  <input
                    ref={costEstimationFileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,image/*"
                    className="hidden"
                    onChange={handleCostEstimationFileChange}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => costEstimationFileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                  >
                    {uploadingAttachment ? 'Učitavanje...' : 'Dodaj dokument(e)'}
                  </Button>
                  {ticket.attachments != null && ticket.attachments.length > 0 && (
                    <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                      {ticket.attachments.map((a) => (
                        <li key={a.id}>{a.fileName}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => submitCostMutation.mutate(parseFloat(costAmount))}
                    disabled={!costAmount || parseFloat(costAmount) <= 0 || submitCostMutation.isPending}
                  >
                    {submitCostMutation.isPending ? 'Slanje...' : 'Pošalji na odobrenje'}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {canRequestClarification && (
            <section style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF9500' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Zahtjev za pojašnjenje</h3>
              <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>Pošaljite prijavu ulozi koja je bila uključena. Nakon ažuriranja, prijava se vraća Vama.</p>
              {clarifyMutation.isError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
                  {(() => {
                    const err = clarifyMutation.error as { response?: { data?: { error?: string } }; message?: string };
                    return err?.response?.data?.error ?? err?.message ?? 'Request clarification failed.';
                  })()}
                </p>
              )}
              {!showClarificationPopup ? (
                <Button type="button" onClick={() => { const baseRoles = ticket.involvedInternalRoles ?? ['SM']; const options = baseRoles.filter((r) => r !== ticket.currentOwnerUserRole); const targetOptions = options.length > 0 ? options : ['SM']; setAssignToRole(targetOptions[0] ?? 'SM'); setShowClarificationPopup(true); }}>Zatraži pojašnjenje</Button>
              ) : (
                <div className="space-y-3">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }}>Pošalji zahtjev za pojašnjenje prema</label>
                  <select
                    value={assignToRole}
                    onChange={(e) => setAssignToRole(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {(() => { const baseRoles = ticket.involvedInternalRoles ?? ['SM']; const options = baseRoles.filter((r) => r !== ticket.currentOwnerUserRole); const targetOptions = options.length > 0 ? options : ['SM']; return targetOptions.map((r) => (<option key={r} value={r}>{INTERNAL_ROLE_LABELS[r] ?? r}</option>)); })()}
                  </select>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }}>Tekst pojašnjenja (obavezno)</label>
                  <textarea
                    value={clarificationComment}
                    onChange={(e) => setClarificationComment(e.target.value)}
                    placeholder="Opišite što treba pojasniti..."
                    rows={4}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => clarifyMutation.mutate({ comment: clarificationComment, role: assignToRole })}
                      disabled={!clarificationComment.trim() || clarifyMutation.isPending}
                    >
                      {clarifyMutation.isPending ? 'Slanje...' : 'Pošalji'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowClarificationPopup(false)}>Odustani</Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {canReject && (
            <section style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF3B30' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Odbijanje prijave</h3>
              {!showRejectForm ? (
                <Button type="button" variant="danger" onClick={() => setShowRejectForm(true)}>Odbij prijavu</Button>
              ) : (
                <div className="space-y-3">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }}>Razlog (obavezno)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Razlog odbijanja..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => rejectMutation.mutate(rejectReason)}
                      disabled={!rejectReason.trim() || rejectMutation.isPending}
                    >
                      {rejectMutation.isPending ? 'Odbijanje...' : 'Potvrdi odbijanje'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowRejectForm(false)}>Odustani</Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {showArchiveSection && (
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p id={`archive-reason-${ticket.id}`} className="text-sm text-gray-700 mb-2">
                {allWorkOrdersTerminal
                  ? 'Prijava je odobrena. Arhivirajte kada su svi radni nalozi završeni.'
                  : 'Nije moguće arhivirati — postoje aktivni radni nalozi.'}
              </p>
              {archiveMutation.isError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {(archiveMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                    'Archive failed'}
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending || !allWorkOrdersTerminal}
                aria-describedby={`archive-reason-${ticket.id}`}
              >
                {archiveMutation.isPending ? 'Arhiviranje...' : 'Arhiviraj prijavu'}
              </Button>
            </section>
          )}

          {/* 11.3 Comments (internal; AMM sees all ticket comments) — newest first */}
          {ticket.comments != null && ticket.comments.length > 0 && (
            <section>
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Komentari</h3>
              <div className="space-y-3">
                {[...ticket.comments]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900">{c.authorUserName}</span>
                      <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 11.10 History Log — newest on top */}
          {ticket.auditLog != null && ticket.auditLog.length > 0 && (
            <section>
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Povijest</h3>
              <div>
                {ticket.auditLog.map((entry) => (
                  <div key={entry.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F0F5' }}>
                    <span style={{ fontSize: '12px', color: '#6E6E73' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                    {' — '}
                    <span style={{ fontSize: '12px', color: '#6E6E73' }}>{formatHistoryAction(entry.actionType)}</span>
                    {entry.prevStatus != null && (
                      <span style={{ fontSize: '12px', color: '#6E6E73' }}> ({formatStatusAny(entry.prevStatus)} → {formatStatusAny(entry.newStatus)})</span>
                    )}
                    <p style={{ fontSize: '13px', color: '#1D1D1F', fontWeight: 500, marginTop: '4px' }}>
                      Izvršio {entry.actorName}{entry.actorRole != null ? ` (${entry.actorRole})` : ''}
                    </p>
                    {entry.comment != null && <p style={{ fontSize: '13px', color: '#3C3C43', marginTop: '4px' }}>&quot;{entry.comment}&quot;</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white shrink-0">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full">Natrag</Button>
        </div>
      </div>
      )}
    </div>
  );
}
