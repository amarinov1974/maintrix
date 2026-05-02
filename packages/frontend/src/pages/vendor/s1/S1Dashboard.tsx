/**
 * S1 (Service Admin) Dashboard — Section 13
 * New WO Urgent, New WO Non-Urgent, Active WO, Archived WO.
 * Count only; click opens list. List opens WO detail; opening WO records read acknowledgment.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { useSession } from '../../../contexts/SessionContext';
import { Layout, Card, Badge, Button } from '../../../components/shared';
import { WorkOrderStatus } from '../../../types/statuses';
import { S1WorkOrderList } from './S1WorkOrderList';
import { S1WorkOrderDetailModal } from './S1WorkOrderDetailModal';

const ACTIVE_STATUSES: readonly string[] = [
  WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED,
  WorkOrderStatus.SERVICE_IN_PROGRESS,
  WorkOrderStatus.SERVICE_COMPLETED,
  WorkOrderStatus.FOLLOW_UP_REQUESTED,
  WorkOrderStatus.NEW_WO_NEEDED,
  WorkOrderStatus.REPAIR_UNSUCCESSFUL,
  WorkOrderStatus.COST_PROPOSAL_PREPARED,
  WorkOrderStatus.COST_REVISION_REQUESTED,
];
const ARCHIVED_STATUSES: readonly string[] = [WorkOrderStatus.COST_PROPOSAL_APPROVED, WorkOrderStatus.CLOSED_WITHOUT_COST, WorkOrderStatus.REJECTED];

export function S1Dashboard() {
  const { session } = useSession();
  const [listMode, setListMode] = useState<'urgent' | 'non-urgent' | 'active' | 'archived' | 'other-active' | 'other-closed' | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<number | null>(null);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders', 's1', session?.companyId],
    queryFn: () =>
      workOrdersAPI.list({
        vendorCompanyId: session!.companyId,
      }),
    enabled: session?.companyId != null,
  });

  const isOwner = (wo: { currentOwnerId: number }) =>
    session?.userId != null && wo.currentOwnerId === session.userId;

  const newUrgent = workOrders.filter(
    (wo) =>
      wo.currentStatus === WorkOrderStatus.CREATED && wo.urgent === true && isOwner(wo)
  );
  const newNonUrgent = workOrders.filter(
    (wo) =>
      wo.currentStatus === WorkOrderStatus.CREATED && wo.urgent === false && isOwner(wo)
  );
  const active = workOrders.filter((wo) =>
    ACTIVE_STATUSES.includes(wo.currentStatus)
  );
  const archived = workOrders.filter((wo) =>
    ARCHIVED_STATUSES.includes(wo.currentStatus)
  );

  // WOs from your company where S1 participated but is not the current owner (handed off to S2/S3/AMM or closed)
  const notOwnedByS1 = workOrders.filter(
    (wo) => wo.currentOwnerId !== session?.userId
  );
  // Active: includes CREATED (e.g. returned to AMM — still "Awaiting Service Provider") + normal active statuses
  const otherActiveStatuses: readonly string[] = [WorkOrderStatus.CREATED, ...ACTIVE_STATUSES];
  const otherActive = notOwnedByS1.filter((wo) =>
    otherActiveStatuses.includes(wo.currentStatus)
  );
  const otherClosed = notOwnedByS1.filter((wo) =>
    ARCHIVED_STATUSES.includes(wo.currentStatus)
  );

  const countNewUrgent = newUrgent.length;
  const countNewNonUrgent = newNonUrgent.length;
  const countActive = active.length;
  const countArchived = archived.length;

  const listItems =
    listMode === 'urgent'
      ? newUrgent
      : listMode === 'non-urgent'
        ? newNonUrgent
        : listMode === 'active'
          ? active
          : listMode === 'archived'
            ? archived
            : listMode === 'other-active'
              ? otherActive
              : listMode === 'other-closed'
                ? otherClosed
                : [];

  return (
    <Layout screenTitle="Nadzorna ploča">
      <div className="space-y-6">
        {listMode != null ? (
          <S1WorkOrderList
            items={listItems}
            title={
              listMode === 'urgent'
                ? 'Novi radni nalozi — Hitno'
                : listMode === 'non-urgent'
                  ? 'Novi radni nalozi — Nije hitno'
                  : listMode === 'active'
                    ? 'Aktivni radni nalozi'
                    : listMode === 'archived'
                      ? 'Arhivirani radni nalozi'
                      : listMode === 'other-active'
                        ? 'Aktivni radni nalozi (niste vlasnik)'
                        : 'Zatvoreni radni nalozi (niste vlasnik)'
            }
            onBack={() => setListMode(null)}
            onSelectWo={(id) => setSelectedWorkOrderId(id)}
          />
        ) : isLoading ? (
          <Card>
            <p className="text-gray-600">Učitavanje...</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              className="bg-amber-50 border-amber-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setListMode('urgent')}
            >
              <h3 className="font-medium text-amber-900 mb-1">Novi radni nalozi — Hitno</h3>
              <p className="text-3xl font-bold text-amber-700">{countNewUrgent}</p>
              <p className="text-xs text-amber-600 mt-1">Status: Čeka izvođača, Hitno</p>
            </Card>
            <Card
              className="bg-slate-50 border-slate-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setListMode('non-urgent')}
            >
              <h3 className="font-medium text-slate-900 mb-1">Novi radni nalozi — Nije hitno</h3>
              <p className="text-3xl font-bold text-slate-700">{countNewNonUrgent}</p>
              <p className="text-xs text-slate-600 mt-1">Status: Čeka izvođača, Nije hitno</p>
            </Card>
            <Card
              className="bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setListMode('active')}
            >
              <h3 className="font-medium text-green-900 mb-1">Aktivni radni nalozi</h3>
              <p className="text-3xl font-bold text-green-700">{countActive}</p>
              <p className="text-xs text-green-600 mt-1">Samo pregled</p>
            </Card>
            <Card
              className="bg-gray-100 border-gray-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setListMode('archived')}
            >
              <h3 className="font-medium text-gray-900 mb-1">Arhivirani radni nalozi</h3>
              <p className="text-3xl font-bold text-gray-600">{countArchived}</p>
              <p className="text-xs text-gray-500 mt-1">Samo pregled</p>
            </Card>
          </div>
        )}

        {!isLoading && (
          <Card className="bg-slate-50 border-slate-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Moji radni nalozi</h2>
            <p className="text-sm text-gray-600 mb-4">
              Radni nalozi iz vaše tvrtke u kojima ste sudjelovali, ali trenutno niste vlasnik. Samo pregled.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setListMode('other-active')}
              >
                Aktivni radni nalozi ({otherActive.length})
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setListMode('other-closed')}
              >
                Zatvoreni radni nalozi ({otherClosed.length})
              </Button>
            </div>
          </Card>
        )}
      </div>

      {selectedWorkOrderId != null && (
        <S1WorkOrderDetailModal
          workOrderId={selectedWorkOrderId}
          onClose={() => setSelectedWorkOrderId(null)}
        />
      )}
    </Layout>
  );
}
