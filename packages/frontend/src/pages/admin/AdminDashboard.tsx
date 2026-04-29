/**
 * ADMIN Dashboard
 * Preventive Maintenance plan upload and management
 */

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../../components/shared/Layout';
import { apiClient } from '../../api/client';
import {
  preventiveMaintenanceAPI,
  type ParsedPmRow,
} from '../../api/preventive-maintenance';

type Tab = 'users' | 'vendors' | 'stores' | 'pm';

interface InternalUser {
  id: number;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  store?: { name: string } | null;
  region?: { name: string } | null;
}

interface VendorUser {
  id: number;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  vendorCompany: { id: number; name: string };
}

interface Region {
  id: number;
  name: string;
}

interface VendorCompany {
  id: number;
  name: string;
}

interface Store {
  id: number;
  name: string;
  address: string | null;
  active: boolean;
  region?: { name: string } | null;
}

const INTERNAL_ROLES = ['SM', 'AM', 'AMM', 'D', 'C2', 'ADMIN', 'BOD'];
const VENDOR_ROLES = ['S1', 'S2', 'S3'];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [showAddInternal, setShowAddInternal] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingUser, setEditingUser] = useState<InternalUser | null>(null);
  const [editingVendor, setEditingVendor] = useState<VendorUser | null>(null);
  const [showAddStore, setShowAddStore] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pmStep, setPmStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedPmRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState('');
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const { data: internalUsers = [], isLoading: loadingInternal } = useQuery({
    queryKey: ['admin-internal-users'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ users: InternalUser[] }>('/admin/users/internal');
      return data.users;
    },
  });

  const { data: vendorUsers = [], isLoading: loadingVendors } = useQuery({
    queryKey: ['admin-vendor-users'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ users: VendorUser[] }>('/admin/users/vendor');
      return data.users;
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ stores: Store[] }>('/admin/stores');
      return data.stores;
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['admin-regions'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ regions: Region[] }>('/admin/regions');
      return data.regions;
    },
  });

  const { data: vendorCompanies = [] } = useQuery({
    queryKey: ['admin-vendor-companies'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ companies: VendorCompany[] }>('/admin/vendor-companies');
      return data.companies;
    },
  });

  const { data: stores2 = [], isLoading: loadingStores } = useQuery({
    queryKey: ['admin-stores-list'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ stores: Store[] }>('/admin/stores');
      return data.stores;
    },
  });

  const createInternalUser = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiClient.post('/admin/users/internal', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
      setShowAddInternal(false);
    },
  });

  const updateInternalUser = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiClient.put(`/admin/users/internal/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
      setEditingUser(null);
    },
  });

  const deactivateInternalUser = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/users/internal/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
    },
  });

  const createVendorUser = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiClient.post('/admin/users/vendor', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-users'] });
      setShowAddVendor(false);
    },
  });

  const updateVendorUser = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiClient.put(`/admin/users/vendor/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-users'] });
      setEditingVendor(null);
    },
  });

  const deactivateVendorUser = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/users/vendor/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendor-users'] });
    },
  });

  const createStore = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiClient.post('/admin/stores', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      setShowAddStore(false);
    },
  });

  const updateStore = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiClient.put(`/admin/stores/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      setEditingStore(null);
    },
  });

  const deactivateStore = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/stores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
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
      alert(result.summary);
    },
  });

  const handleAddInternalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    createInternalUser.mutate({
      name: fd.get('name'),
      email: fd.get('email') || null,
      role: fd.get('role'),
      storeId: fd.get('storeId') ? parseInt(fd.get('storeId') as string) : null,
      regionId: fd.get('regionId') ? parseInt(fd.get('regionId') as string) : null,
    });
  };

  const handleEditInternalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    updateInternalUser.mutate({
      id: editingUser.id,
      data: {
        name: fd.get('name'),
        email: fd.get('email') || null,
        role: fd.get('role'),
        storeId: fd.get('storeId') ? parseInt(fd.get('storeId') as string) : null,
        regionId: fd.get('regionId') ? parseInt(fd.get('regionId') as string) : null,
      },
    });
  };

  const handleAddVendorSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

  const handleEditVendorSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingVendor) return;
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

  const handleAddStoreSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    createStore.mutate({
      name: fd.get('name'),
      address: fd.get('address') || null,
      regionId: fd.get('regionId'),
    });
  };

  const handleEditStoreSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStore) return;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseMutation.mutate(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (parsedRows.length > 0) importMutation.mutate(parsedRows);
  };

  const handlePmReset = () => {
    setPmStep('upload');
    setParsedRows([]);
    setParseErrors([]);
    setImportSummary('');
    fileInputRef.current?.click();
  };

  const togglePlanSelection = (id: number) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPlans = () => {
    const planIds = (pmPlans as { id: number }[]).map((p) => p.id);
    if (selectedPlanIds.size === planIds.length) setSelectedPlanIds(new Set());
    else setSelectedPlanIds(new Set(planIds));
  };

  const handleCreateWorkOrders = () => {
    if (selectedPlanIds.size === 0) { alert('Select at least one plan'); return; }
    createWOMutation.mutate(Array.from(selectedPlanIds));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage users and system settings</p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {[
              { key: 'users', label: 'Internal Users' },
              { key: 'vendors', label: 'Vendor Users' },
              { key: 'stores', label: 'Stores' },
              { key: 'pm', label: 'PM Plans' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as Tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Internal Users ({internalUsers.filter(u => u.active).length} active)
              </h2>
              <button
                onClick={() => setShowAddInternal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                + Add User
              </button>
            </div>

            {showAddInternal && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">New Internal User</h3>
                <form onSubmit={handleAddInternalSubmit} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input name="name" required className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input name="email" type="email" className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                    <select name="role" required className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">-- Select --</option>
                      {INTERNAL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Store</label>
                    <select name="storeId" className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">-- Not assigned --</option>
                      {(stores as Store[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
                    <select name="regionId" className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">-- Not assigned --</option>
                      {(regions as Region[]).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddInternal(false)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={createInternalUser.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                      {createInternalUser.isPending ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingInternal ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Store/Region</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {internalUsers.map((user) => (
                      <tr key={user.id} className={!user.active ? 'bg-gray-50 opacity-60' : ''}>
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{user.role}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {user.store?.name || user.region?.name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => setEditingUser(user)} className="text-blue-600 hover:underline text-xs">Edit</button>
                          {user.active ? (
                            <button
                              onClick={() => { if (confirm(`Deactivate ${user.name}?`)) deactivateInternalUser.mutate(user.id); }}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => updateInternalUser.mutate({ id: user.id, data: { active: true } })}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {editingUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="font-semibold text-gray-900 mb-4">Edit User — {editingUser.name}</h3>
                  <form onSubmit={handleEditInternalSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                      <input name="name" defaultValue={editingUser.name} required className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                      <input name="email" type="email" defaultValue={editingUser.email || ''} className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                      <select name="role" defaultValue={editingUser.role} className="w-full border rounded px-3 py-2 text-sm">
                        {INTERNAL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Store</label>
                      <select name="storeId" className="w-full border rounded px-3 py-2 text-sm">
                        <option value="">-- Not assigned --</option>
                        {(stores as Store[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
                      <select name="regionId" className="w-full border rounded px-3 py-2 text-sm">
                        <option value="">-- Not assigned --</option>
                        {(regions as Region[]).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={updateInternalUser.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {updateInternalUser.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Vendor Users ({vendorUsers.filter(u => u.active).length} active)
              </h2>
              <button
                onClick={() => setShowAddVendor(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                + Add Vendor User
              </button>
            </div>

            {showAddVendor && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">New Vendor User</h3>
                <form onSubmit={handleAddVendorSubmit} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input name="name" required className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input name="email" type="email" className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                    <select name="role" required className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">-- Select --</option>
                      {VENDOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Vendor Company *</label>
                    <select name="vendorCompanyId" required className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">-- Select --</option>
                      {(vendorCompanies as VendorCompany[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddVendor(false)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={createVendorUser.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                      {createVendorUser.isPending ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingVendors ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vendorUsers.map((user) => (
                      <tr key={user.id} className={!user.active ? 'bg-gray-50 opacity-60' : ''}>
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">{user.role}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.vendorCompany.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => setEditingVendor(user)} className="text-blue-600 hover:underline text-xs">Edit</button>
                          {user.active ? (
                            <button
                              onClick={() => { if (confirm(`Deactivate ${user.name}?`)) deactivateVendorUser.mutate(user.id); }}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => updateVendorUser.mutate({ id: user.id, data: { active: true } })}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {editingVendor && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="font-semibold text-gray-900 mb-4">Edit Vendor User — {editingVendor.name}</h3>
                  <form onSubmit={handleEditVendorSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                      <input name="name" defaultValue={editingVendor.name} required className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                      <input name="email" type="email" defaultValue={editingVendor.email || ''} className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                      <select name="role" defaultValue={editingVendor.role} className="w-full border rounded px-3 py-2 text-sm">
                        {VENDOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button type="button" onClick={() => setEditingVendor(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={updateVendorUser.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {updateVendorUser.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stores' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Stores ({stores2.filter(s => s.active).length} active)
              </h2>
              <button
                onClick={() => setShowAddStore(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                + Add Store
              </button>
            </div>

            {showAddStore && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">New Store</h3>
                <form onSubmit={handleAddStoreSubmit} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input name="name" required className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                    <input name="address" className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Region *</label>
                    <select name="regionId" required className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">-- Select --</option>
                      {(regions as Region[]).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddStore(false)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={createStore.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                      {createStore.isPending ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingStores ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Address</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Region</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stores2.map((store) => (
                      <tr key={store.id} className={!store.active ? 'bg-gray-50 opacity-60' : ''}>
                        <td className="px-4 py-3 font-medium">{store.name}</td>
                        <td className="px-4 py-3 text-gray-600">{store.address || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{store.region?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${store.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {store.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => setEditingStore(store)} className="text-blue-600 hover:underline text-xs">Edit</button>
                          {store.active ? (
                            <button
                              onClick={() => { if (confirm(`Deactivate ${store.name}?`)) deactivateStore.mutate(store.id); }}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => updateStore.mutate({ id: store.id, data: { active: true } })}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {editingStore && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="font-semibold text-gray-900 mb-4">Edit Store — {editingStore.name}</h3>
                  <form onSubmit={handleEditStoreSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                      <input name="name" defaultValue={editingStore.name} required className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                      <input name="address" defaultValue={editingStore.address || ''} className="w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
                      <select name="regionId" className="w-full border rounded px-3 py-2 text-sm">
                        <option value="">-- Not assigned --</option>
                        {(regions as Region[]).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button type="button" onClick={() => setEditingStore(null)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={updateStore.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                        {updateStore.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pm' && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Preventive Maintenance Plan</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload an Excel (.xlsx) or CSV file with columns: asset_name, task_description,
                vendor_company_id, vendor_user_id (optional), schedule_type (INTERVAL or SPECIFIC_DATES),
                interval_days (if INTERVAL), specific_dates (if SPECIFIC_DATES, comma-separated)
              </p>

              {pmStep === 'upload' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={parseMutation.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {parseMutation.isPending ? 'Parsing...' : 'Choose File'}
                  </button>
                  {parseMutation.isError && (
                    <p className="mt-2 text-red-600 text-sm">Parse failed</p>
                  )}
                </div>
              )}

              {pmStep === 'preview' && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Preview ({parsedRows.length} rows)</h3>
                  {parseErrors.length > 0 && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                      {parseErrors.map((err, i) => <div key={i}>{err}</div>)}
                    </div>
                  )}
                  <div className="overflow-x-auto max-h-64 border rounded-lg mb-4">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left">Asset</th>
                          <th className="px-2 py-1 text-left">Task</th>
                          <th className="px-2 py-1 text-left">Vendor Co ID</th>
                          <th className="px-2 py-1 text-left">Schedule</th>
                          <th className="px-2 py-1 text-left">Interval/Dates</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1">{row.asset_name}</td>
                            <td className="px-2 py-1 max-w-[200px] truncate">{row.task_description}</td>
                            <td className="px-2 py-1">{row.vendor_company_id}</td>
                            <td className="px-2 py-1">{row.schedule_type}</td>
                            <td className="px-2 py-1">
                              {row.schedule_type === 'INTERVAL' ? `${row.interval_days} days` : row.specific_dates}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={parsedRows.length === 0 || importMutation.isPending}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {importMutation.isPending ? 'Importing...' : 'Confirm Import'}
                    </button>
                    <button type="button" onClick={handlePmReset} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {pmStep === 'success' && (
                <div>
                  <p className="text-green-700 font-medium mb-2">{importSummary}</p>
                  <button type="button" onClick={handlePmReset} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    Upload Another File
                  </button>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Existing Plans ({(pmPlans as unknown[]).length})
                </h2>
                <button
                  type="button"
                  onClick={handleCreateWorkOrders}
                  disabled={selectedPlanIds.size === 0 || createWOMutation.isPending}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {createWOMutation.isPending ? 'Creating...' : `Create Work Orders (${selectedPlanIds.size} selected)`}
                </button>
              </div>
              {plansLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (pmPlans as unknown[]).length === 0 ? (
                <p className="text-gray-500 text-sm">No plans yet. Upload a file above.</p>
              ) : (
                <div className="overflow-x-auto max-h-80 border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 w-8">
                          <input
                            type="checkbox"
                            checked={(pmPlans as unknown[]).length > 0 && selectedPlanIds.size === (pmPlans as unknown[]).length}
                            onChange={toggleAllPlans}
                            className="rounded"
                          />
                        </th>
                        <th className="px-2 py-1 text-left">Asset</th>
                        <th className="px-2 py-1 text-left">Task</th>
                        <th className="px-2 py-1 text-left">Vendor</th>
                        <th className="px-2 py-1 text-left">Schedule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pmPlans as { id: number; assetName: string; taskDescription: string; vendorCompany?: { name: string }; scheduleType: string }[]).map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              checked={selectedPlanIds.has(p.id)}
                              onChange={() => togglePlanSelection(p.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-2 py-1">{p.assetName}</td>
                          <td className="px-2 py-1 max-w-[200px] truncate">{p.taskDescription}</td>
                          <td className="px-2 py-1">{p.vendorCompany?.name ?? '-'}</td>
                          <td className="px-2 py-1">{p.scheduleType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AdminDashboard;
