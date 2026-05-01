/**
 * AMM Ticket Detail — Section 11 (Urgent Flow) and other AMM states
 * Header, read-only core block, Create WO / Request Clarification / Reject.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { workOrdersAPI } from '../../api/work-orders';
import { authAPI } from '../../api/auth';
import { useSession } from '../../contexts/SessionContext';
import { TicketStatus } from '../../types/statuses';
import { Button, Badge } from '../../components/shared';

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
  const [showCostSubmittedSuccess, setShowCostSubmittedSuccess] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
      onClose();
    },
  });

  const submitResponseToRequesterMutation = useMutation({
    mutationFn: (comment?: string) =>
      ticketsAPI.submitUpdated(ticketId, undefined, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => ticketsAPI.reject(ticketId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
    },
  });

  const submitCostMutation = useMutation({
    mutationFn: (estimatedAmount: number) =>
      ticketsAPI.submitCostEstimation(ticketId, estimatedAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setCostAmount('');
      setShowCostSubmittedSuccess(true);
    },
  });

  useEffect(() => {
    if (!showCostSubmittedSuccess) return;
    const t = setTimeout(() => {
      onCloseRef.current();
    }, 2000);
    return () => clearTimeout(t);
  }, [showCostSubmittedSuccess]);

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
      onClose();
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Učitavanje detalja prijave...</p>
        </div>
      </div>
    );
  }

  const isUrgentFlow =
    ticket.currentStatus === 'Ticket Submitted' && ticket.urgent;

  const isOwner =
    session?.userId != null && ticket.currentOwnerUserId === session.userId;
  const canReturnToRequester =
    ticket.currentStatus === 'Awaiting Ticket Creator Response' &&
    isOwner &&
    ticket.clarificationRequestedByUserId != null;
  // AMM can send back to SM (or other involved role) whenever ticket is with AMM in these statuses — urgent and non-urgent.
  const canRequestClarification =
    ticket.currentStatus === TicketStatus.SUBMITTED ||
    ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
    ticket.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED;

  const canReject =
    ticket.currentStatus === 'Ticket Submitted' ||
    ticket.currentStatus === 'Updated Ticket Submitted' ||
    ticket.currentStatus === 'Cost Estimation Needed';

  // Urgent tickets skip cost estimation; only show for non-urgent.
  const canSubmitCost =
    ticket.currentStatus === 'Cost Estimation Needed' && !ticket.urgent;

  // Urgent: create WO directly from Submitted, Updated Submitted, or Cost Estimation Needed (after clarification). Non-urgent: only after cost approved or WO in progress.
  const canCreateWO =
    (ticket.urgent &&
      (ticket.currentStatus === 'Ticket Submitted' ||
        ticket.currentStatus === 'Updated Ticket Submitted' ||
        ticket.currentStatus === 'Cost Estimation Needed' ||
        ticket.currentStatus === 'Work Order In Progress')) ||
    (!ticket.urgent &&
      (ticket.currentStatus === 'Ticket Cost Estimation Approved' ||
        ticket.currentStatus === 'Work Order In Progress'));

  const canArchive =
    ticket.currentStatus === 'Ticket Cost Estimation Approved' ||
    ticket.currentStatus === 'Work Order In Progress';

  const submittedAt =
    ticket.submittedAt ??
    (ticket.currentStatus !== 'Draft' ? ticket.createdAt : null);
  const visibleAttachments = (ticket.attachments ?? []).filter(
    (a) => !a.internalFlag
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
        {/* 11.1 Screen Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Detalji prijave</h1>
              <p className="text-sm text-gray-500 mt-0.5">Prijava #{ticket.id}</p>
            </div>
            <Button type="button" variant="secondary" onClick={onClose}>
              Natrag
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {showCostSubmittedSuccess ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-green-100 border-2 border-green-500 rounded-lg p-6 max-w-md w-full text-center">
                <p className="text-green-800 font-semibold text-xl mb-2">
                  ✓ Procjena troška poslana voditelju regije na odobrenje.
                </p>
                <p className="text-green-700 text-sm">
                  Povratak na nadzornu ploču za 2 sekunde...
                </p>
              </div>
            </div>
          ) : (
          <>
          {/* 11.2 Ticket Core Information (Read-Only Block) */}
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Informacije o prijavi</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span><strong>ID prijave:</strong> {ticket.id}</span>
                {submittedAt != null && (
                  <span><strong>Datum i vrijeme prijave:</strong> {new Date(submittedAt).toLocaleString()}</span>
                )}
                <span><strong>Kreirao:</strong> {ticket.createdByUserName}{ticket.createdByUserRole != null ? ` (${ticket.createdByUserRole})` : ''}</span>
                <span><strong>Trenutni vlasnik:</strong> {ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—'}</span>
                <span><strong>Poslovnica:</strong> {ticket.storeName}</span>
                <span><strong>Kategorija:</strong> {ticket.category}</span>
                <span>
                  <strong>Hitnost:</strong>{' '}
                  {ticket.urgent ? <Badge variant="urgent">HITNO</Badge> : <Badge variant="default">Nije hitno</Badge>}
                </span>
                <span><strong>Trenutni status:</strong> <Badge variant={ticket.currentStatus.includes('Approved') ? 'success' : 'warning'}>{ticket.currentStatus}</Badge></span>
              </div>
              <div>
                <strong className="text-sm text-gray-600">Originalni opis problema (zaključano)</strong>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{ticket.originalDescription ?? ticket.description}</p>
              </div>
              {(ticket.assetId != null || ticket.assetDescription != null) && (
                <div>
                  <strong className="text-sm text-gray-600">Oprema</strong>
                  <p className="text-sm text-gray-900">
                    {ticket.assetId != null && `ID: ${ticket.assetId}`}
                    {ticket.assetDescription != null && ` — ${ticket.assetDescription}`}
                  </p>
                </div>
              )}
              {visibleAttachments.length > 0 && (
                <div>
                  <strong className="text-sm text-gray-600">Privici</strong>
                  <ul className="mt-1 text-sm text-gray-900 list-disc list-inside">
                    {visibleAttachments.map((a) => (
                      <li key={a.id}>{a.fileName}</li>
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
                    <Badge variant={wo.currentStatus?.includes('Created') ? 'default' : 'warning'}>{wo.currentStatus ?? '—'}</Badge>
                    <span className="text-gray-500">{new Date(wo.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {woSuccessState !== 'sent' && canCreateWO && (
            <section className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Kreiranje radnog naloga</h3>
              {ticket.urgent && (
                <p className="text-sm text-green-800 mb-2">Hitno: kreirajte radni nalog direktno — bez procjene troška.</p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Odabir izvođača *</label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">— Odaberite izvođača —</option>
                      {vendorCompanies.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Komentar izvođaču *</label>
                    <textarea
                      value={commentToVendor}
                      onChange={(e) => setCommentToVendor(e.target.value)}
                      placeholder="Opišite problem i dajte upute izvođaču..."
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg"
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
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Odgovor na zahtjev za pojašnjenje</h3>
              <p className="text-sm text-blue-900 mb-2">
                {ticket.clarificationRequestedByUserName != null || ticket.clarificationRequestedByUserRole != null
                  ? `${ticket.clarificationRequestedByUserName ?? 'Requester'}${ticket.clarificationRequestedByUserRole != null ? ` (${INTERNAL_ROLE_LABELS[ticket.clarificationRequestedByUserRole] ?? ticket.clarificationRequestedByUserRole})` : ''} zatražio pojašnjenje. Možete vratiti prijavu samo njima.`
                  : 'Vratite prijavu ulozi koja je zatražila pojašnjenje.'}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">Komentar (opcionalno)</label>
              <textarea
                value={clarificationComment}
                onChange={(e) => setClarificationComment(e.target.value)}
                placeholder="Dodajte komentar (opcionalno)..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg mb-3"
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

          {canRequestClarification && (
            <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Zahtjev za pojašnjenje</h3>
              <p className="text-sm text-gray-700 mb-2">Pošaljite prijavu ulozi koja je bila uključena. Nakon ažuriranja, prijava se vraća Vama.</p>
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
                  <label className="block text-sm font-medium text-gray-700">Pošalji zahtjev za pojašnjenje prema</label>
                  <select
                    value={assignToRole}
                    onChange={(e) => setAssignToRole(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {(() => { const baseRoles = ticket.involvedInternalRoles ?? ['SM']; const options = baseRoles.filter((r) => r !== ticket.currentOwnerUserRole); const targetOptions = options.length > 0 ? options : ['SM']; return targetOptions.map((r) => (<option key={r} value={r}>{INTERNAL_ROLE_LABELS[r] ?? r}</option>)); })()}
                  </select>
                  <label className="block text-sm font-medium text-gray-700">Tekst pojašnjenja (obavezno)</label>
                  <textarea
                    value={clarificationComment}
                    onChange={(e) => setClarificationComment(e.target.value)}
                    placeholder="Opišite što treba pojasniti..."
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg"
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
            <section className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Odbijanje prijave</h3>
              {!showRejectForm ? (
                <Button type="button" variant="danger" onClick={() => setShowRejectForm(true)}>Odbij prijavu</Button>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-red-900">Razlog (obavezno)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Razlog odbijanja..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg"
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

          {canSubmitCost && (
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Predaja procjene troška</h3>
              <p className="text-sm text-blue-700 mb-3">Unesite procijenjeni trošak i opcijski priložite dokumentaciju. Prijava će proći kroz lanac odobrenja.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Procijenjeni iznos (EUR)</label>
                  <input
                    type="number"
                    value={costAmount}
                    onChange={(e) => setCostAmount(e.target.value)}
                    placeholder="Iznos u EUR"
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dokumenti (opcionalno)</label>
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

          {canArchive && (
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">Prijava je odobrena. Arhivirajte kada su svi radni nalozi završeni.</p>
              {archiveMutation.isError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {(archiveMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                    'Archive failed'}
                </div>
              )}
              <Button type="button" variant="secondary" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
                {archiveMutation.isPending ? 'Arhiviranje...' : 'Arhiviraj prijavu'}
              </Button>
            </section>
          )}

          {/* 11.3 Comments (internal; AMM sees all ticket comments) — newest first */}
          {ticket.comments != null && ticket.comments.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Komentari</h3>
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
              <h3 className="font-semibold text-gray-900 mb-2">Povijest</h3>
              <div className="space-y-2">
                {ticket.auditLog.map((entry) => (
                  <div key={entry.id} className="text-sm bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-600">{new Date(entry.createdAt).toLocaleString()}</span>
                    {' — '}
                    <span className="font-medium">{entry.actionType}</span>
                    {entry.prevStatus != null && (
                      <span className="text-gray-600"> ({entry.prevStatus} → {entry.newStatus})</span>
                    )}
                    <p className="mt-1 text-gray-600">
                      Izvršio {entry.actorName}{entry.actorRole != null ? ` (${entry.actorRole})` : ''}
                    </p>
                    {entry.comment != null && <p className="text-gray-600 mt-1">&quot;{entry.comment}&quot;</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
          </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white shrink-0">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full">Natrag</Button>
        </div>
      </div>
    </div>
  );
}
