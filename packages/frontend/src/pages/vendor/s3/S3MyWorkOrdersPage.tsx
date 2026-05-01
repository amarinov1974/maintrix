/**
 * S3 My Work Orders — work orders from your company that you are not currently owning.
 * Shown on a separate screen (active or closed).
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { useSession } from '../../../contexts/SessionContext';
import { Layout, Button } from '../../../components/shared';
import { S3WorkOrderList } from './S3WorkOrderList';
import { S3WorkOrderDetailModal } from './S3WorkOrderDetailModal';
import { TerminalWorkOrderStatuses } from '../../../types/statuses';

export function S3MyWorkOrdersPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const { filter } = useParams<{ filter: string }>();
  const [selectedWOId, setSelectedWOId] = useState<number | null>(null);

  const isActive = filter === 'active';

  useEffect(() => {
    if (filter != null && filter !== 'active' && filter !== 'closed') {
      navigate('/vendor/s3', { replace: true });
    }
  }, [filter, navigate]);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders', 's3', session?.companyId],
    queryFn: () =>
      workOrdersAPI.list({
        vendorCompanyId: session!.companyId,
      }),
    enabled: session?.companyId != null,
  });

  const myWorkOrders = workOrders.filter(
    (wo) => wo.currentOwnerId !== session?.userId
  );
  const listItems = isActive
    ? myWorkOrders.filter((wo) => !TerminalWorkOrderStatuses.includes(wo.currentStatus))
    : myWorkOrders.filter((wo) => TerminalWorkOrderStatuses.includes(wo.currentStatus));

  const listTitle = isActive
    ? 'Aktivni radni nalozi (niste vlasnik)'
    : 'Zatvoreni radni nalozi (niste vlasnik)';

  return (
    <Layout screenTitle="Moji radni nalozi">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/vendor/s3')}>
            Natrag na nadzornu ploču
          </Button>
        </div>
        {isLoading ? (
          <p className="text-gray-600">Učitavanje radnih naloga...</p>
        ) : (
          <S3WorkOrderList
            items={listItems}
            title={listTitle}
            onBack={() => navigate('/vendor/s3')}
            onSelectWo={(id) => setSelectedWOId(id)}
          />
        )}
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
