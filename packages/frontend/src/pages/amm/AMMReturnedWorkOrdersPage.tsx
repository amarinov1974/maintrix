/**
 * AMM Work Orders — returned or rejected
 * List of work orders returned or rejected by S1 (service provider) to AMM.
 * Owner = AMM, status = Awaiting Service Provider or Work Order Rejected.
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
import { formatStatus, getInFlightStatusBadgeVariant } from '../../utils/formatters';

const COMMENT_PREVIEW_WORDS = 25;

function commentPreview(text: string | null | undefined): string {
  if (text == null || !String(text).trim()) return '';
  const words = String(text).trim().split(/\s+/);
  if (words.length <= COMMENT_PREVIEW_WORDS) return words.join(' ');
  return words.slice(0, COMMENT_PREVIEW_WORDS).join(' ') + '…';
}

function formatEta(eta: string | null | undefined): string {
  if (eta == null) return '—';
  const d = new Date(eta);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function AMMReturnedWorkOrdersPage() {
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

  const returnedWorkOrders = ownedWorkOrders.filter(
    (wo) =>
      wo.currentStatus === WorkOrderStatus.CREATED ||
      wo.currentStatus === WorkOrderStatus.REJECTED
  );
  const sorted = [...returnedWorkOrders].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <Layout screenTitle="Vraćeni radni nalozi">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Vraćeni radni nalozi
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Returned or rejected by service provider (S1) — review and resend or close
            </p>
          </div>
          <Link to="/amm">
            <Button type="button" variant="secondary">
              Natrag na nadzornu ploču
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading…</p>
        ) : sorted.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
            Nema vraćenih radnih naloga.
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((wo) => (
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
  const commentPreviewText = commentPreview(workOrder.commentToVendor);
  return (
    <button
      type="button"
      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-rose-50/50 hover:border-rose-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-gray-900">Work Order #{workOrder.id}</span>
        <span className="text-sm text-gray-600">Ticket #{workOrder.ticketId}</span>
        {workOrder.urgent && (
          <Badge variant="danger">Hitno</Badge>
        )}
        <Badge variant={getInFlightStatusBadgeVariant(workOrder.currentStatus)}>
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
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-700">
        <span><span className="font-medium text-gray-600">Owner:</span> AMM (returned)</span>
        <span><span className="font-medium text-gray-600">ETA:</span> {formatEta(workOrder.eta)}</span>
      </div>
      {commentPreviewText && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2" title={workOrder.commentToVendor ?? undefined}>
          <span className="font-medium text-gray-700">Comment to vendor: </span>
          {commentPreviewText}
        </p>
      )}
    </button>
  );
}
