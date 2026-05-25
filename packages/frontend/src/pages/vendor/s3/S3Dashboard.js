import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { TerminalWorkOrderStatuses, WorkOrderStatus } from '../../../types/statuses';
export function S3Dashboard() {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [listMode, setListMode] = useState(null);
    const [selectedWOId, setSelectedWOId] = useState(null);
    const [batchCreating, setBatchCreating] = useState(false);
    const [batchError, setBatchError] = useState(null);
    const { data: workOrders = [], isLoading } = useQuery({
        queryKey: ['work-orders', 's3', session?.companyId],
        queryFn: () => workOrdersAPI.list({
            vendorCompanyId: session.companyId,
        }),
        enabled: session?.companyId != null,
    });
    const serviceCompleted = workOrders.filter((wo) => wo.currentStatus === WorkOrderStatus.SERVICE_COMPLETED);
    const revisionRequested = workOrders.filter((wo) => wo.currentStatus === WorkOrderStatus.COST_REVISION_REQUESTED);
    // Approved but not yet in an invoice batch (eligible for "Create Invoice Batch")
    const approved = workOrders.filter((wo) => wo.currentStatus === WorkOrderStatus.COST_PROPOSAL_APPROVED && wo.invoiceBatchId == null);
    const closedNoCost = workOrders.filter((wo) => wo.currentStatus === WorkOrderStatus.CLOSED_WITHOUT_COST);
    // Approved and already batched — show in "Closed Work Orders" (read-only)
    const batchedApproved = workOrders.filter((wo) => wo.currentStatus === WorkOrderStatus.COST_PROPOSAL_APPROVED && wo.invoiceBatchId != null);
    const closedWorkOrders = [...closedNoCost, ...batchedApproved];
    // Work orders from your company that S3 is not currently owner of
    const myWorkOrders = workOrders.filter((wo) => wo.currentOwnerId !== session?.userId);
    const myActiveCount = myWorkOrders.filter((wo) => !TerminalWorkOrderStatuses.includes(wo.currentStatus)).length;
    const myClosedCount = myWorkOrders.filter((wo) => TerminalWorkOrderStatuses.includes(wo.currentStatus)).length;
    const listItems = listMode === 'service-completed'
        ? serviceCompleted
        : listMode === 'revision'
            ? revisionRequested
            : listMode === 'approved'
                ? approved
                : listMode === 'closed'
                    ? closedWorkOrders
                    : [];
    const listTitle = listMode === 'service-completed'
        ? 'Servis završen (čeka ponudu troška)'
        : listMode === 'revision'
            ? 'Zatražena revizija ponude'
            : listMode === 'approved'
                ? 'Odobrene ponude troška'
                : listMode === 'closed'
                    ? 'Zatvoreni radni nalozi'
                    : '';
    return (_jsxs(Layout, { screenTitle: "Nadzorna plo\u010Da", children: [_jsxs("div", { className: "space-y-6", children: [isLoading ? (_jsx(Card, { children: _jsx("p", { className: "text-gray-600", children: "U\u010Ditavanje radnih naloga..." }) })) : (_jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs(Card, { className: "bg-amber-50 border-amber-200 cursor-pointer hover:shadow-md transition", onClick: () => setListMode('service-completed'), children: [_jsx("h3", { className: "font-medium text-amber-900 mb-1", children: "Servis zavr\u0161en (\u010Deka ponudu tro\u0161ka)" }), _jsx("p", { className: "text-3xl font-bold text-amber-700", children: serviceCompleted.length }), _jsx("p", { className: "text-xs text-amber-600 mt-1", children: "\u010Ceka ponudu tro\u0161ka" })] }), _jsxs(Card, { className: "bg-orange-50 border-orange-200 cursor-pointer hover:shadow-md transition", onClick: () => setListMode('revision'), children: [_jsx("h3", { className: "font-medium text-orange-900 mb-1", children: "Zatra\u017Eena revizija ponude" }), _jsx("p", { className: "text-3xl font-bold text-orange-700", children: revisionRequested.length }), _jsx("p", { className: "text-xs text-orange-600 mt-1", children: "Prera\u010Dunajte i ponovo po\u0161aljite" })] }), _jsxs(Card, { className: "bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition", onClick: () => setListMode('approved'), children: [_jsx("h3", { className: "font-medium text-green-900 mb-1", children: "Odobrene ponude tro\u0161ka" }), _jsx("p", { className: "text-3xl font-bold text-green-700", children: approved.length }), _jsx("p", { className: "text-xs text-green-600 mt-1", children: "Samo pregled" })] }), _jsxs(Card, { className: "bg-gray-100 border-gray-200 cursor-pointer hover:shadow-md transition", onClick: () => setListMode('closed'), children: [_jsx("h3", { className: "font-medium text-gray-900 mb-1", children: "Zatvoreni radni nalozi" }), _jsx("p", { className: "text-3xl font-bold text-gray-600", children: closedWorkOrders.length }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Samo pregled" })] })] })), listMode != null && (_jsx(S3WorkOrderList, { items: listItems, title: listTitle, onBack: () => setListMode(null), onSelectWo: (id) => setSelectedWOId(id), isApprovedList: listMode === 'approved', batchCreating: batchCreating, batchError: batchError, onCreateBatch: listMode === 'approved'
                            ? async (workOrderIds) => {
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
                                    window.setTimeout(() => URL.revokeObjectURL(pdfObjectUrl), 60000);
                                }
                                catch (e) {
                                    const err = e;
                                    const msg = err.response?.data?.error ??
                                        (e instanceof Error ? e.message : 'Failed to create batch');
                                    setBatchError(msg);
                                }
                                finally {
                                    setBatchCreating(false);
                                }
                            }
                            : undefined, onClearBatchError: () => setBatchError(null) })), _jsxs(Card, { className: "bg-slate-50 border-slate-200", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Moji radni nalozi" }), _jsxs("p", { className: "text-sm text-gray-600 mb-4", children: ["Radni nalozi iz va\u0161e tvrtke kojima trenutno niste vlasnik (", myWorkOrders.length, " ukupno). Samo pregled."] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Link, { to: "/vendor/s3/my-work-orders/active", children: _jsxs(Button, { type: "button", variant: "secondary", children: ["Aktivni radni nalozi (", myActiveCount, ")"] }) }), _jsx(Link, { to: "/vendor/s3/my-work-orders/closed", children: _jsxs(Button, { type: "button", variant: "secondary", children: ["Zatvoreni radni nalozi (", myClosedCount, ")"] }) })] })] })] }), selectedWOId != null && (_jsx(S3WorkOrderDetailModal, { workOrderId: selectedWOId, onClose: () => setSelectedWOId(null) }))] }));
}
