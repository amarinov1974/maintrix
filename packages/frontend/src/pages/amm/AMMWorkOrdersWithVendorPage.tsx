/**
 * AMM Work Orders sent to vendors — list of work orders sent to vendors in this region.
 * Shows AMM comment to vendor (first N words) on each row.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workOrdersAPI } from '../../api/work-orders';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Badge } from '../../components/shared';
import { AMMWorkOrderDetailModal } from './AMMWorkOrderDetailModal';
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

/** Display current owner: technician name when assigned, otherwise Vendor (S1) or AMM */
function currentOwnerLabel(wo: WorkOrder): string {
  if (wo.assignedTechnicianName != null && wo.assignedTechnicianName !== '') {
    return wo.assignedTechnicianName;
  }
  return wo.currentOwnerType === 'VENDOR' ? 'Vendor (S1)' : 'AMM';
}

export function AMMWorkOrdersWithVendorPage() {
  const { session } = useSession();
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<number | null>(null);

  const { data: workOrdersWithVendor = [], isLoading } = useQuery({
    queryKey: ['work-orders', 'amm-region-vendor', session?.regionId],
    queryFn: () =>
      workOrdersAPI.list({
        regionId: session!.regionId,
        currentOwnerType: 'VENDOR',
      }),
    enabled: session?.regionId != null,
  });

  const sorted = [...workOrdersWithVendor].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <Layout screenTitle="Radni nalozi kod izvođača">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Radni nalozi kod izvođača
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Work orders sent to vendors in your region — newest first
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
            Nema radnih naloga kod izvođača.
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
      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-sky-50/50 hover:border-sky-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
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
        <span><span className="font-medium text-gray-600">Owner:</span> {currentOwnerLabel(workOrder)}</span>
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
