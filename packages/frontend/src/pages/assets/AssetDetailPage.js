import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Layout } from '../../components/shared/Layout';
import { apiClient } from '../../api/client';
import { formatAssetStatus, formatCategory, formatStatus } from '../../utils/formatters';
const STATUS_COLORS = {
    ACTIVE: 'bg-green-100 text-green-800',
    FAULTY: 'bg-red-100 text-red-800',
    IN_SERVICE: 'bg-yellow-100 text-yellow-800',
    DECOMMISSIONED: 'bg-gray-100 text-gray-600',
};
export function AssetDetailPage() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [activeTab, setActiveTab] = useState('tickets');
    const { data: asset, isLoading, isError } = useQuery({
        queryKey: ['asset-detail', id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/assets/${id}`);
            return data;
        },
        enabled: id != null,
    });
    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFile || !id)
                throw new Error('No file selected');
            const formData = new FormData();
            formData.append('file', selectedFile);
            const { data } = await apiClient.post(`/assets/${id}/attachments`, formData);
            return data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['asset-detail', id] });
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
    });
    const formatDate = (date) => {
        if (!date)
            return '—';
        return new Date(date).toLocaleDateString('en-GB');
    };
    const formatCurrency = (value) => {
        if (value === null)
            return '—';
        return `€${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const isWarrantyExpired = (date) => {
        if (!date)
            return false;
        return new Date(date) < new Date();
    };
    if (isLoading) {
        return (_jsx(Layout, { backLink: "/assets", backLabel: "\u2190 Back to Assets", children: _jsx("p", { className: "text-gray-500", children: "Loading asset..." }) }));
    }
    if (isError || !asset) {
        return (_jsx(Layout, { backLink: "/assets", backLabel: "\u2190 Back to Assets", children: _jsx("p", { className: "text-red-600", children: "Failed to load asset details." }) }));
    }
    return (_jsx(Layout, { backLink: "/assets", backLabel: "\u2190 Back to Assets", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: asset.name }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${STATUS_COLORS[asset.status]}`, children: formatAssetStatus(asset.status) })] }), _jsxs("p", { className: "text-sm text-gray-600 mt-2", children: [asset.category?.name ?? 'Uncategorized', " \u2022 ", asset.store.name, " \u2022 ", asset.serialNumber ?? 'No serial'] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Detalji opreme" }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("span", { className: "text-gray-500", children: "Proizvo\u0111a\u010D / Model" }), _jsxs("span", { className: "text-gray-900 text-right", children: [asset.manufacturer ?? '—', " / ", asset.model ?? '—'] })] }), _jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("span", { className: "text-gray-500", children: "Datum nabave" }), _jsx("span", { className: "text-gray-900", children: formatDate(asset.purchaseDate) })] }), _jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("span", { className: "text-gray-500", children: "Istek jamstva" }), _jsx("span", { className: isWarrantyExpired(asset.warrantyExpiry) ? 'text-red-600 font-medium' : 'text-gray-900', children: asset.warrantyExpiry == null
                                                        ? 'Bez roka jamstva'
                                                        : isWarrantyExpired(asset.warrantyExpiry)
                                                            ? `Isteklo (${formatDate(asset.warrantyExpiry)})`
                                                            : formatDate(asset.warrantyExpiry) })] }), _jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("span", { className: "text-gray-500", children: "Nabavna vrijednost" }), _jsx("span", { className: "text-gray-900", children: formatCurrency(asset.purchaseValue) })] }), _jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("span", { className: "text-gray-500", children: "Knjigovodstvena vrijednost" }), _jsx("span", { className: "text-gray-900 font-semibold", children: formatCurrency(asset.currentValue) })] }), _jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("span", { className: "text-gray-500", children: "Stopa amortizacije" }), _jsx("span", { className: "text-gray-900", children: asset.category?.depreciationRate != null ? `${asset.category.depreciationRate}%` : '—' })] })] }), asset.notes && (_jsxs("div", { className: "mt-4 pt-4 border-t border-gray-100", children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Napomene" }), _jsx("p", { className: "text-sm text-gray-800 whitespace-pre-wrap", children: asset.notes })] }))] }), _jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Dokumenti" }), asset.attachments.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 mb-4", children: "Nema u\u010Ditanih dokumenata." })) : (_jsx("div", { className: "space-y-2 mb-4", children: asset.attachments.map((attachment) => (_jsxs("div", { className: "flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2", children: [_jsx("span", { className: "text-sm text-gray-900 truncate", children: attachment.fileName }), _jsx("span", { className: "text-xs text-gray-500 whitespace-nowrap", children: formatDate(attachment.createdAt) })] }, attachment.id))) })), _jsxs("form", { className: "flex flex-col sm:flex-row gap-2", onSubmit: (e) => {
                                        e.preventDefault();
                                        uploadMutation.mutate();
                                    }, children: [_jsx("input", { ref: fileInputRef, type: "file", onChange: (e) => setSelectedFile(e.target.files?.[0] ?? null), className: "block w-full text-sm text-gray-700 border border-gray-300 rounded-lg file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-gray-100 file:text-gray-700" }), _jsx("button", { type: "submit", disabled: !selectedFile || uploadMutation.isPending, className: "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50", children: uploadMutation.isPending ? 'Učitavanje...' : 'Učitaj' })] }), uploadMutation.isError && (_jsx("p", { className: "text-sm text-red-600 mt-2", children: uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Upload failed' }))] })] }), _jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Servisna povijest" }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsx("button", { type: "button", onClick: () => setActiveTab('tickets'), className: `px-3 py-1.5 rounded-lg text-sm ${activeTab === 'tickets'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: "Prijave" }), _jsx("button", { type: "button", onClick: () => setActiveTab('work-orders'), className: `px-3 py-1.5 rounded-lg text-sm ${activeTab === 'work-orders'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: "Radni nalozi" })] }), activeTab === 'tickets' ? (asset.tickets.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500", children: "Nema prijava za ovu opremu." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "ID" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Category" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Urgent" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Kreirao" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Datum" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: asset.tickets.map((ticket) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "px-4 py-3 text-gray-900 font-medium", children: ["#", ticket.id] }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: formatCategory(ticket.category) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "text-xs px-2 py-1 rounded bg-gray-100 text-gray-700", children: formatStatus(ticket.currentStatus) }) }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: ticket.urgent ? '⚡' : '—' }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: ticket.createdBy.name }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: formatDate(ticket.createdAt) })] }, ticket.id))) })] }) }))) : asset.workOrders.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500", children: "Nema radnih naloga za ovu opremu." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "WO ID" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Ticket Category" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Izvo\u0111a\u010D" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Date" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: asset.workOrders.map((workOrder) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "px-4 py-3 text-gray-900 font-medium", children: ["#", workOrder.id] }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: formatCategory(workOrder.ticket.category) }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: workOrder.vendorCompany.name }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "text-xs px-2 py-1 rounded bg-gray-100 text-gray-700", children: formatStatus(workOrder.currentStatus) }) }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: formatDate(workOrder.createdAt) })] }, workOrder.id))) })] }) }))] })] }) }));
}
export default AssetDetailPage;
