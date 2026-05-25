import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/shared/Layout';
import { apiClient } from '../../api/client';
import { useSession } from '../../contexts/SessionContext';
import { formatAssetStatus } from '../../utils/formatters';
const STATUS_COLORS = {
    ACTIVE: 'bg-green-100 text-green-800',
    FAULTY: 'bg-red-100 text-red-800',
    IN_SERVICE: 'bg-yellow-100 text-yellow-800',
    DECOMMISSIONED: 'bg-gray-100 text-gray-600',
};
export function AssetListPage() {
    const { session } = useSession();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const { data: assetsResponse, isLoading } = useQuery({
        queryKey: ['assets', selectedStore, selectedCategory, selectedStatus, search, page, limit],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedStore)
                params.append('storeId', selectedStore);
            if (selectedCategory)
                params.append('categoryId', selectedCategory);
            if (selectedStatus)
                params.append('status', selectedStatus);
            if (search)
                params.append('search', search);
            params.append('page', String(page));
            params.append('limit', String(limit));
            const { data } = await apiClient.get(`/assets?${params.toString()}`);
            return data;
        },
    });
    const { data: storesData } = useQuery({
        queryKey: ['admin-stores'],
        queryFn: async () => {
            const { data } = await apiClient.get('/stores');
            return data.stores;
        },
    });
    const { data: categoriesData } = useQuery({
        queryKey: ['admin-asset-categories'],
        queryFn: async () => {
            const { data } = await apiClient.get('/assets/categories');
            return data.categories;
        },
    });
    const assets = assetsResponse?.assets ?? [];
    const pagination = assetsResponse?.pagination;
    const stores = storesData ?? [];
    const categories = categoriesData ?? [];
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
    return (_jsx(Layout, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Registar opreme" }), _jsxs("p", { className: "text-gray-600", children: ["Registar opreme za ", session?.companyName] })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsx("input", { type: "text", placeholder: "Pretra\u017Ei naziv, serijski br., proizvo\u0111a\u010Da...", value: search, onChange: (e) => { setSearch(e.target.value); setPage(1); }, className: "col-span-2 border rounded-lg px-3 py-2 text-sm" }), _jsxs("select", { value: selectedStore, onChange: (e) => { setSelectedStore(e.target.value); setPage(1); }, className: "border rounded-lg px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "Sve poslovnice" }), stores.map(s => _jsx("option", { value: s.id, children: s.name }, s.id))] }), _jsxs("select", { value: selectedCategory, onChange: (e) => { setSelectedCategory(e.target.value); setPage(1); }, className: "border rounded-lg px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "Sve kategorije" }), categories.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] }), _jsxs("select", { value: selectedStatus, onChange: (e) => { setSelectedStatus(e.target.value); setPage(1); }, className: "border rounded-lg px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "Svi statusi" }), _jsx("option", { value: "ACTIVE", children: "Aktivno" }), _jsx("option", { value: "FAULTY", children: "Kvar" }), _jsx("option", { value: "IN_SERVICE", children: "Na servisu" }), _jsx("option", { value: "DECOMMISSIONED", children: "Otpisano" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-sm text-gray-500", children: isLoading ? 'Učitavanje...' : `${pagination?.total ?? assets.length} opreme pronađeno` }), _jsxs("select", { value: limit, onChange: (e) => { setLimit(Number(e.target.value)); setPage(1); }, className: "border rounded-lg px-2 py-1 text-sm", children: [_jsx("option", { value: 25, children: "25 per page" }), _jsx("option", { value: 50, children: "50 per page" }), _jsx("option", { value: 100, children: "100 per page" })] })] })] }), isLoading ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : assets.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "Nema opreme za prikaz." })) : (_jsx("div", { className: "border rounded-lg overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Oprema" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Kategorija" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Poslovnica" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Serijski br." }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Jamstvo" }), _jsx("th", { className: "px-4 py-3 text-right font-medium text-gray-700", children: "Nabavna vrijednost" }), _jsx("th", { className: "px-4 py-3 text-right font-medium text-gray-700", children: "Knjigovodstvena vrijednost" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Status" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: assets.map((asset) => (_jsxs("tr", { onClick: () => navigate(`/assets/${asset.id}`), className: "hover:bg-gray-50 cursor-pointer", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("div", { className: "font-medium text-gray-900", children: asset.name }), _jsxs("div", { className: "text-xs text-gray-500", children: [asset.manufacturer, " ", asset.model] })] }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: asset.category?.name ?? '—' }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: asset.store.name }), _jsx("td", { className: "px-4 py-3 text-gray-600 font-mono text-xs", children: asset.serialNumber ?? '—' }), _jsx("td", { className: "px-4 py-3", children: _jsxs("span", { className: isWarrantyExpired(asset.warrantyExpiry) ? 'text-red-600 font-medium' : 'text-gray-600', children: [formatDate(asset.warrantyExpiry), isWarrantyExpired(asset.warrantyExpiry) && ' ⚠️'] }) }), _jsx("td", { className: "px-4 py-3 text-right text-gray-600", children: formatCurrency(asset.purchaseValue) }), _jsx("td", { className: "px-4 py-3 text-right font-medium text-gray-900", children: formatCurrency(asset.currentValue) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `text-xs px-2 py-1 rounded ${STATUS_COLORS[asset.status]}`, children: formatAssetStatus(asset.status) }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "text-blue-600 text-sm", children: "Pregled \u2192" }) })] }, asset.id))) })] }) }) })), pagination && pagination.totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["Showing ", ((pagination.page - 1) * pagination.limit) + 1, "\u2013", Math.min(pagination.page * pagination.limit, pagination.total), " of ", pagination.total, " assets"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setPage(1), disabled: pagination.page === 1, className: "px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed", children: "\u00AB" }), _jsx("button", { onClick: () => setPage(p => Math.max(1, p - 1)), disabled: pagination.page === 1, className: "px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed", children: "\u2039 Prev" }), _jsxs("span", { className: "text-sm text-gray-700 px-2", children: ["Page ", pagination.page, " of ", pagination.totalPages] }), _jsx("button", { onClick: () => setPage(p => Math.min(pagination.totalPages, p + 1)), disabled: pagination.page === pagination.totalPages, className: "px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed", children: "Next \u203A" }), _jsx("button", { onClick: () => setPage(pagination.totalPages), disabled: pagination.page === pagination.totalPages, className: "px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed", children: "\u00BB" })] })] }))] }) }));
}
export default AssetListPage;
