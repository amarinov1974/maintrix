import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { formatStatus, getInFlightStatusBadgeVariant } from '../../utils/formatters';
export function AMMCostProposalWorkOrdersPage() {
    const { session } = useSession();
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
    const { data: ownedWorkOrders = [], isLoading } = useQuery({
        queryKey: ['work-orders', 'amm-owned', session?.userId],
        queryFn: () => workOrdersAPI.list({
            currentOwnerId: session.userId,
            currentOwnerType: 'INTERNAL',
        }),
        enabled: session?.userId != null,
    });
    const costProposalWOs = ownedWorkOrders
        .filter((wo) => wo.currentStatus === WorkOrderStatus.COST_PROPOSAL_PREPARED)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return (_jsxs(Layout, { screenTitle: "Radni nalozi \u2014 odobrenje ponude", children: [_jsxs("div", { className: "max-w-4xl mx-auto space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Radni nalozi \u2014 odobrenje ponude" }), _jsx("p", { className: "text-sm text-gray-600 mt-0.5", children: "Odobri / Zatra\u017Ei reviziju / Zatvori bez tro\u0161ka \u2014 najnovije prvo" })] }), _jsx(Link, { to: "/amm", children: _jsx(Button, { type: "button", variant: "secondary", children: "Natrag na nadzornu plo\u010Du" }) })] }), isLoading ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje\u2026" })) : costProposalWOs.length === 0 ? (_jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600", children: "Nema radnih naloga koji \u010Dekaju odobrenje ponude." })) : (_jsx("ul", { className: "space-y-2", children: costProposalWOs.map((wo) => (_jsx("li", { children: _jsx(WorkOrderPreviewRow, { workOrder: wo, onOpen: () => setSelectedWorkOrderId(wo.id) }) }, wo.id))) }))] }), selectedWorkOrderId != null && (_jsx(AMMWorkOrderDetailModal, { workOrderId: selectedWorkOrderId, onClose: () => setSelectedWorkOrderId(null) }))] }));
}
function WorkOrderPreviewRow({ workOrder, onOpen, }) {
    return (_jsx("button", { type: "button", className: "w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-emerald-50/50 hover:border-emerald-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen();
        }, children: _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Radni nalog #", workOrder.id] }), _jsxs("span", { className: "text-sm text-gray-600", children: ["Prijava #", workOrder.ticketId] }), _jsx(Badge, { variant: getInFlightStatusBadgeVariant(workOrder.currentStatus), children: formatStatus(workOrder.currentStatus) }), _jsx("span", { className: "text-sm text-gray-600", children: workOrder.vendorCompanyName }), workOrder.storeName && (_jsx("span", { className: "text-sm text-gray-600", children: workOrder.storeName })), _jsx("span", { className: "text-sm text-gray-500", children: new Date(workOrder.updatedAt).toLocaleDateString() })] }) }));
}
