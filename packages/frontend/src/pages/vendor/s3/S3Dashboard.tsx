/**
 * S3 (Finance / Backoffice) Dashboard — Section 15
 * Action-group: Service Completed, Cost Revision Requested, Approved (read-only), Closed Without Cost (read-only).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { invoiceBatchesAPI } from '../../../api/invoice-batches';
import { useSession } from '../../../contexts/SessionContext';
import { Layout, Card, Button } from '../../../components/shared';
import { S3WorkOrderList } from './S3WorkOrderList';
import { S3WorkOrderDetailModal } from './S3WorkOrderDetailModal';
import { TerminalWorkOrderStatuses } from '../../../types/statuses';

const SERVICE_COMPLETED = 'Servis završen (čeka ponudu troška)';
const COST_REVISION_REQUESTED = 'Zatražena revizija ponude';
const COST_PROPOSAL_APPROVED = 'Cost Proposal Approved';
const CLOSED_WITHOUT_COST = 'Closed Without Cost';

type ListMode = 'service-completed' | 'revision' | 'approved' | 'closed' | null;

export function S3Dashboard() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [listMode, setListMode] = useState<ListMode>(null);
  const [selectedWOId, setSelectedWOId] = useState<number | null>(null);
  const [batchCreating, setBatchCreating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders', 's3', session?.companyId],
    queryFn: () =>
      workOrdersAPI.list({
        vendorCompanyId: session!.companyId,
      }),
    enabled: session?.companyId != null,
  });

  const serviceCompleted = workOrders.filter(
    (wo) => wo.currentStatus === SERVICE_COMPLETED && wo.currentOwnerId === session?.userId
  );
  const revisionRequested = workOrders.filter(
    (wo) => wo.currentStatus === COST_REVISION_REQUESTED && wo.currentOwnerId === session?.userId
  );
  // Approved but not yet in an invoice batch (eligible for "Create Invoice Batch")
  const approved = workOrders.filter(
    (wo) => wo.currentStatus === COST_PROPOSAL_APPROVED && wo.invoiceBatchId == null
  );
  const closedNoCost = workOrders.filter((wo) => wo.currentStatus === CLOSED_WITHOUT_COST);
  // Approved and already batched — show in "Closed Work Orders" (read-only)
  const batchedApproved = workOrders.filter(
    (wo) => wo.currentStatus === COST_PROPOSAL_APPROVED && wo.invoiceBatchId != null
  );
  const closedWorkOrders = [...closedNoCost, ...batchedApproved];

  // Work orders from your company that S3 is not currently owner of
  const myWorkOrders = workOrders.filter(
    (wo) => wo.currentOwnerId !== session?.userId
  );
  const myActiveCount = myWorkOrders.filter(
    (wo) => !TerminalWorkOrderStatuses.includes(wo.currentStatus)
  ).length;
  const myClosedCount = myWorkOrders.filter((wo) =>
    TerminalWorkOrderStatuses.includes(wo.currentStatus)
  ).length;

  const listItems =
    listMode === 'service-completed'
      ? serviceCompleted
      : listMode === 'revision'
        ? revisionRequested
        : listMode === 'approved'
          ? approved
          : listMode === 'closed'
            ? closedWorkOrders
            : [];

  const listTitle =
    listMode === 'service-completed'
      ? 'Servis završen (čeka ponudu troška)'
      : listMode === 'revision'
        ? 'Zatražena revizija ponude'
        : listMode === 'approved'
          ? 'Odobrene ponude troška'
          : listMode === 'closed'
            ? 'Zatvoreni radni nalozi'
            : '';

  return (
    <Layout screenTitle="Nadzorna ploča">
      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <p className="text-gray-600">Učitavanje radnih naloga...</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              className="bg-amber-50 border-amber-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setListMode('service-completed')}
            >
              <h3 className="font-medium text-amber-900 mb-1">Servis završen (čeka ponudu troška)</h3>
              <p className="text-3xl font-bold text-amber-700">{serviceCompleted.length}</p>
              <p className="text-xs text-amber-600 mt-1">Čeka ponudu troška</p>
            </Card>
            <Card
              className="bg-orange-50 border-orange-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setListMode('revision')}
            >
              <h3 className="font-medium text-orange-900 mb-1">Zatražena revizija ponude</h3>
              <p className="text-3xl font-bold text-orange-700">{revisionRequested.length}</p>
              <p className="text-xs text-orange-600 mt-1">Preračunajte i ponovo pošaljite</p>
            </Card>
            <Card
              className="bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setListMode('approved')}
            >
              <h3 className="font-medium text-green-900 mb-1">Odobrene ponude troška</h3>
              <p className="text-3xl font-bold text-green-700">{approved.length}</p>
              <p className="text-xs text-green-600 mt-1">Samo pregled</p>
            </Card>
            <Card
              className="bg-gray-100 border-gray-200 cursor-pointer hover:shadow-md transition"
              onClick={() => setListMode('closed')}
            >
              <h3 className="font-medium text-gray-900 mb-1">Zatvoreni radni nalozi</h3>
              <p className="text-3xl font-bold text-gray-600">{closedWorkOrders.length}</p>
              <p className="text-xs text-gray-500 mt-1">Samo pregled</p>
            </Card>
          </div>
        )}

        {listMode != null && (
          <S3WorkOrderList
            items={listItems}
            title={listTitle}
            onBack={() => setListMode(null)}
            onSelectWo={(id) => setSelectedWOId(id)}
            isApprovedList={listMode === 'approved'}
            batchCreating={batchCreating}
            batchError={batchError}
            onCreateBatch={
              listMode === 'approved'
                ? async (workOrderIds: number[]) => {
                    setBatchError(null);
                    setBatchCreating(true);
                    try {
                      const res = await invoiceBatchesAPI.create(workOrderIds);
                      await queryClient.invalidateQueries({
                        queryKey: ['work-orders', 's3', session?.companyId],
                      });
                      const pdfBlob = await invoiceBatchesAPI.getPdfBlob(res.batch.id);
                      const pdfObjectUrl = URL.createObjectURL(pdfBlob);
                      window.open(pdfObjectUrl, '_blank', 'noopener');
                      window.setTimeout(() => URL.revokeObjectURL(pdfObjectUrl), 60_000);
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: { error?: string }; status?: number } };
                      const msg =
                        err.response?.data?.error ??
                        (e instanceof Error ? e.message : 'Failed to create batch');
                      setBatchError(msg);
                    } finally {
                      setBatchCreating(false);
                    }
                  }
                : undefined
            }
            onClearBatchError={() => setBatchError(null)}
          />
        )}

        <Card className="bg-slate-50 border-slate-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Moji radni nalozi</h2>
          <p className="text-sm text-gray-600 mb-4">
            Radni nalozi iz vaše tvrtke kojima trenutno niste vlasnik ({myWorkOrders.length} ukupno). Samo pregled.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/vendor/s3/my-work-orders/active">
              <Button type="button" variant="secondary">
                Aktivni radni nalozi ({myActiveCount})
              </Button>
            </Link>
            <Link to="/vendor/s3/my-work-orders/closed">
              <Button type="button" variant="secondary">
                Zatvoreni radni nalozi ({myClosedCount})
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {selectedWOId != null && (
        <S3WorkOrderDetailModal
          workOrderId={selectedWOId}
          onClose={() => setSelectedWOId(null)}
        />
      )}
    </Layout>
  );
}
