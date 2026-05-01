/**
 * Area Manager Ticket Detail — Section 12
 * Initial review: Approve for Cost Estimation, Request Clarification, Reject.
 * Approval chain: Approve / Return (comment mandatory) / Reject.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Button, Badge } from '../../components/shared';

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

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsAPI.getById(ticketId),
  });

  const approveForEstimationMutation = useMutation({
    mutationFn: () => ticketsAPI.approveForEstimation(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      onClose();
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

  const approveCostMutation = useMutation({
    mutationFn: () =>
      ticketsAPI.approveCostEstimation(ticketId, approveComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      onClose();
    },
  });

  const returnCostMutation = useMutation({
    mutationFn: () =>
      ticketsAPI.returnCostEstimation(ticketId, returnComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
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

  if (isLoading || ticket == null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Učitavanje detalja prijave...</p>
        </div>
      </div>
    );
  }

  const isInitialReview =
    ticket.currentStatus === 'Ticket Submitted' ||
    ticket.currentStatus === 'Updated Ticket Submitted';
  const isApprovalChain =
    ticket.currentStatus === 'Cost Estimation Approval Needed';
  const isOwner =
    session?.userId != null && ticket.currentOwnerUserId === session.userId;

  const canInitialReview = isInitialReview && isOwner;
  const canReturnToRequester =
    ticket.currentStatus === 'Awaiting Ticket Creator Response' &&
    isOwner &&
    ticket.clarificationRequestedByUserId != null;
  const canApprovalChain = isApprovalChain && isOwner && ticket.costEstimation;

  const costAmount =
    ticket.costEstimation?.estimatedAmount != null
      ? Number(ticket.costEstimation.estimatedAmount)
      : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Detalji prijave</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-gray-600">Prijava #{ticket.id}</span>
                <Badge
                  variant={
                    ticket.currentStatus.includes('Approved')
                      ? 'success'
                      : 'warning'
                  }
                >
                  {ticket.currentStatus}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
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
            <h2 className="font-semibold text-gray-900 mb-2">Informacije o prijavi</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-600">Kategorija:</span>{' '}
                <span className="text-sm text-gray-900">{ticket.category}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Trenutni vlasnik:</span>{' '}
                <span className="text-sm text-gray-900">
                  {ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Originalni opis problema (zaključano):</span>
                <p className="text-sm text-gray-900 mt-1">{ticket.originalDescription ?? ticket.description}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Datum i vrijeme prijave:</span>{' '}
                <span className="text-sm text-gray-900">
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </section>

          {/* When AM is assignee (owner) in Awaiting Creator Response: only option is to return to the role that requested clarification */}
          {canReturnToRequester && (
            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900">Odgovor na zahtjev za pojašnjenje</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  {ticket.clarificationRequestedByUserName != null || ticket.clarificationRequestedByUserRole != null
                    ? `${ticket.clarificationRequestedByUserName ?? 'Requester'}${ticket.clarificationRequestedByUserRole != null ? ` (${INTERNAL_ROLE_LABELS[ticket.clarificationRequestedByUserRole] ?? ticket.clarificationRequestedByUserRole})` : ''} requested clarification. You can only return the ticket to them.`
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
              </div>
            </section>
          )}

          {/* 12.2 Initial review: Approve for Cost Estimation, Request Clarification, Reject */}
          {canInitialReview && (
            <section className="space-y-4">
              <h3 className="font-semibold text-gray-900">Početni pregled</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Odobrenje za procjenu troška</h4>
                <p className="text-sm text-green-700 mb-3">
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

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Zahtjev za pojašnjenje</h4>
                <p className="text-sm text-yellow-800 mb-2">Pošaljite prijavu ulozi koja je bila uključena. Nakon ažuriranja, prijava se vraća Vama.</p>
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
                    <label className="block text-sm font-medium text-gray-700">Pošalji zahtjev za pojašnjenje prema</label>
                    <select
                      value={assignToRole}
                      onChange={(e) => setAssignToRole(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      {((ticket.involvedInternalRoles ?? ['SM']).filter((r) => r !== ticket.currentOwnerUserRole)).map((r) => (
                        <option key={r} value={r}>{INTERNAL_ROLE_LABELS[r] ?? r}</option>
                      ))}
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

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Odbijanje prijave</h4>
                {!showRejectForm ? (
                  <>
                    <p className="text-sm text-red-700 mb-3">Odbijte prijavu uz navođenje razloga.</p>
                    <Button type="button" variant="danger" onClick={() => setShowRejectForm(true)}>
                      Odbij prijavu
                    </Button>
                  </>
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
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Odobrenje procjene troška</h3>
              <p className="text-sm text-gray-700 mb-3">
                Iznos: <strong>€{costAmount.toLocaleString()}</strong>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Komentar (opcionalno za odobrenje)</label>
                  <textarea
                    value={approveComment}
                    onChange={(e) => setApproveComment(e.target.value)}
                    placeholder="Komentar za odobrenje..."
                    rows={2}
                    className="w-full p-3 border border-gray-300 rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700">Vrati na VMO (komentar obavezan)</label>
                <textarea
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                  placeholder="Razlog vraćanja..."
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg"
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
                      className="w-full p-3 border border-gray-300 rounded-lg"
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
                    {entry.actorRole != null && (
                      <p className="mt-1 text-gray-600">Izvršio {entry.actorName} ({entry.actorRole})</p>
                    )}
                    {entry.comment != null && (
                      <p className="text-gray-600 mt-1">&quot;{entry.comment}&quot;</p>
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
    </div>
  );
}
