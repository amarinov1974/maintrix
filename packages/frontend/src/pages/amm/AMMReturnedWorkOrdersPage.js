import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { formatStatus, getInFlightStatusBadgeVariant } from '../../utils/formatters';
const COMMENT_PREVIEW_WORDS = 25;
function commentPreview(text) {
    if (text == null || !String(text).trim())
        return '';
    const words = String(text).trim().split(/\s+/);
    if (words.length <= COMMENT_PREVIEW_WORDS)
        return words.join(' ');
    return words.slice(0, COMMENT_PREVIEW_WORDS).join(' ') + '…';
}
function formatEta(eta) {
    if (eta == null)
        return '—';
    const d = new Date(eta);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
export function AMMReturnedWorkOrdersPage() {
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
    const returnedWorkOrders = ownedWorkOrders.filter((wo) => wo.currentStatus === WorkOrderStatus.CREATED ||
        wo.currentStatus === WorkOrderStatus.REJECTED);
    const sorted = [...returnedWorkOrders].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return (_jsxs(Layout, { screenTitle: "Vra\u0107eni radni nalozi", children: [_jsxs("div", { className: "max-w-4xl mx-auto space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Vra\u0107eni radni nalozi" }), _jsx("p", { className: "text-sm text-gray-600 mt-0.5", children: "Returned or rejected by service provider (S1) \u2014 review and resend or close" })] }), _jsx(Link, { to: "/amm", children: _jsx(Button, { type: "button", variant: "secondary", children: "Natrag na nadzornu plo\u010Du" }) })] }), isLoading ? (_jsx("p", { className: "text-gray-500", children: "Loading\u2026" })) : sorted.length === 0 ? (_jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600", children: "Nema vra\u0107enih radnih naloga." })) : (_jsx("ul", { className: "space-y-2", children: sorted.map((wo) => (_jsx("li", { children: _jsx(WorkOrderPreviewRow, { workOrder: wo, onOpen: () => setSelectedWorkOrderId(wo.id) }) }, wo.id))) }))] }), selectedWorkOrderId != null && (_jsx(AMMWorkOrderDetailModal, { workOrderId: selectedWorkOrderId, onClose: () => setSelectedWorkOrderId(null) }))] }));
}
function WorkOrderPreviewRow({ workOrder, onOpen, }) {
    const commentPreviewText = commentPreview(workOrder.commentToVendor);
    return (_jsxs("button", { type: "button", className: "w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-rose-50/50 hover:border-rose-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen();
        }, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Work Order #", workOrder.id] }), _jsxs("span", { className: "text-sm text-gray-600", children: ["Ticket #", workOrder.ticketId] }), workOrder.urgent && (_jsx(Badge, { variant: "danger", children: "Hitno" })), _jsx(Badge, { variant: getInFlightStatusBadgeVariant(workOrder.currentStatus), children: formatStatus(workOrder.currentStatus) }), _jsx("span", { className: "text-sm text-gray-600", children: workOrder.vendorCompanyName }), workOrder.storeName && (_jsx("span", { className: "text-sm text-gray-600", children: workOrder.storeName })), _jsx("span", { className: "text-sm text-gray-500", children: new Date(workOrder.updatedAt).toLocaleDateString() })] }), _jsxs("div", { className: "flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-700", children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium text-gray-600", children: "Owner:" }), " AMM (returned)"] }), _jsxs("span", { children: [_jsx("span", { className: "font-medium text-gray-600", children: "ETA:" }), " ", formatEta(workOrder.eta)] })] }), commentPreviewText && (_jsxs("p", { className: "text-sm text-gray-600 mt-2 line-clamp-2", title: workOrder.commentToVendor ?? undefined, children: [_jsx("span", { className: "font-medium text-gray-700", children: "Comment to vendor: " }), commentPreviewText] }))] }));
}
