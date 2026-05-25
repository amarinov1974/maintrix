import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * S3 Work Order List — Section 15
 * Approved list: checkboxes + "Create Invoice Batch (PDF)" button.
 */
import { useState } from 'react';
import { Card, Button } from '../../../components/shared';
import { formatStatus } from '../../../utils/formatters';
export function S3WorkOrderList({ items, title, onBack, onSelectWo, isApprovedList = false, batchCreating = false, batchError = null, onCreateBatch, onClearBatchError, }) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const allSelected = items.length > 0 && selectedIds.size === items.length;
    const toggleSelectAll = () => {
        if (allSelected)
            setSelectedIds(new Set());
        else
            setSelectedIds(new Set(items.map((wo) => wo.id)));
    };
    const toggleOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const handleCreateBatch = async () => {
        if (!onCreateBatch || selectedIds.size === 0)
            return;
        await onCreateBatch([...selectedIds]);
        setSelectedIds(new Set());
    };
    return (_jsxs(Card, { children: [_jsxs("div", { className: "flex items-center justify-between mb-4 flex-wrap gap-2", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: title }), _jsxs("div", { className: "flex items-center gap-2", children: [isApprovedList && onCreateBatch && (_jsx(Button, { type: "button", variant: "primary", onClick: handleCreateBatch, disabled: selectedIds.size === 0 || batchCreating, children: batchCreating ? 'Kreiranje…' : 'Kreiraj račun (PDF)' })), _jsx(Button, { type: "button", variant: "secondary", onClick: onBack, children: "Natrag" })] })] }), batchError != null && (_jsxs("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex justify-between items-center", children: [_jsx("span", { children: batchError }), onClearBatchError && (_jsx("button", { type: "button", onClick: onClearBatchError, className: "underline", children: "Odbaci" }))] })), items.length === 0 ? (_jsx("p", { className: "text-gray-600", children: "Nema radnih naloga." })) : (_jsxs("div", { className: "space-y-2", children: [isApprovedList && (_jsxs("div", { className: "flex items-center gap-3 py-2 border-b border-gray-200", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: allSelected, onChange: toggleSelectAll, className: "rounded border-gray-300" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Ozna\u010Di sve" })] }), _jsxs("span", { className: "text-sm text-gray-500", children: [selectedIds.size, " od ", items.length, " odabrano"] })] })), items.map((wo) => (_jsxs("div", { className: "p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition flex justify-between items-center gap-3", onClick: (e) => {
                            if (isApprovedList && e.target.closest('input[type="checkbox"]'))
                                return;
                            onSelectWo(wo.id);
                        }, role: "button", tabIndex: 0, onKeyDown: (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectWo(wo.id);
                            }
                        }, children: [isApprovedList && (_jsx("input", { type: "checkbox", checked: selectedIds.has(wo.id), onChange: () => toggleOne(wo.id), onClick: (e) => e.stopPropagation(), className: "rounded border-gray-300 shrink-0", "aria-label": `Označi RN #${wo.id}` })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-gray-900", children: wo.storeName ?? `WO #${wo.id}` }), _jsxs("span", { className: "text-sm text-gray-500 ml-2", children: ["Prijava #", wo.ticketId] }), wo.checkoutTs != null && (_jsxs("span", { className: "text-sm text-gray-500 ml-2", children: ["Zavr\u0161eno: ", new Date(wo.checkoutTs).toLocaleDateString()] }))] }), _jsx("span", { className: "text-sm font-medium text-gray-600 shrink-0", children: formatStatus(wo.currentStatus) })] }, wo.id)))] }))] }));
}
