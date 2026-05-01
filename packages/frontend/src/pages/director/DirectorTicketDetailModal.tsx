/**
 * Director Ticket Detail Modal
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import type { ApprovalRecord } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Button, Badge } from '../../components/shared';
import { formatCategory } from '../../utils/formatters';

interface DirectorTicketDetailModalProps {
  ticketId: number;
  onClose: () => void;
}

function getThresholdInfo(amount: number) {
  if (amount <= 1000) {
    return { chain: 'Samo AM', color: 'text-green-700' };
  }
  if (amount <= 3000) {
    return { chain: 'AM → D → C2', color: 'text-yellow-700' };
  }
  return { chain: 'AM → D → C2 → BOD', color: 'text-red-700' };
}

export function DirectorTicketDetailModal({
  ticketId,
  onClose,
}: DirectorTicketDetailModalProps) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsAPI.getById(ticketId),
  });

  const costEstimation = ticket?.costEstimation;

  const approveMutation = useMutation({
    mutationFn: () => ticketsAPI.approveCostEstimation(ticketId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
    },
  });

  const returnMutation = useMutation({
    mutationFn: () =>
      ticketsAPI.returnCostEstimation(ticketId, returnComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => ticketsAPI.reject(ticketId, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
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

  // Only the current owner can perform actions (approve / return / reject)
  const isCurrentOwner =
    session?.userId != null && ticket.currentOwnerUserId === session.userId;
  const canApprove =
    ticket.currentStatus === 'Cost Estimation Approval Needed' && isCurrentOwner;

  const amount =
    costEstimation != null
      ? typeof costEstimation.estimatedAmount === 'number'
        ? costEstimation.estimatedAmount
        : parseFloat(String(costEstimation.estimatedAmount))
      : 0;
  const thresholdInfo = costEstimation ? getThresholdInfo(amount) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Prijava #{ticket.id}
                </h2>
                <Badge variant="warning">Čeka odobrenje troška</Badge>
              </div>
              <p className="text-sm text-gray-600">
                Poslovnica: {ticket.storeName} • Kreirao:{' '}
                {ticket.createdByUserName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="Zatvori"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Detalji prijave
              </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Kategorija:
                </span>{' '}
                <span className="text-sm text-gray-900">{formatCategory(ticket.category)}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Trenutni vlasnik:
                </span>{' '}
                <span className="text-sm text-gray-900">
                  {ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Originalni opis problema (zaključano):
                </span>
                <p className="text-sm text-gray-900 mt-1">
                  {ticket.originalDescription ?? ticket.description}
                </p>
              </div>
            </div>
          </div>

          {costEstimation != null && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Procjena troška
              </h3>
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Procijenjeni iznos:
                  </span>
                  <span className="text-3xl font-bold text-blue-900">
                    €{amount.toLocaleString()}
                  </span>
                </div>
                {thresholdInfo != null && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <span className="text-sm font-medium text-gray-600">
                      Lanac odobrenja:
                    </span>{' '}
                    <span
                      className={`text-sm font-semibold ${thresholdInfo.color}`}
                    >
                      {thresholdInfo.chain}
                    </span>
                  </div>
                )}
                <div className="mt-2">
                  <span className="text-sm font-medium text-gray-600">
                    Predao:
                  </span>{' '}
                  <span className="text-sm text-gray-900">
                    {costEstimation.createdByUserName}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-sm font-medium text-gray-600">
                    Predano:
                  </span>{' '}
                  <span className="text-sm text-gray-900">
                    {new Date(
                      costEstimation.createdAt
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {ticket.currentStatus === 'Cost Estimation Approval Needed' && !isCurrentOwner && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                Niste trenutni vlasnik ove prijave. Samo trenutni vlasnik može odobriti, vratiti na reviziju ili odbiti. Ovaj prikaz je samo za pregled.
              </p>
            </div>
          )}

          {canApprove && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">
                  Odobrenje procjene troška
                </h4>
                <p className="text-sm text-green-700 mb-3">
                  Odobravanje će eskalirati sljedećem odobravatelju ili, ako
                  ste zadnji u lancu, vratit će prijavu VMO-u za kreiranje
                  radnog naloga.
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Komentar (opcionalno)..."
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg mb-2"
                />
                <Button
                  type="button"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Odobravanje...' : 'Odobri'}
                </Button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                {!showReturnForm ? (
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">
                      Povrat na VMO
                    </h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Ako procjena troška treba reviziju, možete je vratiti
                      Voditelju održavanja.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setShowReturnForm(true)}
                      size="sm"
                      variant="secondary"
                    >
                      Vrati na reviziju
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-medium text-yellow-900">
                      Povrat na VMO
                    </h4>
                    <textarea
                      value={returnComment}
                      onChange={(e) =>
                        setReturnComment(e.target.value)
                      }
                      placeholder="Opišite što treba revidirati (obavezno)..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => returnMutation.mutate()}
                        disabled={
                          !returnComment.trim() ||
                          returnMutation.isPending
                        }
                        size="sm"
                      >
                        {returnMutation.isPending
                          ? 'Vraćanje...'
                          : 'Potvrdi povrat'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowReturnForm(false);
                          setReturnComment('');
                        }}
                        size="sm"
                      >
                        Odustani
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                {!showRejectForm ? (
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">
                      Odbijanje prijave
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      Ako procjena troška nije prihvatljiva, možete odbiti
                      cijelu prijavu.
                    </p>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setShowRejectForm(true)}
                      size="sm"
                    >
                      Odbij prijavu
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-medium text-red-900">
                      Odbijanje prijave
                    </h4>
                    <textarea
                      value={rejectReason}
                      onChange={(e) =>
                        setRejectReason(e.target.value)
                      }
                      placeholder="Razlog odbijanja (obavezno)..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() =>
                          rejectMutation.mutate()
                        }
                        disabled={
                          !rejectReason.trim() ||
                          rejectMutation.isPending
                        }
                        size="sm"
                      >
                        {rejectMutation.isPending
                          ? 'Odbijanje...'
                          : 'Potvrdi odbijanje'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason('');
                        }}
                        size="sm"
                      >
                        Odustani
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {ticket.approvalRecords != null &&
            ticket.approvalRecords.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Povijest odobrenja
                </h3>
                <div className="space-y-2">
                  {ticket.approvalRecords.map((approval: ApprovalRecord) => (
                    <div
                      key={approval.id}
                      className="bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {approval.approverUserName}
                        </span>
                        <span className="text-sm text-gray-600">
                          ({approval.role})
                        </span>
                        <Badge
                          variant={
                            approval.decision === 'APPROVED'
                              ? 'success'
                              : approval.decision === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {approval.decision === 'APPROVED' ? 'ODOBRENO' : approval.decision === 'REJECTED' ? 'ODBIJENO' : approval.decision}
                        </Badge>
                      </div>
                      {approval.comment != null && (
                        <p className="text-sm text-gray-600 mt-1">
                          {approval.comment}
                        </p>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(
                          approval.createdAt
                        ).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {ticket.comments != null && ticket.comments.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Komentari</h3>
              <div className="space-y-3">
                {[...ticket.comments]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900">
                        {c.authorUserName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approveMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Greška:{' '}
                {(approveMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Odobravanje nije uspjelo'}
              </p>
            </div>
          )}

          {returnMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Greška:{' '}
                {(returnMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Vraćanje nije uspjelo'}
              </p>
            </div>
          )}

          {rejectMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Greška:{' '}
                {(rejectMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Odbijanje nije uspjelo'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-full"
          >
            Zatvori
          </Button>
        </div>
      </div>
    </div>
  );
}
