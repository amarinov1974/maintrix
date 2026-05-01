/**
 * S2 Work Order Detail — Section 14.4–14.10
 * Before check-in: read-only + Scan QR Code.
 * Service In Progress: read-only + work report table (Complete/Edit) + checkout (outcome, comment, Scan QR).
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI, type WorkReportRow } from '../../../api/work-orders';
import { useSession } from '../../../contexts/SessionContext';
import { Button, Badge } from '../../../components/shared';
import { WorkOrderStatus } from '../../../types/statuses';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import { getS2WODraft, setS2WODraft, clearS2WODraft } from './s2Draft';
import { formatCategory, formatHistoryAction } from '../../../utils/formatters';

interface S2WorkOrderDetailModalProps {
  workOrderId: number;
  onClose: () => void;
}

const INITIAL_ROW: WorkReportRow = { description: '', unit: '', quantity: 1 };

export function S2WorkOrderDetailModal({
  workOrderId,
  onClose,
}: S2WorkOrderDetailModalProps) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [workReport, setWorkReport] = useState<WorkReportRow[]>([]);
  const [reportCompleted, setReportCompleted] = useState(false);

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
    if (workOrderId <= 0 || wo == null) return;
    if (isFollowUpVisit) return; // follow-up: don't pre-fill work report from draft
    const draft = getS2WODraft(workOrderId);
    if (draft?.workReport != null && Array.isArray(draft.workReport) && draft.workReport.length > 0) {
      setWorkReport(draft.workReport);
    }
    if (draft?.reportCompleted === true) {
      setReportCompleted(true);
    }
  }, [workOrderId, wo?.id, isFollowUpVisit]);

  const saveDraftAndClose = () => {
    const reportToSave = workReport.length ? workReport : (wo?.workReport != null && wo.workReport.length > 0
      ? wo.workReport.map((r) => ({ description: r.description, unit: r.unit, quantity: r.quantity }))
      : [INITIAL_ROW]);
    setS2WODraft(workOrderId, { workReport: reportToSave, reportCompleted });
    onClose();
  };

  const effectiveReport = useMemo(() => {
    if (workReport.length > 0) return workReport;
    // Follow-up visit: don't show previous visit's work report — same as first visit (empty)
    if (isFollowUpVisit) return [INITIAL_ROW];
    if (wo?.workReport != null && wo.workReport.length > 0) {
      return wo.workReport.map((r) => ({
        description: r.description,
        unit: r.unit,
        quantity: r.quantity,
      }));
    }
    return [INITIAL_ROW];
  }, [workReport, wo?.workReport, isFollowUpVisit]);

  const addRow = () => {
    if (reportCompleted) return;
    setWorkReport((prev) => (prev.length ? [...prev, { ...INITIAL_ROW }] : [...effectiveReport, { ...INITIAL_ROW }]));
  };

  const updateRow = (index: number, field: keyof WorkReportRow, value: string | number) => {
    if (reportCompleted) return;
    const base = workReport.length ? workReport : effectiveReport;
    const next = [...base];
    next[index] = { ...next[index], [field]: value };
    setWorkReport(next);
  };

  const canCompleteReport = effectiveReport.every(
    (r) =>
      String(r.description).trim() !== '' &&
      String(r.unit).trim() !== '' &&
      Number(r.quantity) >= 0 &&
      !Number.isNaN(Number(r.quantity))
  );

  const markReportComplete = () => {
    if (!canCompleteReport) return;
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
    window.alert('Your arrival on site has been registered. You can now start work.');
    onClose();
  };

  const onCheckOutSuccess = () => {
    clearS2WODraft(workOrderId);
    queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
    setShowCheckOut(false);
    onClose();
  };

  if (isLoading || wo == null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading work order...</p>
        </div>
      </div>
    );
  }

  const reportToSend = workReport.length ? workReport : effectiveReport;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-2xl w-full my-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Work Order Detail</h1>
                <p className="text-sm text-gray-600 mt-1">
                  WO #{wo.id} • Ticket #{wo.ticketId}
                </p>
                <Badge variant={wo.urgent ? 'danger' : 'secondary'} className="mt-2">
                  {wo.urgent ? 'Urgent' : 'Non-Urgent'}
                </Badge>
              </div>
              <Button type="button" variant="secondary" onClick={saveDraftAndClose}>
                Back
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <section>
              <h2 className="font-semibold text-gray-900 mb-2">Details</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div><span className="text-gray-600">Store:</span> {wo.storeName ?? '—'}</div>
                {wo.storeAddress != null && wo.storeAddress !== '' && (
                  <div><span className="text-gray-600">Address:</span> {wo.storeAddress}</div>
                )}
                <div><span className="text-gray-600">Category:</span> {wo.category ? formatCategory(wo.category) : '—'}</div>
                <div><span className="text-gray-600">AMM comment:</span> {wo.commentToVendor ?? '—'}</div>
                {wo.assetDescription != null && wo.assetDescription !== '' && (
                  <div><span className="text-gray-600">Asset:</span> {wo.assetDescription}</div>
                )}
                {wo.attachments != null && wo.attachments.length > 0 && (
                  <div>
                    <span className="text-gray-600">Attachments:</span>
                    <ul className="list-disc list-inside mt-1">
                      {wo.attachments.map((a) => (
                        <li key={a.id}>{a.fileName}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div><span className="text-gray-600">Status:</span> <strong>{wo.currentStatus}</strong></div>
              </div>
            </section>

            {isOwner && isAssigned && (
              <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Check in on site</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Scan the QR code at the store to register check-in. Number of technicians is confirmed when the store generated the QR.
                </p>
                <Button type="button" onClick={() => setShowCheckIn(true)}>
                  Scan QR Code
                </Button>
              </section>
            )}

            {isOwner && inProgress && (
              <>
                <section className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Work Report</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Add rows; all fields required. Complete the report before checkout.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-2">#</th>
                          <th className="text-left p-2">Description *</th>
                          <th className="text-left p-2">Unit *</th>
                          <th className="text-left p-2">Quantity *</th>
                        </tr>
                      </thead>
                      <tbody>
                        {effectiveReport.map((row, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => updateRow(index, 'description', e.target.value)}
                                placeholder="Description"
                                disabled={reportCompleted}
                                className="w-full p-2 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={row.unit}
                                onChange={(e) => updateRow(index, 'unit', e.target.value)}
                                placeholder="e.g. hours, units"
                                disabled={reportCompleted}
                                className="w-full p-2 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={row.quantity}
                                onChange={(e) => updateRow(index, 'quantity', parseFloat(e.target.value) || 0)}
                                disabled={reportCompleted}
                                className="w-24 p-2 border border-gray-300 rounded"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!reportCompleted && (
                    <Button type="button" size="sm" variant="secondary" onClick={addRow} className="mt-2">
                      + Add Row
                    </Button>
                  )}
                  <div className="mt-3">
                    {reportCompleted ? (
                      <Button type="button" variant="secondary" size="sm" onClick={editReport}>
                        Edit Work Report
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={markReportComplete}
                        disabled={!canCompleteReport}
                      >
                        Complete Work Report
                      </Button>
                    )}
                  </div>
                </section>

                <section className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">Check out</h3>
                  <p className="text-sm text-green-700 mb-3">
                    Select outcome, add comment if required, then scan the checkout QR code. Report must be completed first.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setShowCheckOut(true)}
                    disabled={!reportCompleted}
                  >
                    Check Out (Scan QR)
                  </Button>
                </section>
              </>
            )}

            {/* History — work order workflow (statuses + comments) */}
            {wo.auditLog != null && wo.auditLog.length > 0 && (
              <section>
                <h3 className="font-semibold text-gray-900 mb-2">History</h3>
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
                        Performed by {entry.actorName}{entry.actorRole != null ? ` (${entry.actorRole})` : ''}
                      </p>
                      {entry.comment != null && <p className="text-gray-600 mt-1">&quot;{entry.comment}&quot;</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {showCheckIn && (
        <CheckInModal
          workOrderId={workOrderId}
          declaredTechCount={wo.declaredTechCount ?? null}
          onClose={() => setShowCheckIn(false)}
          onSuccess={onCheckInSuccess}
        />
      )}
      {showCheckOut && (
        <CheckOutModal
          workOrderId={workOrderId}
          workReport={reportToSend}
          onClose={() => setShowCheckOut(false)}
          onSuccess={onCheckOutSuccess}
        />
      )}
    </>
  );
}
