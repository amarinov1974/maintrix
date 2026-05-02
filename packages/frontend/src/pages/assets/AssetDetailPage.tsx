import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Layout } from '../../components/shared/Layout';
import { apiClient } from '../../api/client';
import { formatAssetStatus, formatCategory, formatStatus } from '../../utils/formatters';

type AssetStatus = 'ACTIVE' | 'FAULTY' | 'IN_SERVICE' | 'DECOMMISSIONED';

interface AssetDetail {
  id: number;
  name: string;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  purchaseValue: number | null;
  currentValue: number | null;
  status: AssetStatus;
  notes: string | null;
  store: { id: number; name: string };
  category: { id: number; name: string; depreciationRate: number } | null;
  tickets: Array<{
    id: number;
    currentStatus: string;
    category: string;
    description: string;
    urgent: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: { name: string };
  }>;
  workOrders: Array<{
    id: number;
    currentStatus: string;
    createdAt: string;
    updatedAt: string;
    vendorCompany: { name: string };
    ticket: { category: string };
  }>;
  attachments: Array<{
    id: number;
    fileName: string;
    filePath: string;
    createdAt: string;
  }>;
}

const STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  FAULTY: 'bg-red-100 text-red-800',
  IN_SERVICE: 'bg-yellow-100 text-yellow-800',
  DECOMMISSIONED: 'bg-gray-100 text-gray-600',
};

type HistoryTab = 'tickets' | 'work-orders';

export function AssetDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<HistoryTab>('tickets');

  const { data: asset, isLoading, isError } = useQuery({
    queryKey: ['asset-detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get<AssetDetail>(`/assets/${id}`);
      return data;
    },
    enabled: id != null,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !id) throw new Error('No file selected');
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

  if (isLoading) {
    return (
      <Layout backLink="/assets" backLabel="← Back to Assets">
        <p className="text-gray-500">Loading asset...</p>
      </Layout>
    );
  }

  if (isError || !asset) {
    return (
      <Layout backLink="/assets" backLabel="← Back to Assets">
        <p className="text-red-600">Failed to load asset details.</p>
      </Layout>
    );
  }

  return (
    <Layout backLink="/assets" backLabel="← Back to Assets">
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[asset.status]}`}>
              {formatAssetStatus(asset.status)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {asset.category?.name ?? 'Uncategorized'} • {asset.store.name} • {asset.serialNumber ?? 'No serial'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalji opreme</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Proizvođač / Model</span>
                <span className="text-gray-900 text-right">{asset.manufacturer ?? '—'} / {asset.model ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Datum nabave</span>
                <span className="text-gray-900">{formatDate(asset.purchaseDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Istek jamstva</span>
                <span className={isWarrantyExpired(asset.warrantyExpiry) ? 'text-red-600 font-medium' : 'text-gray-900'}>
                  {asset.warrantyExpiry == null
                    ? 'Bez roka jamstva'
                    : isWarrantyExpired(asset.warrantyExpiry)
                      ? `Isteklo (${formatDate(asset.warrantyExpiry)})`
                      : formatDate(asset.warrantyExpiry)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Nabavna vrijednost</span>
                <span className="text-gray-900">{formatCurrency(asset.purchaseValue)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Knjigovodstvena vrijednost</span>
                <span className="text-gray-900 font-semibold">{formatCurrency(asset.currentValue)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Stopa amortizacije</span>
                <span className="text-gray-900">
                  {asset.category?.depreciationRate != null ? `${asset.category.depreciationRate}%` : '—'}
                </span>
              </div>
            </div>
            {asset.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Napomene</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{asset.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dokumenti</h2>
            {asset.attachments.length === 0 ? (
              <p className="text-sm text-gray-500 mb-4">Nema učitanih dokumenata.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {asset.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2">
                    <span className="text-sm text-gray-900 truncate">{attachment.fileName}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(attachment.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}

            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                uploadMutation.mutate();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-gray-100 file:text-gray-700"
              />
              <button
                type="submit"
                disabled={!selectedFile || uploadMutation.isPending}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadMutation.isPending ? 'Učitavanje...' : 'Učitaj'}
              </button>
            </form>
            {uploadMutation.isError && (
              <p className="text-sm text-red-600 mt-2">
                {uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Upload failed'}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Servisna povijest</h2>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                activeTab === 'tickets'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Prijave
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('work-orders')}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                activeTab === 'work-orders'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Radni nalozi
            </button>
          </div>

          {activeTab === 'tickets' ? (
            asset.tickets.length === 0 ? (
              <p className="text-sm text-gray-500">Nema prijava za ovu opremu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Urgent</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Kreirao</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Datum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {asset.tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">#{ticket.id}</td>
                        <td className="px-4 py-3 text-gray-600">{formatCategory(ticket.category)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            {formatStatus(ticket.currentStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{ticket.urgent ? '⚡' : '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{ticket.createdBy.name}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(ticket.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : asset.workOrders.length === 0 ? (
            <p className="text-sm text-gray-500">Nema radnih naloga za ovu opremu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">WO ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Ticket Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Izvođač</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {asset.workOrders.map((workOrder) => (
                    <tr key={workOrder.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">#{workOrder.id}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCategory(workOrder.ticket.category)}</td>
                      <td className="px-4 py-3 text-gray-600">{workOrder.vendorCompany.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                          {formatStatus(workOrder.currentStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(workOrder.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default AssetDetailPage;
