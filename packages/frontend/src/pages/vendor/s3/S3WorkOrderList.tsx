/**
 * S3 Work Order List — Section 15
 * Approved list: checkboxes + "Create Invoice Batch (PDF)" button.
 */

import { useState } from 'react';
import type { WorkOrder } from '../../../api/work-orders';
import { Card, Button } from '../../../components/shared';
import { formatStatus } from '../../../utils/formatters';

interface S3WorkOrderListProps {
  items: WorkOrder[];
  title: string;
  onBack: () => void;
  onSelectWo: (id: number) => void;
  isApprovedList?: boolean;
  batchCreating?: boolean;
  batchError?: string | null;
  onCreateBatch?: (workOrderIds: number[]) => Promise<void>;
  onClearBatchError?: () => void;
}

export function S3WorkOrderList({
  items,
  title,
  onBack,
  onSelectWo,
  isApprovedList = false,
  batchCreating = false,
  batchError = null,
  onCreateBatch,
  onClearBatchError,
}: S3WorkOrderListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((wo) => wo.id)));
  };
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateBatch = async () => {
    if (!onCreateBatch || selectedIds.size === 0) return;
    await onCreateBatch([...selectedIds]);
    setSelectedIds(new Set());
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2">
          {isApprovedList && onCreateBatch && (
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateBatch}
              disabled={selectedIds.size === 0 || batchCreating}
            >
              {batchCreating ? 'Creating…' : 'Create Invoice Batch (PDF)'}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
      {batchError != null && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex justify-between items-center">
          <span>{batchError}</span>
          {onClearBatchError && (
            <button type="button" onClick={onClearBatchError} className="underline">
              Dismiss
            </button>
          )}
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-gray-600">No work orders in this group.</p>
      ) : (
        <div className="space-y-2">
          {isApprovedList && (
            <div className="flex items-center gap-3 py-2 border-b border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Select all</span>
              </label>
              <span className="text-sm text-gray-500">
                {selectedIds.size} of {items.length} selected
              </span>
            </div>
          )}
          {items.map((wo) => (
            <div
              key={wo.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition flex justify-between items-center gap-3"
              onClick={(e) => {
                if (isApprovedList && (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                onSelectWo(wo.id);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectWo(wo.id);
                }
              }}
            >
              {isApprovedList && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(wo.id)}
                  onChange={() => toggleOne(wo.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-gray-300 shrink-0"
                  aria-label={`Select WO #${wo.id}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-900">{wo.storeName ?? `WO #${wo.id}`}</span>
                <span className="text-sm text-gray-500 ml-2">Ticket #{wo.ticketId}</span>
                {wo.checkoutTs != null && (
                  <span className="text-sm text-gray-500 ml-2">
                    Completed: {new Date(wo.checkoutTs).toLocaleDateString()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-gray-600 shrink-0">{formatStatus(wo.currentStatus)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
