import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const { filter } = useParams();
    const [selectedWOId, setSelectedWOId] = useState(null);
    const isActive = filter === 'active';
    useEffect(() => {
        if (filter != null && filter !== 'active' && filter !== 'closed') {
            navigate('/vendor/s3', { replace: true });
        }
    }, [filter, navigate]);
    const { data: workOrders = [], isLoading } = useQuery({
        queryKey: ['work-orders', 's3', session?.companyId],
        queryFn: () => workOrdersAPI.list({
            vendorCompanyId: session.companyId,
        }),
        enabled: session?.companyId != null,
    });
    const myWorkOrders = workOrders.filter((wo) => wo.currentOwnerId !== session?.userId);
    const listItems = isActive
        ? myWorkOrders.filter((wo) => !TerminalWorkOrderStatuses.includes(wo.currentStatus))
        : myWorkOrders.filter((wo) => TerminalWorkOrderStatuses.includes(wo.currentStatus));
    const listTitle = isActive
        ? 'Aktivni radni nalozi (niste vlasnik)'
        : 'Zatvoreni radni nalozi (niste vlasnik)';
    return (_jsxs(Layout, { screenTitle: "Moji radni nalozi", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate('/vendor/s3'), children: "Natrag na nadzornu plo\u010Du" }) }), isLoading ? (_jsx("p", { className: "text-gray-600", children: "U\u010Ditavanje radnih naloga..." })) : (_jsx(S3WorkOrderList, { items: listItems, title: listTitle, onBack: () => navigate('/vendor/s3'), onSelectWo: (id) => setSelectedWOId(id) }))] }), selectedWOId != null && (_jsx(S3WorkOrderDetailModal, { workOrderId: selectedWOId, onClose: () => setSelectedWOId(null) }))] }));
}
