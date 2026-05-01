/**
 * S1 Work Order List — Section 13.5
 * Newest on top. Row: Store Name, Store Address, Urgency badge, ETA, Category, Short AMM comment, Current status.
 */

import type { WorkOrder } from '../../../api/work-orders';
import { Card, Badge, Button } from '../../../components/shared';
import { formatCategory, formatStatus } from '../../../utils/formatters';

interface S1WorkOrderListProps {
  items: WorkOrder[];
  title: string;
  onBack: () => void;
  onSelectWo: (id: number) => void;
}

function shortComment(comment: string | null | undefined, maxLen: number = 60): string {
  if (comment == null || comment === '') return '—';
  return comment.length <= maxLen ? comment : comment.slice(0, maxLen) + '…';
}

function formatEta(eta: string | null | undefined): string {
  if (eta == null) return '—';
  const d = new Date(eta);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function S1WorkOrderList({
  items,
  title,
  onBack,
  onSelectWo,
}: S1WorkOrderListProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-gray-600">No work orders in this group.</p>
      ) : (
        <div className="space-y-2">
          {items.map((wo) => (
            <div
              key={wo.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
              onClick={() => onSelectWo(wo.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectWo(wo.id);
                }
              }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {wo.storeName ?? 'Store'}
                </span>
                <Badge variant={wo.urgent ? 'danger' : 'secondary'}>
                  {wo.urgent ? 'Urgent' : 'Non-Urgent'}
                </Badge>
                <span className="text-sm text-gray-500">
                  ETA: {formatEta(wo.eta)}
                </span>
              </div>
              {wo.storeAddress != null && wo.storeAddress !== '' && (
                <p className="text-sm text-gray-600 mb-1">{wo.storeAddress}</p>
              )}
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                <span>Category: {wo.category ? formatCategory(wo.category) : '—'}</span>
                <span>•</span>
                <span>AMM comment: {shortComment(wo.commentToVendor)}</span>
                <span>•</span>
                <span className="font-medium">{formatStatus(wo.currentStatus)}</span>
                {wo.assignedTechnicianName != null && wo.assignedTechnicianName !== '' && (
                  <>
                    <span>•</span>
                    <span>Owner: <strong>{wo.assignedTechnicianName}</strong></span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
