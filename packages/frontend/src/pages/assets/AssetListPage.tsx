import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/shared/Layout';
import { apiClient } from '../../api/client';
import { useSession } from '../../contexts/SessionContext';

interface Asset {
  id: number;
  name: string;
  description: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  purchaseValue: number | null;
  currentValue: number | null;
  status: 'ACTIVE' | 'FAULTY' | 'IN_SERVICE' | 'DECOMMISSIONED';
  store: { id: number; name: string };
  category: { id: number; name: string } | null;
}

interface Store {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  FAULTY: 'bg-red-100 text-red-800',
  IN_SERVICE: 'bg-yellow-100 text-yellow-800',
  DECOMMISSIONED: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  FAULTY: 'Faulty',
  IN_SERVICE: 'In Service',
  DECOMMISSIONED: 'Decommissioned',
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
      if (selectedStore) params.append('storeId', selectedStore);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      if (search) params.append('search', search);
      params.append('page', String(page));
      params.append('limit', String(limit));
      const { data } = await apiClient.get<{
        assets: Asset[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/assets?${params.toString()}`);
      return data;
    },
  });

  const { data: storesData } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ stores: Store[] }>('/stores');
      return data.stores;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-asset-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ categories: Category[] }>('/assets/categories');
      return data.categories;
    },
  });

  const assets = assetsResponse?.assets ?? [];
  const pagination = assetsResponse?.pagination;
  const stores = storesData ?? [];
  const categories = categoriesData ?? [];

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    return `€${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isWarrantyExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600">Asset register for {session?.companyName}</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search name, serial, manufacturer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="col-span-2 border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={selectedStore}
            onChange={(e) => { setSelectedStore(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Stores</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="FAULTY">Faulty</option>
            <option value="IN_SERVICE">In Service</option>
            <option value="DECOMMISSIONED">Decommissioned</option>
          </select>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {isLoading ? 'Loading...' : `${pagination?.total ?? assets.length} assets`}
            </span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="border rounded-lg px-2 py-1 text-sm"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Assets Table */}
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : assets.length === 0 ? (
          <p className="text-gray-500">No assets found.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Asset</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Store</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Serial No.</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Warranty</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Purchase Value</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Book Value</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assets.map((asset) => (
                    <tr
                      key={asset.id}
                      onClick={() => navigate(`/assets/${asset.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{asset.name}</div>
                        <div className="text-xs text-gray-500">{asset.manufacturer} {asset.model}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {asset.category?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {asset.store.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {asset.serialNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isWarrantyExpired(asset.warrantyExpiry) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {formatDate(asset.warrantyExpiry)}
                          {isWarrantyExpired(asset.warrantyExpiry) && ' ⚠️'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(asset.purchaseValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(asset.currentValue)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[asset.status]}`}>
                          {STATUS_LABELS[asset.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-blue-600 text-sm">View →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} assets
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹ Prev
              </button>
              <span className="text-sm text-gray-700 px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next ›
              </button>
              <button
                onClick={() => setPage(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AssetListPage;
