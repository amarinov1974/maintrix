/**
 * AMM Work Orders Awaiting Cost Proposal Review — list (newest first) with preview.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workOrdersAPI } from '../../api/work-orders';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Badge } from '../../components/shared';
import { AMMWorkOrderDetailModal } from './AMMWorkOrderDetailModal';
import { WorkOrderStatus } from '../../types/statuses';
import type { WorkOrder } from '../../api/work-orders';
import { formatStatus } from '../../utils/formatters';

function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  if (status.includes('Approved')) return 'success';
  if (status.includes('Rejected') || status.includes('Withdrawn')) return 'danger';
  return 'warning';
}

export function AMMCostProposalWorkOrdersPage() {
  const { session } = useSession();
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<number | null>(null);

  const { data: ownedWorkOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders', 'amm-owned', session?.userId],
    queryFn: () =>
      workOrdersAPI.list({
        currentOwnerId: session!.userId,
        currentOwnerType: 'INTERNAL',
      }),
    enabled: session?.userId != null,
  });

  const costProposalWOs = ownedWorkOrders
    .filter((wo) => wo.currentStatus === WorkOrderStatus.COST_PROPOSAL_PREPARED)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <Layout screenTitle="Radni nalozi — odobrenje ponude">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Radni nalozi — odobrenje ponude
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Odobri / Zatraži reviziju / Zatvori bez troška — najnovije prvo
            </p>
          </div>
          <Link to="/amm">
            <Button type="button" variant="secondary">
              Natrag na nadzornu ploču
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Učitavanje…</p>
        ) : costProposalWOs.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
            Nema radnih naloga koji čekaju odobrenje ponude.
          </div>
        ) : (
          <ul className="space-y-2">
            {costProposalWOs.map((wo) => (
              <li key={wo.id}>
                <WorkOrderPreviewRow
                  workOrder={wo}
                  onOpen={() => setSelectedWorkOrderId(wo.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedWorkOrderId != null && (
        <AMMWorkOrderDetailModal
          workOrderId={selectedWorkOrderId}
          onClose={() => setSelectedWorkOrderId(null)}
        />
      )}
    </Layout>
  );
}

function WorkOrderPreviewRow({
  workOrder,
  onOpen,
}: {
  workOrder: WorkOrder;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-emerald-50/50 hover:border-emerald-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-gray-900">Radni nalog #{workOrder.id}</span>
        <span className="text-sm text-gray-600">Prijava #{workOrder.ticketId}</span>
        <Badge variant={getStatusBadgeVariant(workOrder.currentStatus)}>
          {formatStatus(workOrder.currentStatus)}
        </Badge>
        <span className="text-sm text-gray-600">{workOrder.vendorCompanyName}</span>
        {workOrder.storeName && (
          <span className="text-sm text-gray-600">{workOrder.storeName}</span>
        )}
        <span className="text-sm text-gray-500">
          {new Date(workOrder.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}
