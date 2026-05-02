/**
 * S2 (Technician) Dashboard — Section 14
 * Single list: Urgent (newest first) then Non-Urgent (newest first).
 * Row: Store Name, Address, Urgency, ETA, Category, Short AMM comment.
 * Click → Work Order Detail.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { useSession } from '../../../contexts/SessionContext';
import { Layout, Card, Badge } from '../../../components/shared';
import { S2WorkOrderDetailModal } from './S2WorkOrderDetailModal';
import { formatCategory } from '../../../utils/formatters';

function shortComment(comment: string | null | undefined, maxLen: number = 60): string {
  if (comment == null || comment === '') return '—';
  return comment.length <= maxLen ? comment : comment.slice(0, maxLen) + '…';
}

function formatEta(eta: string | null | undefined): string {
  if (eta == null) return '—';
  return new Date(eta).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function S2Dashboard() {
  const { session } = useSession();
  const [selectedWOId, setSelectedWOId] = useState<number | null>(null);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders', 's2', session?.userId],
    queryFn: () =>
      workOrdersAPI.list({
        currentOwnerId: session!.userId,
        currentOwnerType: 'VENDOR',
      }),
    enabled: session?.userId != null,
  });

  const sorted = useMemo(() => {
    const urgent = workOrders.filter((wo) => wo.urgent === true);
    const nonUrgent = workOrders.filter((wo) => wo.urgent !== true);
    const byNewest = (a: { updatedAt: string }, b: { updatedAt: string }) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return [...urgent.sort(byNewest), ...nonUrgent.sort(byNewest)];
  }, [workOrders]);

  return (
    <Layout screenTitle="Nadzorna ploča">
      <div className="space-y-6">
        <p className="text-gray-600">
          Vaši dodijeljeni radni nalozi. Hitni prikazani prvi. Otvorite za prijavu dolaska ili završetak rada.
        </p>

        {isLoading ? (
          <Card>
            <p className="text-gray-600">Učitavanje radnih naloga...</p>
          </Card>
        ) : sorted.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-600">Nemate dodijeljenih radnih naloga.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {sorted.filter((wo) => wo.urgent).length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Hitni radni nalozi</h2>
                <div className="space-y-2">
                  {sorted
                    .filter((wo) => wo.urgent)
                    .map((wo) => (
                      <Card
                        key={wo.id}
                        className="cursor-pointer hover:shadow-md transition"
                        onClick={() => setSelectedWOId(wo.id)}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{wo.storeName ?? 'Store'}</span>
                          <Badge variant="danger">Hitno</Badge>
                          <span className="text-sm text-gray-500">ETA: {formatEta(wo.eta)}</span>
                        </div>
                        {wo.storeAddress != null && wo.storeAddress !== '' && (
                          <p className="text-sm text-gray-600 mb-1">{wo.storeAddress}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Kategorija: {wo.category ? formatCategory(wo.category) : '—'} • AMM: {shortComment(wo.commentToVendor)}
                        </p>
                      </Card>
                    ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {sorted.some((wo) => wo.urgent) ? 'Radni nalozi koji nisu hitni' : 'Radni nalozi'}
              </h2>
              <div className="space-y-2">
                {sorted
                  .filter((wo) => !wo.urgent)
                  .map((wo) => (
                    <Card
                      key={wo.id}
                      className="cursor-pointer hover:shadow-md transition"
                      onClick={() => setSelectedWOId(wo.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{wo.storeName ?? 'Store'}</span>
                        <Badge variant="secondary">Nije hitno</Badge>
                        <span className="text-sm text-gray-500">ETA: {formatEta(wo.eta)}</span>
                      </div>
                      {wo.storeAddress != null && wo.storeAddress !== '' && (
                        <p className="text-sm text-gray-600 mb-1">{wo.storeAddress}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        Kategorija: {wo.category ? formatCategory(wo.category) : '—'} • AMM: {shortComment(wo.commentToVendor)}
                      </p>
                    </Card>
                  ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {selectedWOId != null && (
        <S2WorkOrderDetailModal
          workOrderId={selectedWOId}
          onClose={() => setSelectedWOId(null)}
        />
      )}
    </Layout>
  );
}
