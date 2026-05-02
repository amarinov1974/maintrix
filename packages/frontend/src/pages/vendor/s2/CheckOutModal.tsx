/**
 * Check-Out Modal (S2) — Section 14.9–14.10, 18.8, 18.9
 * 1. Select outcome (mandatory); 2. Comment if required; 3. Scan/paste QR.
 * Saves form state as draft when closing without submit.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI, type WorkReportRow } from '../../../api/work-orders';
import { Button } from '../../../components/shared';
import { QrScannerModal } from '../../../components/QrScannerModal';
import { getS2WODraft, setS2WODraft } from './s2Draft';

interface CheckOutModalProps {
  workOrderId: number;
  workReport: WorkReportRow[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function CheckOutModal({
  workOrderId,
  workReport,
  onClose,
  onSuccess,
}: CheckOutModalProps) {
  const queryClient = useQueryClient();
  const draft = getS2WODraft(workOrderId);
  const [qrToken, setQrToken] = useState(draft?.qrToken ?? '');
  const [showScanner, setShowScanner] = useState(false);
  const [outcome, setOutcome] = useState<
    'FIXED' | 'FOLLOW_UP' | 'NEW_WO_NEEDED' | 'UNSUCCESSFUL'
  >(draft?.outcome ?? 'FIXED');
  const [comment, setComment] = useState(draft?.comment ?? '');

  const saveDraftOnClose = () => {
    setS2WODraft(workOrderId, { outcome, comment, qrToken });
    onClose();
  };

  const checkOutMutation = useMutation({
    mutationFn: workOrdersAPI.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      onSuccess?.();
      onClose();
    },
  });

  const commentRequired = outcome !== 'FIXED';
  const canSubmit =
    qrToken.trim() !== '' &&
    (!commentRequired || comment.trim() !== '') &&
    workReport.length > 0 &&
    workReport.every(
      (r) =>
        String(r.description).trim() !== '' &&
        String(r.unit).trim() !== '' &&
        String(r.quantity).trim() !== ''
    );

  const handleCheckOut = () => {
    if (!canSubmit) return;
    checkOutMutation.mutate({
      workOrderId,
      qrToken: qrToken.trim(),
      outcome,
      comment: comment.trim() || undefined,
      workReport: workReport.filter(
        (r) =>
          String(r.description).trim() !== '' &&
          String(r.unit).trim() !== '' &&
          String(r.quantity).trim() !== ''
      ),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-lg w-full my-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Odjava s posla</h2>
          <p className="text-sm text-gray-600">WO #{workOrderId}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ishod *
            </label>
            <select
              value={outcome}
              onChange={(e) =>
                setOutcome(
                  e.target.value as
                    | 'FIXED'
                    | 'FOLLOW_UP'
                    | 'NEW_WO_NEEDED'
                    | 'UNSUCCESSFUL'
                )
              }
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="FIXED">Problem riješen</option>
              <option value="FOLLOW_UP">Potrebna dodatna posjeta</option>
              <option value="NEW_WO_NEEDED">Potreban novi radni nalog</option>
              <option value="UNSUCCESSFUL">Popravak neuspješan</option>
            </select>
          </div>

          {commentRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Komentar * (obavezan za ovaj ishod)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Opišite..."
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QR kod * (skenirajte ili unesite)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Skenirajte QR za odjavu ili unesite token..."
                className="flex-1 min-w-0 p-3 border border-gray-300 rounded-lg"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowScanner(true)}
                title="Otvorite kameru za skeniranje QR koda"
              >
                Skeniraj
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Skenirajte QR na telefonu poslovnice ili unesite token.</p>
          </div>

          {showScanner && (
            <QrScannerModal
              title="Skeniraj QR za odjavu"
              onScan={(token) => {
                setQrToken(token);
                setShowScanner(false);
              }}
              onClose={() => setShowScanner(false)}
            />
          )}

          {checkOutMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                {(checkOutMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Odjava neuspješna'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <Button type="button" variant="secondary" onClick={saveDraftOnClose}>
            Odustani
          </Button>
          <Button
            type="button"
            onClick={handleCheckOut}
            disabled={!canSubmit || checkOutMutation.isPending}
            className="flex-1"
          >
            {checkOutMutation.isPending ? 'Odjava u tijeku...' : 'Odjava s posla'}
          </Button>
        </div>
      </div>
    </div>
  );
}
