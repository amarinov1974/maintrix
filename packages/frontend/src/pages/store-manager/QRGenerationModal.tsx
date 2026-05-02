/**
 * QR Generation Modal — Store Manager (Section 18)
 * Select WO (if multiple), enter declared technician count, generate QR.
 * Scan type derived from WO status: Accepted → check-in, Service In Progress → checkout.
 * QR auto-refreshes every 5 minutes (previous QR invalidated).
 */

import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { qrAPI } from '../../api/qr';
import type { WorkOrder } from '../../api/work-orders';
import { Button } from '../../components/shared';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (Section 18.5)

interface QRGenerationModalProps {
  ticketId: number;
  workOrders: WorkOrder[];
  onClose: () => void;
}

export function QRGenerationModal({
  ticketId,
  workOrders,
  onClose,
}: QRGenerationModalProps) {
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<number | null>(
    workOrders.length === 1 ? workOrders[0].id : null
  );
  const [techCount, setTechCount] = useState<string>('');
  const [generated, setGenerated] = useState<{
    qrToken: string;
    expirationTs: string;
    workOrderId: number;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyToken = () => {
    if (generated?.qrToken == null) return;
    navigator.clipboard.writeText(generated.qrToken).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }).catch(() => {});
  };

  const generateMutation = useMutation({
    mutationFn: qrAPI.generate,
    onSuccess: (data, variables) => {
      setGenerated({
        qrToken: data.qrToken,
        expirationTs: data.expirationTs,
        workOrderId: variables.workOrderId,
      });
    },
  });

  const wo = selectedWorkOrderId
    ? workOrders.find((w) => w.id === selectedWorkOrderId)
    : null;
  const isCheckout = wo?.currentStatus === 'Service In Progress';
  const techCountNum = parseInt(techCount, 10);
  const isCheckIn = !isCheckout; // Service Visit Scheduled or Follow-Up Visit Requested
  const techCountOk = isCheckout || (!isNaN(techCountNum) && techCountNum >= 1);
  const canGenerate =
    wo != null &&
    techCountOk &&
    !generateMutation.isPending;

  const handleGenerate = () => {
    if (!canGenerate || !wo) return;
    generateMutation.mutate({
      workOrderId: wo.id,
      ...(isCheckIn ? { techCountConfirmed: techCountNum } : {}),
    });
  };

  // Auto-refresh QR every 5 minutes when a QR is displayed (Section 18.5)
  useEffect(() => {
    if (generated == null || !wo) return;
    const isCheckoutWo = wo.currentStatus === 'Service In Progress';
    const isCheckInWo = wo.currentStatus === 'Service Visit Scheduled' || wo.currentStatus === 'Follow-Up Visit Requested';
    if (!isCheckoutWo && !isCheckInWo) return;
    if (isCheckInWo && (isNaN(techCountNum) || techCountNum < 1)) return;
    const workOrderId = wo.id;
    const count = techCountNum;
    refreshTimerRef.current = setTimeout(() => {
      generateMutation.mutate(
        isCheckoutWo ? { workOrderId } : { workOrderId, techCountConfirmed: count },
        {
          onSuccess: (data) => {
            setGenerated({
              qrToken: data.qrToken,
              expirationTs: data.expirationTs,
              workOrderId,
            });
          },
        }
      );
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [generated?.qrToken, wo?.id, techCountNum]);

  const handleClose = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setGenerated(null);
    setTechCount('');
    setSelectedWorkOrderId(workOrders.length === 1 ? workOrders[0].id : null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Generiraj QR — Prijava #{ticketId}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {workOrders.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Izvođač (radni nalog)
              </label>
              <select
                value={selectedWorkOrderId ?? ''}
                onChange={(e) => {
                  setSelectedWorkOrderId(parseInt(e.target.value, 10));
                  setGenerated(null);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">— Odaberite izvođača —</option>
                {workOrders.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.vendorCompanyName} — WO #{w.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {wo?.currentStatus !== 'Service In Progress' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Broj tehničara koji su stigli *
              </label>
              <input
                type="number"
                min={1}
                value={techCount}
                onChange={(e) => setTechCount(e.target.value)}
                placeholder="npr. 2"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          )}

          {generated == null ? (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              {generateMutation.isPending ? 'Generiranje...' : 'Generiraj QR kod'}
            </Button>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-green-700 font-medium">
                {wo?.currentStatus === 'Service In Progress'
                  ? 'QR za odjavu s posla. Osvježava se svakih 5 minuta; nevažeći nakon upotrebe.'
                  : 'QR za prijavu dolaska. Osvježava se svakih 5 minuta; nevažeći nakon upotrebe.'}
              </p>
              <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                <QRCodeSVG value={generated.qrToken} size={200} level="M" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tekstualna verzija (kopiraj i zalijepi)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generated.qrToken}
                    className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyToken}
                  >
                    {copyFeedback ? 'Kopirano!' : 'Kopiraj'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tehničar može skenirati QR ili ručno unijeti token.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Istječe:{' '}
                {new Date(generated.expirationTs).toLocaleString()}
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGenerated(null)}
              >
                Generiraj novi
              </Button>
            </div>
          )}

          {generateMutation.isError && (
            <p className="text-sm text-red-600">
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : 'Generiranje QR koda nije uspjelo'}
            </p>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={handleClose} className="w-full">
            Zatvori
          </Button>
        </div>
      </div>
    </div>
  );
}
