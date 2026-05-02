/**
 * Create Cost Proposal Modal (S3)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { Button } from '../../../components/shared';

interface CreateCostProposalModalProps {
  workOrderId: number;
  onClose: () => void;
}

interface InvoiceRowInput {
  description: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  priceListItemId?: number;
}

export function CreateCostProposalModal({
  workOrderId,
  onClose,
}: CreateCostProposalModalProps) {
  const queryClient = useQueryClient();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRowInput[]>([
    {
      description: 'Dolazak na lokaciju',
      unit: 'fiksno',
      quantity: 1,
      pricePerUnit: 50,
    },
    { description: 'Rad', unit: 'sati', quantity: 2, pricePerUnit: 75 },
  ]);

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['work-order', workOrderId],
    queryFn: () => workOrdersAPI.getById(workOrderId),
  });

  const submitMutation = useMutation({
    mutationFn: workOrdersAPI.submitCostProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setSubmitSuccess(true);
    },
  });

  const addInvoiceRow = () => {
    setInvoiceRows([
      ...invoiceRows,
      { description: '', unit: 'kom', quantity: 1, pricePerUnit: 0 },
    ]);
  };

  const updateInvoiceRow = (
    index: number,
    field: keyof InvoiceRowInput,
    value: string | number
  ) => {
    const updated = [...invoiceRows];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceRows(updated);
  };

  const removeInvoiceRow = (index: number) => {
    setInvoiceRows(invoiceRows.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return invoiceRows.reduce(
      (sum, row) => sum + row.quantity * row.pricePerUnit,
      0
    );
  };

  const handleSubmit = () => {
    const validRows = invoiceRows.filter(
      (r) => r.description.trim() && r.pricePerUnit > 0
    );
    if (validRows.length === 0) {
      alert('Dodajte barem jednu stavku.');
      return;
    }

    submitMutation.mutate({
      workOrderId,
      invoiceRows: validRows,
    });
  };

  if (isLoading || workOrder == null) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              Ponuda troška poslana VMO-u.
            </p>
          </div>
          <Button type="button" onClick={onClose} className="w-full">
            Natrag na nadzornu ploču
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Izrada ponude troška
          </h2>
          <p className="text-sm text-gray-600">WO #{workOrderId}</p>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {workOrder.workReport != null && workOrder.workReport.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Rad
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {workOrder.workReport.map((row, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    {row.description} - {row.quantity} {row.unit}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Materijal
            </h3>
            <div className="space-y-2">
              {invoiceRows.map((row, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) =>
                      updateInvoiceRow(index, 'description', e.target.value)
                    }
                    placeholder="Opis *"
                    className="flex-1 p-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={row.unit}
                    onChange={(e) =>
                      updateInvoiceRow(index, 'unit', e.target.value)
                    }
                    placeholder="Jedinica"
                    className="w-24 p-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) =>
                      updateInvoiceRow(
                        index,
                        'quantity',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min={0}
                    step={0.1}
                    placeholder="Kol. *"
                    className="w-24 p-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    value={row.pricePerUnit}
                    onChange={(e) =>
                      updateInvoiceRow(
                        index,
                        'pricePerUnit',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min={0}
                    step={0.01}
                    placeholder="Jedinična cijena (€) *"
                    className="w-28 p-2 border border-gray-300 rounded-lg"
                  />
                  <div className="w-28 p-2 text-right font-medium">
                    €{(row.quantity * row.pricePerUnit).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInvoiceRow(index)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Ukloni"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={addInvoiceRow}
              className="mt-2"
            >
              Dodaj stavku
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Ukupno:</span>
              <span className="text-2xl font-bold text-blue-900">
                €{calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {submitMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Greška:{' '}
                {(submitMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Slanje nije uspjelo'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Odustani
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="flex-1"
          >
            {submitMutation.isPending
              ? 'Slanje...'
              : 'Pošalji ponudu'}
          </Button>
        </div>
      </div>
    </div>
  );
}
