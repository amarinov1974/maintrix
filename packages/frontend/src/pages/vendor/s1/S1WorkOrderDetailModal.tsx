/**
 * S1 Work Order Detail — Section 13.6–13.10
 * Read-only block; when Owner=S1 and Status=Awaiting Service Provider: Assign Technician, Return for Clarification, Reject.
 * Opening WO triggers read acknowledgment (recordOpened).
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { useSession } from '../../../contexts/SessionContext';
import { Button, Badge } from '../../../components/shared';
import { WorkOrderStatus } from '../../../types/statuses';
import { AssignTechnicianModal } from './AssignTechnicianModal';
import { formatCategory, formatHistoryAction, formatStatus } from '../../../utils/formatters';

interface S1WorkOrderDetailModalProps {
  workOrderId: number;
  onClose: () => void;
}

export function S1WorkOrderDetailModal({
  workOrderId,
  onClose,
}: S1WorkOrderDetailModalProps) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: wo, isLoading } = useQuery({
    queryKey: ['work-order', workOrderId],
    queryFn: () => workOrdersAPI.getById(workOrderId),
    enabled: workOrderId > 0,
  });

  useEffect(() => {
    if (wo != null && workOrderId > 0) {
      workOrdersAPI.recordOpened(workOrderId).catch(() => {});
    }
  }, [workOrderId, wo]);

  const returnMutation = useMutation({
    mutationFn: () =>
      workOrdersAPI.returnForClarification(workOrderId, returnComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => workOrdersAPI.reject(workOrderId, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      onClose();
    },
  });

  const isOwner = session?.userId != null && wo?.currentOwnerId === session.userId;
  const isAwaitingProvider = wo?.currentStatus === WorkOrderStatus.CREATED;
  const canAct = isOwner && isAwaitingProvider;

  if (isLoading || wo == null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Učitavanje radnog naloga...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-2xl w-full my-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Detalji radnog naloga</h1>
                <p className="text-sm text-gray-600 mt-1">
                  WO #{wo.id} • Prijava #{wo.ticketId}
                </p>
                <Badge
                  variant={wo.urgent ? 'danger' : 'secondary'}
                  className="mt-2"
                >
                  {wo.urgent ? 'Hitno' : 'Nije hitno'}
                </Badge>
              </div>
              <Button type="button" variant="secondary" onClick={onClose}>
                Natrag
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <section>
              <h2 className="font-semibold text-gray-900 mb-2">Detalji</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Poslovnica:</span>{' '}
                  {wo.storeName ?? '—'}
                </div>
                {wo.storeAddress != null && wo.storeAddress !== '' && (
                  <div>
                    <span className="text-gray-600">Adresa:</span>{' '}
                    {wo.storeAddress}
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Kategorija:</span>{' '}
                  {wo.category ? formatCategory(wo.category) : '—'}
                </div>
                <div>
                  <span className="text-gray-600">Komentar VMO:</span>{' '}
                  {wo.commentToVendor ?? '—'}
                </div>
                {wo.assetDescription != null && wo.assetDescription !== '' && (
                  <div>
                    <span className="text-gray-600">Oprema:</span>{' '}
                    {wo.assetDescription}
                  </div>
                )}
                {wo.attachments != null && wo.attachments.length > 0 && (
                  <div>
                    <span className="text-gray-600">Privici:</span>
                    <ul className="list-disc list-inside mt-1">
                      {wo.attachments.map((a) => (
                        <li key={a.id}>{a.fileName}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Trenutni status:</span>{' '}
                  <strong>{formatStatus(wo.currentStatus)}</strong>
                </div>
                {wo.assignedTechnicianId != null && (
                  <div>
                    <span className="text-gray-600">Dodijeljeno (vlasnik):</span>{' '}
                    <strong>{wo.assignedTechnicianName ?? 'Tehničar'}</strong>
                  </div>
                )}
              </div>
            </section>

            {canAct && (
              <section className="space-y-4 border-t pt-4">
                <h2 className="font-semibold text-gray-900">Akcije</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <Button
                    type="button"
                    onClick={() => setShowAssign(true)}
                    className="w-full"
                  >
                    Dodijeli tehničara
                  </Button>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  {!showReturnForm ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowReturnForm(true)}
                      className="w-full"
                    >
                      Vrati na pojašnjenje
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Komentar (obavezan)
                      </label>
                      <textarea
                        value={returnComment}
                        onChange={(e) => setReturnComment(e.target.value)}
                        placeholder="Opišite što treba pojasniti..."
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => returnMutation.mutate()}
                          disabled={
                            !returnComment.trim() || returnMutation.isPending
                          }
                        >
                          {returnMutation.isPending
                            ? 'Slanje...'
                            : 'Potvrdi povrat'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setShowReturnForm(false);
                            setReturnComment('');
                          }}
                        >
                          Odustani
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  {!showRejectForm ? (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setShowRejectForm(true)}
                      className="w-full"
                    >
                      Odbij radni nalog
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-red-900">
                        Razlog (obavezno)
                      </label>
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
                          onClick={() => rejectMutation.mutate()}
                          disabled={
                            !rejectReason.trim() || rejectMutation.isPending
                          }
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
                        >
                          Odustani
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* History — work order workflow (statuses + comments) */}
            {wo.auditLog != null && wo.auditLog.length > 0 && (
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">Povijest</h3>
                <div className="space-y-2">
                  {wo.auditLog.map((entry) => (
                    <div key={entry.id} className="text-sm bg-gray-50 rounded-lg p-3">
                      <span className="text-gray-600">{new Date(entry.createdAt).toLocaleString()}</span>
                      {' — '}
                      <span className="font-medium">{formatHistoryAction(entry.actionType)}</span>
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

            {(returnMutation.isError || rejectMutation.isError) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  {(returnMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                    (rejectMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                    'Radnja nije uspjela'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAssign && (
        <AssignTechnicianModal
          workOrderId={workOrderId}
          onClose={() => {
            setShowAssign(false);
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
            onClose();
          }}
        />
      )}
    </>
  );
}
