/**
 * Store Manager — QR Generation Required
 * List of tickets that need QR (work orders with technician assigned).
 * Each ticket preview shows: service company, WO number, S2 name. Generate QR opens modal.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workOrdersAPI } from '../../api/work-orders';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Card, Badge } from '../../components/shared';
import { QRGenerationModal } from './QRGenerationModal';
import { WorkOrderStatus } from '../../types/statuses';
import type { WorkOrder } from '../../api/work-orders';

/** Croatian plural: radni nalog / radna naloga / radnih naloga */
function formatRadnihNaloga(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} radni nalog`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} radna naloga`;
  return `${n} radnih naloga`;
}

export function SMQRRequiredPage() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [qrMode, setQrMode] = useState<'checkin' | 'checkout' | null>(null);

  // Include both: WOs still with S2 (VENDOR) and WOs returned to SM for correct tech count (INTERNAL)
  const { data: qrWorkOrdersAccepted = [] } = useQuery({
    queryKey: [
      'work-orders',
      'store-manager',
      'qr-accepted',
      session?.storeId,
    ],
    queryFn: () =>
      workOrdersAPI.list({
        storeId: session!.storeId,
        currentStatus: 'ACCEPTED_TECHNICIAN_ASSIGNED',
      }),
    enabled: session?.storeId != null,
  });

  const { data: qrWorkOrdersInProgress = [] } = useQuery({
    queryKey: [
      'work-orders',
      'store-manager',
      'qr-in-progress',
      session?.storeId,
    ],
    queryFn: () =>
      workOrdersAPI.list({
        storeId: session!.storeId,
        currentStatus: 'SERVICE_IN_PROGRESS',
      }),
    enabled: session?.storeId != null,
  });

  const { data: qrWorkOrdersFollowUp = [] } = useQuery({
    queryKey: [
      'work-orders',
      'store-manager',
      'qr-follow-up',
      session?.storeId,
    ],
    queryFn: () =>
      workOrdersAPI.list({
        storeId: session!.storeId,
        currentStatus: 'FOLLOW_UP_REQUESTED',
      }),
    enabled: session?.storeId != null,
  });

  const qrWorkOrders: WorkOrder[] = [
    ...qrWorkOrdersAccepted,
    ...qrWorkOrdersInProgress,
    ...qrWorkOrdersFollowUp,
  ];

  const qrTicketsMap = (() => {
    const map = new Map<number, WorkOrder[]>();
    for (const wo of qrWorkOrders) {
      const list = map.get(wo.ticketId) ?? [];
      list.push(wo);
      map.set(wo.ticketId, list);
    }
    return map;
  })();
  const qrTicketIds = Array.from(qrTicketsMap.keys());

  const workOrdersForModal =
    selectedTicketId != null && qrMode != null
      ? (qrTicketsMap.get(selectedTicketId) ?? []).filter((wo) =>
          qrMode === 'checkin'
            ? wo.currentStatus === WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED ||
              wo.currentStatus === WorkOrderStatus.FOLLOW_UP_REQUESTED
            : wo.currentStatus === WorkOrderStatus.SERVICE_IN_PROGRESS
        )
      : [];

  return (
    <Layout screenTitle="Potrebno generiranje QR koda">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Potrebno generiranje QR koda
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Radni nalozi s dodijeljenim tehničarima ili s potrebnim ponovnim posjetom — generirajte QR za prijavu dolaska ili odjavu s posla.
            </p>
          </div>
          <Link to="/store-manager">
            <Button type="button" variant="secondary">
              Natrag na nadzornu ploču
            </Button>
          </Link>
        </div>

        {qrTicketIds.length === 0 ? (
          <Card className="bg-gray-50 p-6 text-center text-gray-600">
            Trenutno nema prijava koje zahtijevaju QR.
          </Card>
        ) : (
          <div className="space-y-3">
            {qrTicketIds.map((ticketId) => {
              const wos = qrTicketsMap.get(ticketId)!;
              return (
                <Card key={ticketId} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          Prijava #{ticketId}
                        </span>
                        {wos.some((wo) => wo.urgent) && (
                          <Badge variant="danger">Hitno</Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          {formatRadnihNaloga(wos.length)}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {wos.map((wo) => (
                          <li key={wo.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-medium text-gray-900">
                              {wo.vendorCompanyName}
                            </span>
                            <span className="text-gray-500">— WO #{wo.id}</span>
                            {wo.assignedTechnicianName != null && wo.assignedTechnicianName !== '' && (
                              <span className="text-gray-600">
                                — {wo.assignedTechnicianName} (S2)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={!wos.some((wo) =>
                          wo.currentStatus === WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED ||
                          wo.currentStatus === WorkOrderStatus.FOLLOW_UP_REQUESTED
                        )}
                        onClick={() => {
                          setSelectedTicketId(ticketId);
                          setQrMode('checkin');
                        }}
                      >
                        Prijava dolaska
                        {wos.some((wo) => wo.currentStatus === WorkOrderStatus.FOLLOW_UP_REQUESTED)
                          ? ' (ponovni posjet)'
                          : ''}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!wos.some((wo) => wo.currentStatus === WorkOrderStatus.SERVICE_IN_PROGRESS)}
                        onClick={() => {
                          setSelectedTicketId(ticketId);
                          setQrMode('checkout');
                        }}
                      >
                        Odjava s posla
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedTicketId != null && qrMode != null && workOrdersForModal.length > 0 && (
        <QRGenerationModal
          ticketId={selectedTicketId}
          workOrders={workOrdersForModal}
          onClose={() => {
            setSelectedTicketId(null);
            setQrMode(null);
          }}
        />
      )}
    </Layout>
  );
}
