/**
 * ADMIN Dashboard
 * Preventive Maintenance plan upload and management
 */

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Card, Button } from '../../components/shared';
import {
  preventiveMaintenanceAPI,
  type ParsedPmRow,
} from '../../api/preventive-maintenance';

type Step = 'upload' | 'preview' | 'success';

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedPmRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState('');

  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<number>>(new Set());

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['preventive-maintenance-plans'],
    queryFn: preventiveMaintenanceAPI.listPlans,
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

  const parseMutation = useMutation({
    mutationFn: preventiveMaintenanceAPI.parseFile,
    onSuccess: (result) => {
      setParsedRows(result.rows);
      setParseErrors(result.errors);
      setStep('preview');
    },
  });

  const importMutation = useMutation({
    mutationFn: preventiveMaintenanceAPI.importPlans,
    onSuccess: (result) => {
      setImportSummary(result.summary);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['preventive-maintenance-plans'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseMutation.mutate(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (parsedRows.length > 0) {
      importMutation.mutate(parsedRows);
    }
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
    const planIds = (plans as { id: number }[]).map((p) => p.id);
    if (selectedPlanIds.size === planIds.length) {
      setSelectedPlanIds(new Set());
    } else {
      setSelectedPlanIds(new Set(planIds));
    }
  };

  const handleCreateWorkOrders = () => {
    if (selectedPlanIds.size === 0) {
      alert('Select at least one plan');
      return;
    }
    createWOMutation.mutate(Array.from(selectedPlanIds));
  };

  const handleReset = () => {
    setStep('upload');
    setParsedRows([]);
    setParseErrors([]);
    setImportSummary('');
    fileInputRef.current?.click();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            System Administrator (ADMIN) Dashboard
          </h1>
          <p className="text-gray-600">
            Upload and manage preventive maintenance plans
          </p>
        </div>

        <Card className="bg-slate-50 border-slate-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Upload Preventive Maintenance Plan
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload an Excel (.xlsx) or CSV file with columns: asset_name,
            task_description, vendor_company_id, vendor_user_id (optional),
            schedule_type (INTERVAL or SPECIFIC_DATES), interval_days (if
            INTERVAL), specific_dates (if SPECIFIC_DATES, comma-separated)
          </p>

          {step === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={parseMutation.isPending}
              >
                {parseMutation.isPending ? 'Parsing...' : 'Choose File'}
              </Button>
              {parseMutation.isError && (
                <p className="mt-2 text-red-600 text-sm">
                  {(parseMutation.error as { response?: { data?: { error?: string } } })
                    ?.response?.data?.error ?? 'Parse failed'}
                </p>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Preview ({parsedRows.length} row(s))
              </h3>
              {parseErrors.length > 0 && (
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                  {parseErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
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
                        <td className="px-2 py-1 max-w-[200px] truncate">
                          {row.task_description}
                        </td>
                        <td className="px-2 py-1">{row.vendor_company_id}</td>
                        <td className="px-2 py-1">{row.schedule_type}</td>
                        <td className="px-2 py-1">
                          {row.schedule_type === 'INTERVAL'
                            ? `${row.interval_days} days`
                            : row.specific_dates}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmImport}
                  disabled={
                    parsedRows.length === 0 || importMutation.isPending
                  }
                >
                  {importMutation.isPending ? 'Importing...' : 'Confirm Import'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleReset}>
                  Cancel
                </Button>
              </div>
              {importMutation.isError && (
                <p className="mt-2 text-red-600 text-sm">
                  {(importMutation.error as { response?: { data?: { error?: string } } })
                    ?.response?.data?.error ?? 'Import failed'}
                </p>
              )}
            </div>
          )}

          {step === 'success' && (
            <div>
              <p className="text-green-700 font-medium mb-2">{importSummary}</p>
              <Button type="button" variant="primary" onClick={handleReset}>
                Upload Another File
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Existing Plans ({plans.length})
          </h2>
          {plansLoading ? (
            <p className="text-gray-600">Loading...</p>
          ) : plans.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No preventive maintenance plans yet. Upload a file above.
            </p>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <button
                  type="button"
                  onClick={toggleAllPlans}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selectedPlanIds.size === (plans as unknown[]).length
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreateWorkOrders}
                  disabled={
                    selectedPlanIds.size === 0 || createWOMutation.isPending
                  }
                >
                  {createWOMutation.isPending
                    ? 'Creating...'
                    : `Create Work Orders (${selectedPlanIds.size} selected)`}
                </Button>
              </div>
              {createWOMutation.isError && (
                <p className="mb-2 text-red-600 text-sm">
                  {(createWOMutation.error as { response?: { data?: { error?: string } } })
                    ?.response?.data?.error ?? 'Failed'}
                </p>
              )}
              <div className="overflow-x-auto max-h-80 border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 w-8">
                        <input
                          type="checkbox"
                          checked={
                            (plans as unknown[]).length > 0 &&
                            selectedPlanIds.size === (plans as unknown[]).length
                          }
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
                    {(plans as { id: number; assetName: string; taskDescription: string; vendorCompany?: { name: string }; scheduleType: string }[]).map(
                      (p) => (
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
                          <td className="px-2 py-1 max-w-[200px] truncate">
                            {p.taskDescription}
                          </td>
                          <td className="px-2 py-1">
                            {p.vendorCompany?.name ?? '-'}
                          </td>
                          <td className="px-2 py-1">{p.scheduleType}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
