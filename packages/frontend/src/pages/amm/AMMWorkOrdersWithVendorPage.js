import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
/** Display current owner: technician name when assigned, otherwise Vendor (S1) or AMM */
function currentOwnerLabel(wo) {
    if (wo.assignedTechnicianName != null && wo.assignedTechnicianName !== '') {
        return wo.assignedTechnicianName;
    }
    return wo.currentOwnerType === 'VENDOR' ? 'Vendor (S1)' : 'AMM';
}
export function AMMWorkOrdersWithVendorPage() {
    const { session } = useSession();
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
    const { data: workOrdersWithVendor = [], isLoading } = useQuery({
        queryKey: ['work-orders', 'amm-region-vendor', session?.regionId],
        queryFn: () => workOrdersAPI.list({
            regionId: session.regionId,
            currentOwnerType: 'VENDOR',
        }),
        enabled: session?.regionId != null,
    });
    const sorted = [...workOrdersWithVendor].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return (_jsxs(Layout, { screenTitle: "Radni nalozi kod izvo\u0111a\u010Da", children: [_jsxs("div", { className: "max-w-4xl mx-auto space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Radni nalozi kod izvo\u0111a\u010Da" }), _jsx("p", { className: "text-sm text-gray-600 mt-0.5", children: "Work orders sent to vendors in your region \u2014 newest first" })] }), _jsx(Link, { to: "/amm", children: _jsx(Button, { type: "button", variant: "secondary", children: "Natrag na nadzornu plo\u010Du" }) })] }), isLoading ? (_jsx("p", { className: "text-gray-500", children: "Loading\u2026" })) : sorted.length === 0 ? (_jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600", children: "Nema radnih naloga kod izvo\u0111a\u010Da." })) : (_jsx("ul", { className: "space-y-2", children: sorted.map((wo) => (_jsx("li", { children: _jsx(WorkOrderPreviewRow, { workOrder: wo, onOpen: () => setSelectedWorkOrderId(wo.id) }) }, wo.id))) }))] }), selectedWorkOrderId != null && (_jsx(AMMWorkOrderDetailModal, { workOrderId: selectedWorkOrderId, onClose: () => setSelectedWorkOrderId(null) }))] }));
}
function WorkOrderPreviewRow({ workOrder, onOpen, }) {
    const commentPreviewText = commentPreview(workOrder.commentToVendor);
    return (_jsxs("button", { type: "button", className: "w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-sky-50/50 hover:border-sky-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen();
        }, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Work Order #", workOrder.id] }), _jsxs("span", { className: "text-sm text-gray-600", children: ["Ticket #", workOrder.ticketId] }), workOrder.urgent && (_jsx(Badge, { variant: "danger", children: "Hitno" })), _jsx(Badge, { variant: getInFlightStatusBadgeVariant(workOrder.currentStatus), children: formatStatus(workOrder.currentStatus) }), _jsx("span", { className: "text-sm text-gray-600", children: workOrder.vendorCompanyName }), workOrder.storeName && (_jsx("span", { className: "text-sm text-gray-600", children: workOrder.storeName })), _jsx("span", { className: "text-sm text-gray-500", children: new Date(workOrder.updatedAt).toLocaleDateString() })] }), _jsxs("div", { className: "flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-700", children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium text-gray-600", children: "Owner:" }), " ", currentOwnerLabel(workOrder)] }), _jsxs("span", { children: [_jsx("span", { className: "font-medium text-gray-600", children: "ETA:" }), " ", formatEta(workOrder.eta)] })] }), commentPreviewText && (_jsxs("p", { className: "text-sm text-gray-600 mt-2 line-clamp-2", title: workOrder.commentToVendor ?? undefined, children: [_jsx("span", { className: "font-medium text-gray-700", children: "Comment to vendor: " }), commentPreviewText] }))] }));
}
