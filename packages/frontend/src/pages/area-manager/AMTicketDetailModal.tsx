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

interface AMTicketDetailModalProps {
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

export function AMTicketDetailModal({
  ticketId,
  onClose,
}: AMTicketDetailModalProps) {
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
    mutationFn: ({ comment, role }: { comment: string; role: string }) =>
      ticketsAPI.requestClarification(ticketId, comment, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setClarificationComment('');
      setShowClarificationForm(false);
      showSuccess('Prijava vraćena na pojašnjenje.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => ticketsAPI.reject(ticketId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      showSuccess('Prijava odbijena.');
    },
  });

  const approveCostMutation = useMutation({
    mutationFn: () =>
      ticketsAPI.approveCostEstimation(ticketId, approveComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      showSuccess('Procjena troška odobrena.');
    },
  });

  const returnCostMutation = useMutation({
    mutationFn: () =>
      ticketsAPI.returnCostEstimation(ticketId, returnComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      showSuccess('Procjena troška vraćena voditelju održavanja.');
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

  if (isLoading || ticket == null) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px' }}>
          <p>Učitavanje detalja prijave...</p>
        </div>
      </div>
    );
  }

  const isInitialReview =
    ticket.currentStatus === TicketStatus.SUBMITTED ||
    ticket.currentStatus === TicketStatus.UPDATED_SUBMITTED;
  const isApprovalChain =
    ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED;
  const isOwner =
    session?.userId != null && ticket.currentOwnerUserId === session.userId;

  const canInitialReview = isInitialReview && isOwner;
  const canReturnToRequester =
    ticket.currentStatus === TicketStatus.AWAITING_CREATOR_RESPONSE &&
    isOwner &&
    ticket.clarificationRequestedByUserId != null;
  const canApprovalChain = isApprovalChain && isOwner && ticket.costEstimation;

  const costAmount =
    ticket.costEstimation?.estimatedAmount != null
      ? Number(ticket.costEstimation.estimatedAmount)
      : null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
      {successMessage ? (
        <SuccessOverlay message={successMessage} />
      ) : (
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '760px', width: '100%', margin: '32px auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #E8E8ED', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', flexShrink: 0, borderRadius: '16px 16px 0 0' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }}>Detalji prijave</h1>
              <div className="flex items-center gap-3 mt-2">
                <span style={{ fontSize: '13px', color: '#6E6E73', marginTop: '2px' }}>Prijava #{ticket.id}</span>
                <Badge
                  variant={
                    ticket.currentStatus === TicketStatus.COST_ESTIMATION_APPROVED
                      ? 'success'
                      : 'warning'
                  }
                >
                  {formatStatus(ticket.currentStatus)}
                </Badge>
              </div>
              <p style={{ fontSize: '13px', color: '#6E6E73', marginTop: '2px' }}>
                Poslovnica: {ticket.storeName} • Kreirao: {ticket.createdByUserName}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={onClose}>
              Natrag
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <section>
            <h2 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Informacije o prijavi</h2>
            <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Kategorija</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{formatCategory(ticket.category)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Trenutni vlasnik</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>
                    {ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Datum i vrijeme prijave</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Originalni opis problema (zaključano)</p>
                <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.originalDescription ?? ticket.description}</p>
              </div>
            </div>
          </section>

          {ticket.attachments != null && ticket.attachments.filter((a) => !a.internalFlag).length > 0 && (
            <section>
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Privici</h3>
              <ul className="bg-gray-50 rounded-lg p-4 space-y-2">
                {ticket.attachments.filter((a) => !a.internalFlag).map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => ticketsAPI.downloadAttachment(a.id, a.fileName)}
                      className="text-left text-blue-600 hover:underline"
                    >
                      {a.fileName}
                    </button>
                    <span className="text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* When AM is assignee (owner) in Awaiting Creator Response: only option is to return to the role that requested clarification */}
          {canReturnToRequester && (
            <section className="space-y-4">
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Odgovor na zahtjev za pojašnjenje</h3>
              <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }}>
                <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>
                  {ticket.clarificationRequestedByUserName != null || ticket.clarificationRequestedByUserRole != null
                    ? `${ticket.clarificationRequestedByUserName ?? 'Requester'}${ticket.clarificationRequestedByUserRole != null ? ` (${INTERNAL_ROLE_LABELS[ticket.clarificationRequestedByUserRole] ?? ticket.clarificationRequestedByUserRole})` : ''} requested clarification. You can only return the ticket to them.`
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
              </div>
            </section>
          )}

          {/* 12.2 Initial review: Approve for Cost Estimation, Request Clarification, Reject */}
          {canInitialReview && (
            <section className="space-y-4">
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Početni pregled</h3>
              <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #34C759' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Odobrenje za procjenu troška</h4>
                <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>
                  Šalje prijavu Voditelju održavanja na procjenu troška.
                </p>
                <Button
                  type="button"
                  onClick={() => approveForEstimationMutation.mutate()}
                  disabled={approveForEstimationMutation.isPending}
                >
                  {approveForEstimationMutation.isPending ? 'Odobravanje...' : 'Odobri za procjenu troška'}
                </Button>
              </div>

              <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF9500' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Zahtjev za pojašnjenje</h4>
                <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>Pošaljite prijavu ulozi koja je bila uključena. Nakon ažuriranja, prijava se vraća Vama.</p>
                {!showClarificationForm ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { const options = (ticket.involvedInternalRoles ?? ['SM']).filter((r) => r !== ticket.currentOwnerUserRole); setAssignToRole(options[0] ?? 'SM'); setShowClarificationForm(true); }}
                  >
                    Zatraži pojašnjenje
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }}>Pošalji zahtjev za pojašnjenje prema</label>
                    <select
                      value={assignToRole}
                      onChange={(e) => setAssignToRole(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                    >
                      {((ticket.involvedInternalRoles ?? ['SM']).filter((r) => r !== ticket.currentOwnerUserRole)).map((r) => (
                        <option key={r} value={r}>{INTERNAL_ROLE_LABELS[r] ?? r}</option>
                      ))}
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
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowClarificationForm(false);
                          setClarificationComment('');
                        }}
                      >
                        Odustani
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF3B30' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Odbijanje prijave</h4>
                {!showRejectForm ? (
                  <>
                    <p className="text-sm text-red-700 mb-3">Odbijte prijavu uz navođenje razloga.</p>
                    <Button type="button" variant="danger" onClick={() => setShowRejectForm(true)}>
                      Odbij prijavu
                    </Button>
                  </>
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
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason('');
                        }}
                      >
                        Odustani
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 12.5 Approval chain: Approve / Return (comment mandatory) / Reject */}
          {canApprovalChain && costAmount != null && (
            <section style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F', marginBottom: '6px' }}>Odobrenje procjene troška</h3>
              <p className="text-sm text-gray-700 mb-3">
                Iznos: <strong>€{costAmount.toLocaleString()}</strong>
              </p>
              <div className="space-y-3">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }}>Komentar (opcionalno za odobrenje)</label>
                  <textarea
                    value={approveComment}
                    onChange={(e) => setApproveComment(e.target.value)}
                    placeholder="Komentar za odobrenje..."
                    rows={2}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => approveCostMutation.mutate()}
                  disabled={approveCostMutation.isPending}
                >
                  {approveCostMutation.isPending ? 'Odobravanje...' : 'Odobri'}
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73' }}>Vrati na VMO (komentar obavezan)</label>
                <textarea
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                  placeholder="Razlog vraćanja..."
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => returnCostMutation.mutate()}
                  disabled={!returnComment.trim() || returnCostMutation.isPending}
                >
                  {returnCostMutation.isPending ? 'Vraćanje...' : 'Vrati na VMO'}
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setShowRejectForm(true)}
                >
                  Odbij
                </Button>
                {showRejectForm && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Razlog odbijanja..."
                      rows={2}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => rejectMutation.mutate(rejectReason)}
                        disabled={!rejectReason.trim() || rejectMutation.isPending}
                      >
                        Potvrdi odbijanje
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setShowRejectForm(false)}>
                        Odustani
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {ticket.comments != null && ticket.comments.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Komentari</h3>
              <div className="space-y-3">
                {[...ticket.comments]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900">{c.authorUserName}</span>
                      <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                    {entry.actorRole != null && (
                      <p style={{ fontSize: '13px', color: '#1D1D1F', fontWeight: 500, marginTop: '4px' }}>Izvršio {entry.actorName} ({entry.actorRole})</p>
                    )}
                    {entry.comment != null && (
                      <p style={{ fontSize: '13px', color: '#3C3C43', marginTop: '4px' }}>&quot;{entry.comment}&quot;</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(approveForEstimationMutation.isError ||
            clarifyMutation.isError ||
            rejectMutation.isError ||
            approveCostMutation.isError ||
            returnCostMutation.isError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Greška:{' '}
                {(approveForEstimationMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  (clarifyMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  (rejectMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  (approveCostMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  (returnCostMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Akcija nije uspjela'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full">
            Natrag
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}
