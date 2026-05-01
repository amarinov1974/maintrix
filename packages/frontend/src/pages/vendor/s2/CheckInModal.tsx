/**
 * Check-In Modal (S2) — Section 14.5, 18.7, 18.9
 * SM inputs number of technicians when generating check-in QR. S2 cannot change it:
 * - Confirm: check in with that number (scan QR / paste token).
 * - Return to store: send task back to SM so they can generate a new QR with the correct number.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { Button } from '../../../components/shared';
import { QrScannerModal } from '../../../components/QrScannerModal';

interface CheckInModalProps {
  workOrderId: number;
  /** Declared by Store Manager when generating QR; S2 can only confirm or return to store */
  declaredTechCount: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CheckInModal({
  workOrderId,
  declaredTechCount,
  onClose,
  onSuccess,
}: CheckInModalProps) {
  const queryClient = useQueryClient();
  const [qrToken, setQrToken] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const checkInMutation = useMutation({
    mutationFn: workOrdersAPI.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      onSuccess?.();
      onClose();
    },
  });

  const returnMutation = useMutation({
    mutationFn: () => workOrdersAPI.returnForTechCount(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      onSuccess?.();
      onClose();
    },
  });

  const techCountValid = declaredTechCount != null && declaredTechCount >= 1;
  const canConfirm = qrToken.trim() !== '';

  const handleConfirm = () => {
    if (!canConfirm) return;
    const payload: { workOrderId: number; qrToken: string; techCountConfirmed?: number } = {
      workOrderId,
      qrToken: qrToken.trim(),
    };
    // Keep techCount optional here: when S2 UI is stale, backend can still read confirmed count from QR token.
    if (techCountValid) {
      payload.techCountConfirmed = declaredTechCount;
    }
    checkInMutation.mutate(payload);
  };

  const handleReturnToStore = () => {
    returnMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Prijava dolaska</h2>
          <p className="text-sm text-gray-600">WO #{workOrderId}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Koraci:</strong> Poslovnica je odredila broj tehničara. Možete <strong>potvrditi</strong> (skenirajte QR i prijavite se) ili <strong>vratiti poslovnici</strong> za novi QR s ispravnim brojem.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Broj tehničara (odredio voditelj poslovnice)
            </label>
            {declaredTechCount != null && declaredTechCount >= 1 ? (
              <p className="p-3 bg-gray-100 rounded-lg text-gray-800 font-medium">
                {declaredTechCount} — ne može se mijenjati ovdje. Vratite poslovnici ako je netočno.
              </p>
            ) : (
              <p className="text-sm text-amber-700">
                Poslovnica još nije generirala QR kod. Zatražite od poslovnice da generira QR kod za prijavu (s brojem tehničara).
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QR kod * (skenirajte ili unesite)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Skenirajte QR ili unesite token..."
                className="flex-1 min-w-0 p-3 border border-gray-300 rounded-lg"
                autoFocus
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
            <p className="text-xs text-gray-500 mt-1">Skenirajte QR na telefonu poslovnice ili unesite token. Istječe za 5 minuta.</p>
          </div>

          {showScanner && (
            <QrScannerModal
              title="Skeniraj QR za prijavu"
              onScan={(token) => {
                setQrToken(token);
                setShowScanner(false);
              }}
              onClose={() => setShowScanner(false)}
            />
          )}

          {(checkInMutation.isError || returnMutation.isError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                {((checkInMutation.error || returnMutation.error) as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Akcija nije uspjela'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Odustani
          </Button>
          {declaredTechCount != null && declaredTechCount >= 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleReturnToStore}
              disabled={returnMutation.isPending || checkInMutation.isPending}
            >
              {returnMutation.isPending ? 'Vraćanje...' : 'Vrati poslovnici'}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || checkInMutation.isPending}
            className="flex-1 min-w-0"
          >
            {checkInMutation.isPending ? 'Prijava u tijeku...' : 'Potvrdi prijavu dolaska'}
          </Button>
        </div>
      </div>
    </div>
  );
}
