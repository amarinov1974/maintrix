import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ADMIN Dashboard
 * Preventive Maintenance plan upload and management
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/shared/Layout';
import { AlertModal, ConfirmModal, Toast } from '../../components/shared';
import { useToast } from '../../hooks/useToast';
import { apiClient } from '../../api/client';
import { preventiveMaintenanceAPI, } from '../../api/preventive-maintenance';
import { formatCategory, formatAssetStatus } from '../../utils/formatters';
const INTERNAL_ROLES = ['SM', 'AM', 'AMM', 'D', 'C2', 'ADMIN', 'BOD'];
const VENDOR_ROLES = ['S1', 'S2', 'S3'];
export function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users');
    const [showAddInternal, setShowAddInternal] = useState(false);
    const [showAddVendor, setShowAddVendor] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingVendor, setEditingVendor] = useState(null);
    const [showAddStore, setShowAddStore] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [showAddAsset, setShowAddAsset] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const fileInputRef = useRef(null);
    const [pmStep, setPmStep] = useState('upload');
    const [parsedRows, setParsedRows] = useState([]);
    const [parseErrors, setParseErrors] = useState([]);
    const [importSummary, setImportSummary] = useState('');
    const [selectedPlanIds, setSelectedPlanIds] = useState(new Set());
    const [alertMessage, setAlertMessage] = useState(null);
    const [pendingDeactivate, setPendingDeactivate] = useState(null);
    const { message: toastMessage, showToast } = useToast();
    const confirmDeactivate = () => {
        if (pendingDeactivate == null)
            return;
        const opts = { onSuccess: () => showToast('Deaktivirano.') };
        switch (pendingDeactivate.kind) {
            case 'internal-user':
                deactivateInternalUser.mutate(pendingDeactivate.id, opts);
                break;
            case 'vendor-user':
                deactivateVendorUser.mutate(pendingDeactivate.id, opts);
                break;
            case 'store':
                deactivateStore.mutate(pendingDeactivate.id, opts);
                break;
            case 'asset':
                deactivateAsset.mutate(pendingDeactivate.id, opts);
                break;
        }
        setPendingDeactivate(null);
    };
    const queryClient = useQueryClient();
    const { data: internalUsers = [], isLoading: loadingInternal } = useQuery({
        queryKey: ['admin-internal-users'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/users/internal');
            return data.users;
        },
    });
    const { data: vendorUsers = [], isLoading: loadingVendors } = useQuery({
        queryKey: ['admin-vendor-users'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/users/vendor');
            return data.users;
        },
    });
    const { data: stores = [] } = useQuery({
        queryKey: ['admin-stores'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/stores');
            return data.stores;
        },
    });
    const { data: regions = [] } = useQuery({
        queryKey: ['admin-regions'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/regions');
            return data.regions;
        },
    });
    const { data: vendorCompanies = [] } = useQuery({
        queryKey: ['admin-vendor-companies'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/vendor-companies');
            return data.companies;
        },
    });
    const { data: stores2 = [], isLoading: loadingStores } = useQuery({
        queryKey: ['admin-stores-list'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/stores');
            return data.stores;
        },
    });
    const { data: adminAssets = [], isLoading: loadingAssets } = useQuery({
        queryKey: ['admin-assets-list'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/assets');
            return data.assets;
        },
        enabled: activeTab === 'assets',
    });
    const { data: adminCategories = [] } = useQuery({
        queryKey: ['admin-asset-categories'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/asset-categories');
            return data.categories;
        },
        enabled: activeTab === 'assets',
    });
    const createInternalUser = useMutation({
        mutationFn: async (data) => {
            await apiClient.post('/admin/users/internal', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
            setShowAddInternal(false);
        },
    });
    const updateInternalUser = useMutation({
        mutationFn: async ({ id, data }) => {
            await apiClient.put(`/admin/users/internal/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
            setEditingUser(null);
        },
    });
    const deactivateInternalUser = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/admin/users/internal/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
        },
    });
    const createVendorUser = useMutation({
        mutationFn: async (data) => {
            await apiClient.post('/admin/users/vendor', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-vendor-users'] });
            setShowAddVendor(false);
        },
    });
    const updateVendorUser = useMutation({
        mutationFn: async ({ id, data }) => {
            await apiClient.put(`/admin/users/vendor/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-vendor-users'] });
            setEditingVendor(null);
        },
    });
    const deactivateVendorUser = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/admin/users/vendor/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-vendor-users'] });
        },
    });
    const createStore = useMutation({
        mutationFn: async (data) => {
            await apiClient.post('/admin/stores', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-stores-list'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
            setShowAddStore(false);
        },
    });
    const updateStore = useMutation({
        mutationFn: async ({ id, data }) => {
            await apiClient.put(`/admin/stores/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-stores-list'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
            setEditingStore(null);
        },
    });
    const deactivateStore = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/admin/stores/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-stores-list'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
        },
    });
    const createAsset = useMutation({
        mutationFn: async (data) => {
            await apiClient.post('/admin/assets', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-assets-list'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setShowAddAsset(false);
        },
    });
    const updateAsset = useMutation({
        mutationFn: async ({ id, data }) => {
            await apiClient.put(`/admin/assets/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-assets-list'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setEditingAsset(null);
        },
    });
    const deactivateAsset = useMutation({
        mutationFn: async (id) => { await apiClient.delete(`/admin/assets/${id}`); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-assets-list'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });
    const { data: pmPlans = [], isLoading: plansLoading } = useQuery({
        queryKey: ['preventive-maintenance-plans'],
        queryFn: preventiveMaintenanceAPI.listPlans,
    });
    const parseMutation = useMutation({
        mutationFn: preventiveMaintenanceAPI.parseFile,
        onSuccess: (result) => {
            setParsedRows(result.rows);
            setParseErrors(result.errors);
            setPmStep('preview');
        },
    });
    const importMutation = useMutation({
        mutationFn: preventiveMaintenanceAPI.importPlans,
        onSuccess: (result) => {
            setImportSummary(result.summary);
            setPmStep('success');
            queryClient.invalidateQueries({ queryKey: ['preventive-maintenance-plans'] });
        },
    });
    const createWOMutation = useMutation({
        mutationFn: preventiveMaintenanceAPI.createWorkOrdersFromPlans,
        onSuccess: (result) => {
            setSelectedPlanIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['preventive-maintenance-plans'] });
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            setAlertMessage(result.summary);
        },
    });
    const handleAddInternalSubmit = (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        createInternalUser.mutate({
            name: fd.get('name'),
            email: fd.get('email') || null,
            role: fd.get('role'),
            storeId: fd.get('storeId') ? parseInt(fd.get('storeId')) : null,
            regionId: fd.get('regionId') ? parseInt(fd.get('regionId')) : null,
        });
    };
    const handleEditInternalSubmit = (e) => {
        e.preventDefault();
        if (!editingUser)
            return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        updateInternalUser.mutate({
            id: editingUser.id,
            data: {
                name: fd.get('name'),
                email: fd.get('email') || null,
                role: fd.get('role'),
                storeId: fd.get('storeId') ? parseInt(fd.get('storeId')) : null,
                regionId: fd.get('regionId') ? parseInt(fd.get('regionId')) : null,
            },
        });
    };
    const handleAddVendorSubmit = (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        createVendorUser.mutate({
            name: fd.get('name'),
            email: fd.get('email') || null,
            role: fd.get('role'),
            vendorCompanyId: fd.get('vendorCompanyId'),
        });
    };
    const handleEditVendorSubmit = (e) => {
        e.preventDefault();
        if (!editingVendor)
            return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        updateVendorUser.mutate({
            id: editingVendor.id,
            data: {
                name: fd.get('name'),
                email: fd.get('email') || null,
                role: fd.get('role'),
            },
        });
    };
    const handleAddStoreSubmit = (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        createStore.mutate({
            name: fd.get('name'),
            address: fd.get('address') || null,
            regionId: fd.get('regionId'),
        });
    };
    const handleEditStoreSubmit = (e) => {
        e.preventDefault();
        if (!editingStore)
            return;
        const form = e.currentTarget;
        const fd = new FormData(form);
        updateStore.mutate({
            id: editingStore.id,
            data: {
                name: fd.get('name'),
                address: fd.get('address') || null,
                regionId: fd.get('regionId'),
            },
        });
    };
    const handleAddAssetSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        createAsset.mutate({
            name: fd.get('name'),
            storeId: fd.get('storeId'),
            categoryId: fd.get('categoryId') || null,
            serialNumber: fd.get('serialNumber') || null,
            manufacturer: fd.get('manufacturer') || null,
            model: fd.get('model') || null,
            purchaseDate: fd.get('purchaseDate') || null,
            warrantyExpiry: fd.get('warrantyExpiry') || null,
            purchaseValue: fd.get('purchaseValue') || null,
            status: fd.get('status') || 'ACTIVE',
            notes: fd.get('notes') || null,
        });
    };
    const handleEditAssetSubmit = (e) => {
        e.preventDefault();
        if (!editingAsset)
            return;
        const fd = new FormData(e.currentTarget);
        updateAsset.mutate({
            id: editingAsset.id,
            data: {
                name: fd.get('name'),
                storeId: fd.get('storeId'),
                categoryId: fd.get('categoryId') || null,
                serialNumber: fd.get('serialNumber') || null,
                manufacturer: fd.get('manufacturer') || null,
                model: fd.get('model') || null,
                purchaseDate: fd.get('purchaseDate') || null,
                warrantyExpiry: fd.get('warrantyExpiry') || null,
                purchaseValue: fd.get('purchaseValue') || null,
                status: fd.get('status'),
                notes: fd.get('notes') || null,
            },
        });
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        parseMutation.mutate(file);
        e.target.value = '';
    };
    const handleConfirmImport = () => {
        if (parsedRows.length > 0)
            importMutation.mutate(parsedRows);
    };
    const handlePmReset = () => {
        setPmStep('upload');
        setParsedRows([]);
        setParseErrors([]);
        setImportSummary('');
        fileInputRef.current?.click();
    };
    const togglePlanSelection = (id) => {
        setSelectedPlanIds((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const toggleAllPlans = () => {
        const planIds = pmPlans.map((p) => p.id);
        if (selectedPlanIds.size === planIds.length)
            setSelectedPlanIds(new Set());
        else
            setSelectedPlanIds(new Set(planIds));
    };
    const handleCreateWorkOrders = () => {
        if (selectedPlanIds.size === 0) {
            alert('Select at least one plan');
            return;
        }
        createWOMutation.mutate(Array.from(selectedPlanIds));
    };
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Admin panel" }), _jsx("p", { className: "text-gray-600", children: "Upravljanje korisnicima i postavkama sustava" })] }), _jsx(Link, { to: "/energy/stores", className: "text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-4 py-2 bg-blue-50 hover:bg-blue-100 transition", children: "Energetika \u2192" })] }), _jsx("div", { className: "border-b border-gray-200", children: _jsx("nav", { className: "flex gap-6", children: [
                                { key: 'users', label: 'Interni korisnici' },
                                { key: 'vendors', label: 'Izvođači' },
                                { key: 'stores', label: 'Poslovnice' },
                                { key: 'assets', label: 'Oprema' },
                                { key: 'pm', label: 'PM planovi' },
                            ].map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab.key), className: `pb-3 text-sm font-medium border-b-2 transition ${activeTab === tab.key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: tab.label }, tab.key))) }) }), activeTab === 'users' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Interni korisnici (", internalUsers.filter(u => u.active).length, " aktivnih)"] }), _jsx("button", { onClick: () => setShowAddInternal(true), className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700", children: "+ Dodaj korisnika" })] }), showAddInternal && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-gray-900 mb-3", children: "New Internal User" }), _jsxs("form", { onSubmit: handleAddInternalSubmit, className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Ime *" }), _jsx("input", { name: "name", required: true, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "E-mail *" }), _jsx("input", { name: "email", type: "email", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Uloga *" }), _jsxs("select", { name: "role", required: true, className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Odaberite --" }), INTERNAL_ROLES.map(r => _jsx("option", { value: r, children: r }, r))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Poslovnica *" }), _jsxs("select", { name: "storeId", className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Not assigned --" }), stores.map(s => _jsx("option", { value: s.id, children: s.name }, s.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Regija *" }), _jsxs("select", { name: "regionId", className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Not assigned --" }), regions.map(r => _jsx("option", { value: r.id, children: r.name }, r.id))] })] }), _jsxs("div", { className: "col-span-2 flex gap-2 justify-end", children: [_jsx("button", { type: "button", onClick: () => setShowAddInternal(false), className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" }), _jsx("button", { type: "submit", disabled: createInternalUser.isPending, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: createInternalUser.isPending ? 'Spremanje...' : 'Dodaj' })] })] })] })), loadingInternal ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : (_jsx("div", { className: "border rounded-lg overflow-hidden", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Ime" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "E-mail" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Uloga" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Poslovnica/Regija" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Akcije" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: internalUsers.map((user) => (_jsxs("tr", { className: !user.active ? 'bg-red-50 opacity-75' : '', children: [_jsxs("td", { className: "px-4 py-3 font-medium", children: [user.name, !user.active && _jsx("span", { className: "ml-2 text-xs text-red-600 font-normal", children: "(neaktivno)" })] }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: user.email || '—' }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded", children: user.role }) }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: user.store?.name || user.region?.name || '—' }), _jsx("td", { className: "px-4 py-3", children: !user.active ? (_jsx("span", { className: "text-xs px-2 py-1 rounded bg-red-100 text-red-800", children: "Neaktivno" })) : (_jsx("span", { className: "text-xs px-2 py-1 rounded bg-green-100 text-green-800", children: "Aktivno" })) }), _jsxs("td", { className: "px-4 py-3 flex gap-2", children: [_jsx("button", { onClick: () => setEditingUser(user), className: "text-blue-600 hover:underline text-xs", children: "Uredi" }), user.active ? (_jsx("button", { onClick: () => setPendingDeactivate({ kind: 'internal-user', id: user.id, name: user.name }), className: "text-red-600 hover:underline text-xs", children: "Deaktiviraj" })) : (_jsx("button", { onClick: () => updateInternalUser.mutate({ id: user.id, data: { active: true } }, { onSuccess: () => showToast('Aktivirano.') }), className: "text-green-600 hover:underline text-xs", children: "Aktiviraj" }))] })] }, user.id))) })] }) })), editingUser && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 w-full max-w-md", children: [_jsxs("h3", { className: "font-semibold text-gray-900 mb-4", children: ["Edit User \u2014 ", editingUser.name] }), _jsxs("form", { onSubmit: handleEditInternalSubmit, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Name" }), _jsx("input", { name: "name", defaultValue: editingUser.name, required: true, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { name: "email", type: "email", defaultValue: editingUser.email || '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Role" }), _jsx("select", { name: "role", defaultValue: editingUser.role, className: "w-full border rounded px-3 py-2 text-sm", children: INTERNAL_ROLES.map(r => _jsx("option", { value: r, children: r }, r)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Store" }), _jsxs("select", { name: "storeId", className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Not assigned --" }), stores.map(s => _jsx("option", { value: s.id, children: s.name }, s.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Region" }), _jsxs("select", { name: "regionId", className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Not assigned --" }), regions.map(r => _jsx("option", { value: r.id, children: r.name }, r.id))] })] }), _jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [_jsx("button", { type: "button", onClick: () => setEditingUser(null), className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" }), _jsx("button", { type: "submit", disabled: updateInternalUser.isPending, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: updateInternalUser.isPending ? 'Spremanje...' : 'Spremi' })] })] })] }) }))] })), activeTab === 'vendors' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Izvo\u0111a\u010Di (", vendorUsers.filter(u => u.active).length, " aktivnih)"] }), _jsx("button", { onClick: () => setShowAddVendor(true), className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700", children: "+ Dodaj izvo\u0111a\u010Da" })] }), showAddVendor && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-gray-900 mb-3", children: "New Vendor User" }), _jsxs("form", { onSubmit: handleAddVendorSubmit, className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Name *" }), _jsx("input", { name: "name", required: true, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { name: "email", type: "email", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Role *" }), _jsxs("select", { name: "role", required: true, className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Select --" }), VENDOR_ROLES.map(r => _jsx("option", { value: r, children: r }, r))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Tvrtka izvo\u0111a\u010Da *" }), _jsxs("select", { name: "vendorCompanyId", required: true, className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Odaberite --" }), vendorCompanies.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), _jsxs("div", { className: "col-span-2 flex gap-2 justify-end", children: [_jsx("button", { type: "button", onClick: () => setShowAddVendor(false), className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" }), _jsx("button", { type: "submit", disabled: createVendorUser.isPending, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: createVendorUser.isPending ? 'Spremanje...' : 'Dodaj' })] })] })] })), loadingVendors ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : (_jsx("div", { className: "border rounded-lg overflow-hidden", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Ime" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "E-mail" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Uloga" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Tvrtka" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Akcije" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: vendorUsers.map((user) => (_jsxs("tr", { className: !user.active ? 'bg-red-50 opacity-75' : '', children: [_jsxs("td", { className: "px-4 py-3 font-medium", children: [user.name, !user.active && _jsx("span", { className: "ml-2 text-xs text-red-600 font-normal", children: "(neaktivno)" })] }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: user.email || '—' }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded", children: user.role }) }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: user.vendorCompany.name }), _jsx("td", { className: "px-4 py-3", children: !user.active ? (_jsx("span", { className: "text-xs px-2 py-1 rounded bg-red-100 text-red-800", children: "Neaktivno" })) : (_jsx("span", { className: "text-xs px-2 py-1 rounded bg-green-100 text-green-800", children: "Aktivno" })) }), _jsxs("td", { className: "px-4 py-3 flex gap-2", children: [_jsx("button", { onClick: () => setEditingVendor(user), className: "text-blue-600 hover:underline text-xs", children: "Uredi" }), user.active ? (_jsx("button", { onClick: () => setPendingDeactivate({ kind: 'vendor-user', id: user.id, name: user.name }), className: "text-red-600 hover:underline text-xs", children: "Deaktiviraj" })) : (_jsx("button", { onClick: () => updateVendorUser.mutate({ id: user.id, data: { active: true } }, { onSuccess: () => showToast('Aktivirano.') }), className: "text-green-600 hover:underline text-xs", children: "Aktiviraj" }))] })] }, user.id))) })] }) })), editingVendor && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 w-full max-w-md", children: [_jsxs("h3", { className: "font-semibold text-gray-900 mb-4", children: ["Edit Vendor User \u2014 ", editingVendor.name] }), _jsxs("form", { onSubmit: handleEditVendorSubmit, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Name" }), _jsx("input", { name: "name", defaultValue: editingVendor.name, required: true, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { name: "email", type: "email", defaultValue: editingVendor.email || '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Role" }), _jsx("select", { name: "role", defaultValue: editingVendor.role, className: "w-full border rounded px-3 py-2 text-sm", children: VENDOR_ROLES.map(r => _jsx("option", { value: r, children: r }, r)) })] }), _jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [_jsx("button", { type: "button", onClick: () => setEditingVendor(null), className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" }), _jsx("button", { type: "submit", disabled: updateVendorUser.isPending, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: updateVendorUser.isPending ? 'Spremanje...' : 'Spremi' })] })] })] }) }))] })), activeTab === 'stores' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Poslovnice (", stores2.filter(s => s.active).length, " aktivnih)"] }), _jsx("button", { onClick: () => setShowAddStore(true), className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700", children: "+ Dodaj poslovnicu" })] }), showAddStore && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-gray-900 mb-3", children: "New Store" }), _jsxs("form", { onSubmit: handleAddStoreSubmit, className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Name *" }), _jsx("input", { name: "name", required: true, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Address" }), _jsx("input", { name: "address", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Region *" }), _jsxs("select", { name: "regionId", required: true, className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Odaberite --" }), regions.map(r => _jsx("option", { value: r.id, children: r.name }, r.id))] })] }), _jsxs("div", { className: "col-span-2 flex gap-2 justify-end", children: [_jsx("button", { type: "button", onClick: () => setShowAddStore(false), className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" }), _jsx("button", { type: "submit", disabled: createStore.isPending, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: createStore.isPending ? 'Spremanje...' : 'Dodaj' })] })] })] })), loadingStores ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : (_jsx("div", { className: "border rounded-lg overflow-hidden", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Naziv" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Adresa" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Regija" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Akcije" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: stores2.map((store) => (_jsxs("tr", { className: !store.active ? 'bg-red-50 opacity-75' : '', children: [_jsx("td", { className: "px-4 py-3 font-medium", children: store.name }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: store.address || '—' }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: store.region?.name || '—' }), _jsx("td", { className: "px-4 py-3", children: !store.active ? (_jsx("span", { className: "text-xs px-2 py-1 rounded bg-red-100 text-red-800", children: "Neaktivno" })) : (_jsx("span", { className: "text-xs px-2 py-1 rounded bg-green-100 text-green-800", children: "Aktivno" })) }), _jsxs("td", { className: "px-4 py-3 flex gap-2", children: [_jsx("button", { onClick: () => setEditingStore(store), className: "text-blue-600 hover:underline text-xs", children: "Uredi" }), store.active ? (_jsx("button", { onClick: () => setPendingDeactivate({ kind: 'store', id: store.id, name: store.name }), className: "text-red-600 hover:underline text-xs", children: "Deaktiviraj" })) : (_jsx("button", { onClick: () => updateStore.mutate({ id: store.id, data: { active: true } }, { onSuccess: () => showToast('Aktivirano.') }), className: "text-green-600 hover:underline text-xs", children: "Aktiviraj" }))] })] }, store.id))) })] }) })), editingStore && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 w-full max-w-md", children: [_jsxs("h3", { className: "font-semibold text-gray-900 mb-4", children: ["Edit Store \u2014 ", editingStore.name] }), _jsxs("form", { onSubmit: handleEditStoreSubmit, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Name" }), _jsx("input", { name: "name", defaultValue: editingStore.name, required: true, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Address" }), _jsx("input", { name: "address", defaultValue: editingStore.address || '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Region" }), _jsxs("select", { name: "regionId", className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Not assigned --" }), regions.map(r => _jsx("option", { value: r.id, children: r.name }, r.id))] })] }), _jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [_jsx("button", { type: "button", onClick: () => setEditingStore(null), className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" }), _jsx("button", { type: "submit", disabled: updateStore.isPending, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: updateStore.isPending ? 'Spremanje...' : 'Spremi' })] })] })] }) }))] })), activeTab === 'assets' && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Oprema (", adminAssets.filter(a => a.active).length, " aktivnih)"] }), _jsx("button", { onClick: () => setShowAddAsset(true), className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700", children: "+ Dodaj opremu" })] }), showAddAsset && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-gray-900 mb-3", children: "Nova oprema" }), _jsxs("form", { onSubmit: handleAddAssetSubmit, className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Naziv *" }), _jsx("input", { name: "name", required: true, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Poslovnica *" }), _jsxs("select", { name: "storeId", required: true, className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Odaberite --" }), stores2.map(s => _jsx("option", { value: s.id, children: s.name }, s.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Category" }), _jsxs("select", { name: "categoryId", className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Bez kategorije --" }), adminCategories.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Status" }), _jsxs("select", { name: "status", className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "ACTIVE", children: "Aktivno" }), _jsx("option", { value: "FAULTY", children: "Kvar" }), _jsx("option", { value: "IN_SERVICE", children: "Na servisu" }), _jsx("option", { value: "DECOMMISSIONED", children: "Otpisano" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Serijski broj" }), _jsx("input", { name: "serialNumber", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Proizvo\u0111a\u010D" }), _jsx("input", { name: "manufacturer", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Model" }), _jsx("input", { name: "model", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Nabavna vrijednost (\u20AC)" }), _jsx("input", { name: "purchaseValue", type: "number", step: "0.01", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Datum nabave" }), _jsx("input", { name: "purchaseDate", type: "date", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Istek jamstva" }), _jsx("input", { name: "warrantyExpiry", type: "date", className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Notes" }), _jsx("textarea", { name: "notes", rows: 2, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { className: "col-span-2 flex gap-2 justify-end", children: [_jsx("button", { type: "button", onClick: () => setShowAddAsset(false), className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" }), _jsx("button", { type: "submit", disabled: createAsset.isPending, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: createAsset.isPending ? 'Spremanje...' : 'Dodaj' })] })] })] })), loadingAssets ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : (_jsx("div", { className: "border rounded-lg overflow-hidden", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Naziv" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Poslovnica" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Kategorija" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Serijski br." }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-700", children: "Akcije" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: adminAssets.map((asset) => (_jsxs("tr", { className: !asset.active ? 'bg-red-50 opacity-75' : '', children: [_jsxs("td", { className: "px-4 py-3 font-medium", children: [asset.name, !asset.active && _jsx("span", { className: "ml-2 text-xs text-red-600 font-normal", children: "(neaktivno)" }), asset.manufacturer && _jsxs("div", { className: "text-xs text-gray-500", children: [asset.manufacturer, " ", asset.model] })] }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: asset.store.name }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: formatCategory(asset.category?.name ?? '') || '—' }), _jsx("td", { className: "px-4 py-3 text-gray-500 font-mono text-xs", children: asset.serialNumber ?? '—' }), _jsx("td", { className: "px-4 py-3", children: !asset.active ? (_jsx("span", { className: "text-xs px-2 py-1 rounded bg-red-100 text-red-800", children: "Neaktivno" })) : (_jsx("span", { className: `text-xs px-2 py-1 rounded ${asset.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                                asset.status === 'FAULTY' ? 'bg-red-100 text-red-800' :
                                                                    asset.status === 'IN_SERVICE' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-gray-100 text-gray-600'}`, children: formatAssetStatus(asset.status) })) }), _jsxs("td", { className: "px-4 py-3 flex gap-2", children: [_jsx("button", { onClick: () => setEditingAsset(asset), className: "text-blue-600 hover:underline text-xs", children: "Uredi" }), asset.active ? (_jsx("button", { onClick: () => setPendingDeactivate({ kind: 'asset', id: asset.id, name: asset.name }), className: "text-red-600 hover:underline text-xs", children: "Deaktiviraj" })) : (_jsx("button", { onClick: () => updateAsset.mutate({ id: asset.id, data: { active: true } }, { onSuccess: () => showToast('Aktivirano.') }), className: "text-green-600 hover:underline text-xs", children: "Aktiviraj" }))] })] }, asset.id))) })] }) })), editingAsset && (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto", children: [_jsxs("h3", { className: "font-semibold text-gray-900 mb-4", children: ["Uredi opremu \u2014 ", editingAsset.name] }), _jsxs("form", { onSubmit: handleEditAssetSubmit, className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Naziv *" }), _jsx("input", { name: "name", defaultValue: editingAsset.name, required: true, className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Poslovnica *" }), _jsx("select", { name: "storeId", defaultValue: editingAsset.store.id, required: true, className: "w-full border rounded px-3 py-2 text-sm", children: stores2.map(s => _jsx("option", { value: s.id, children: s.name }, s.id)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Category" }), _jsxs("select", { name: "categoryId", defaultValue: editingAsset.category?.id ?? '', className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "-- Bez kategorije --" }), adminCategories.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Status" }), _jsxs("select", { name: "status", defaultValue: editingAsset.status, className: "w-full border rounded px-3 py-2 text-sm", children: [_jsx("option", { value: "ACTIVE", children: "Aktivno" }), _jsx("option", { value: "FAULTY", children: "Kvar" }), _jsx("option", { value: "IN_SERVICE", children: "Na servisu" }), _jsx("option", { value: "DECOMMISSIONED", children: "Otpisano" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Serijski broj" }), _jsx("input", { name: "serialNumber", defaultValue: editingAsset.serialNumber ?? '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Proizvo\u0111a\u010D" }), _jsx("input", { name: "manufacturer", defaultValue: editingAsset.manufacturer ?? '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Model" }), _jsx("input", { name: "model", defaultValue: editingAsset.model ?? '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Nabavna vrijednost (\u20AC)" }), _jsx("input", { name: "purchaseValue", type: "number", step: "0.01", defaultValue: editingAsset.purchaseValue ?? '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Datum nabave" }), _jsx("input", { name: "purchaseDate", type: "date", defaultValue: editingAsset.purchaseDate ? editingAsset.purchaseDate.slice(0, 10) : '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Istek jamstva" }), _jsx("input", { name: "warrantyExpiry", type: "date", defaultValue: editingAsset.warrantyExpiry ? editingAsset.warrantyExpiry.slice(0, 10) : '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-xs font-medium text-gray-700 mb-1", children: "Notes" }), _jsx("textarea", { name: "notes", rows: 2, defaultValue: editingAsset.notes ?? '', className: "w-full border rounded px-3 py-2 text-sm" })] }), _jsxs("div", { className: "col-span-2 flex gap-2 justify-end pt-2", children: [_jsx("button", { type: "button", onClick: () => setEditingAsset(null), className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" }), _jsx("button", { type: "submit", disabled: updateAsset.isPending, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: updateAsset.isPending ? 'Spremanje...' : 'Spremi' })] })] })] }) }))] })), activeTab === 'pm' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-lg p-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-2", children: "U\u010Ditavanje plana preventivnog odr\u017Eavanja" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "U\u010Ditajte Excel (.xlsx) ili CSV datoteku s kolonama: asset_name, task_description, vendor_company_id, vendor_user_id (optional), schedule_type (INTERVAL or SPECIFIC_DATES), interval_days (if INTERVAL), specific_dates (if SPECIFIC_DATES, comma-separated)" }), pmStep === 'upload' && (_jsxs("div", { children: [_jsx("input", { ref: fileInputRef, type: "file", accept: ".xlsx,.xls,.csv", onChange: handleFileChange, className: "hidden" }), _jsx("button", { type: "button", onClick: () => fileInputRef.current?.click(), disabled: parseMutation.isPending, className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50", children: parseMutation.isPending ? 'Obrada u tijeku...' : 'Odaberi datoteku' }), parseMutation.isError && (_jsx("p", { className: "mt-2 text-red-600 text-sm", children: "Parse failed" }))] })), pmStep === 'preview' && (_jsxs("div", { children: [_jsxs("h3", { className: "font-medium text-gray-900 mb-2", children: ["Preview (", parsedRows.length, " rows)"] }), parseErrors.length > 0 && (_jsx("div", { className: "mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm", children: parseErrors.map((err, i) => _jsx("div", { children: err }, i)) })), _jsx("div", { className: "overflow-x-auto max-h-64 border rounded-lg mb-4", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "px-2 py-1 text-left", children: "Asset" }), _jsx("th", { className: "px-2 py-1 text-left", children: "Task" }), _jsx("th", { className: "px-2 py-1 text-left", children: "Vendor Co ID" }), _jsx("th", { className: "px-2 py-1 text-left", children: "Schedule" }), _jsx("th", { className: "px-2 py-1 text-left", children: "Interval/Dates" })] }) }), _jsx("tbody", { children: parsedRows.map((row, i) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-2 py-1", children: row.asset_name }), _jsx("td", { className: "px-2 py-1 max-w-[200px] truncate", children: row.task_description }), _jsx("td", { className: "px-2 py-1", children: row.vendor_company_id }), _jsx("td", { className: "px-2 py-1", children: row.schedule_type }), _jsx("td", { className: "px-2 py-1", children: row.schedule_type === 'INTERVAL' ? `${row.interval_days} days` : row.specific_dates })] }, i))) })] }) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: handleConfirmImport, disabled: parsedRows.length === 0 || importMutation.isPending, className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50", children: importMutation.isPending ? 'Uvoz u tijeku...' : 'Uvezi odabrano' }), _jsx("button", { type: "button", onClick: handlePmReset, className: "px-4 py-2 text-sm border rounded hover:bg-gray-50", children: "Odustani" })] })] })), pmStep === 'success' && (_jsxs("div", { children: [_jsx("p", { className: "text-green-700 font-medium mb-2", children: importSummary }), _jsx("button", { type: "button", onClick: handlePmReset, className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700", children: "U\u010Ditaj drugu datoteku" })] }))] }), _jsxs("div", { className: "border rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900", children: ["Postoje\u0107i planovi (", pmPlans.length, ")"] }), _jsx("button", { type: "button", onClick: handleCreateWorkOrders, disabled: selectedPlanIds.size === 0 || createWOMutation.isPending, className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50", children: createWOMutation.isPending ? 'Kreiranje u tijeku...' : `Kreiraj radne naloge (${selectedPlanIds.size} odabrano)` })] }), plansLoading ? (_jsx("p", { className: "text-gray-500", children: "Loading..." })) : pmPlans.length === 0 ? (_jsx("p", { className: "text-gray-500 text-sm", children: "Nema planova. U\u010Ditajte datoteku gore." })) : (_jsx("div", { className: "overflow-x-auto max-h-80 border rounded-lg", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "px-2 py-1 w-8", children: _jsx("input", { type: "checkbox", checked: pmPlans.length > 0 && selectedPlanIds.size === pmPlans.length, onChange: toggleAllPlans, className: "rounded" }) }), _jsx("th", { className: "px-2 py-1 text-left", children: "Asset" }), _jsx("th", { className: "px-2 py-1 text-left", children: "Task" }), _jsx("th", { className: "px-2 py-1 text-left", children: "Vendor" }), _jsx("th", { className: "px-2 py-1 text-left", children: "Schedule" })] }) }), _jsx("tbody", { children: pmPlans.map((p) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-2 py-1", children: _jsx("input", { type: "checkbox", checked: selectedPlanIds.has(p.id), onChange: () => togglePlanSelection(p.id), className: "rounded" }) }), _jsx("td", { className: "px-2 py-1", children: p.assetName }), _jsx("td", { className: "px-2 py-1 max-w-[200px] truncate", children: p.taskDescription }), _jsx("td", { className: "px-2 py-1", children: p.vendorCompany?.name ?? '-' }), _jsx("td", { className: "px-2 py-1", children: p.scheduleType })] }, p.id))) })] }) }))] })] }))] }), toastMessage != null && _jsx(Toast, { message: toastMessage }), alertMessage != null && (_jsx(AlertModal, { title: "Uvoz dovr\u0161en", message: alertMessage, onClose: () => setAlertMessage(null) })), pendingDeactivate != null && (_jsx(ConfirmModal, { title: "Deaktivacija", message: `Deaktiviraj "${pendingDeactivate.name}"?`, confirmLabel: "Deaktiviraj", variant: "danger", onConfirm: confirmDeactivate, onCancel: () => setPendingDeactivate(null) }))] }));
}
export default AdminDashboard;
