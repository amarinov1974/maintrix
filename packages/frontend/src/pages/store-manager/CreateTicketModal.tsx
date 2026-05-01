/**
 * Create Ticket Modal
 */

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Button } from '../../components/shared';

interface CreateTicketModalProps {
  onClose: () => void;
}

// Must match Prisma TicketCategory enum keys exactly
const CATEGORIES: { value: string; label: string }[] = [
  { value: 'ELECTRICAL_INSTALLATIONS', label: 'Elektroinstalacije' },
  { value: 'HEATING_VENTILATION_AIR_CONDITIONING', label: 'Grijanje, ventilacija i klima' },
  { value: 'REFRIGERATION', label: 'Rashlađivanje' },
  { value: 'KITCHEN_EQUIPMENT', label: 'Kuhinjska oprema' },
  { value: 'ELEVATORS', label: 'Liftovi' },
  { value: 'AUTOMATIC_DOORS', label: 'Automatska vrata' },
  { value: 'FIRE_PROTECTION_SYSTEM', label: 'Zaštita od požara' },
  { value: 'WATER_AND_SEWAGE', label: 'Vodoopskrba i kanalizacija' },
  { value: 'CONSTRUCTION_WORKS', label: 'Građevinski radovi' },
  { value: 'HYGIENE', label: 'Higijena' },
  { value: 'ENVIRONMENTAL', label: 'Okoliš' },
  { value: 'OTHER', label: 'Ostalo' },
];

export function CreateTicketModal({ onClose }: CreateTicketModalProps) {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [showSuccess, setShowSuccess] = useState<'draft' | 'submitted' | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const onCloseRef = useRef(onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);
  onCloseRef.current = onClose;

  const createMutation = useMutation({
    mutationFn: ticketsAPI.create,
  });

  const isBusy = createMutation.isPending || isSending;

  useEffect(() => {
    if (showSuccess == null) return;
    const t = setTimeout(() => {
      onCloseRef.current();
    }, 2000);
    return () => clearTimeout(t);
  }, [showSuccess]);

  const validate = (): boolean => {
    setValidationError('');
    if (!category.trim()) {
      setValidationError('Odaberite kategoriju.');
      return false;
    }
    if (!description.trim()) {
      setValidationError('Unesite opis kvara.');
      return false;
    }
    return true;
  };

  const uploadFilesToTicket = async (ticketId: number) => {
    for (const file of selectedFiles) {
      await ticketsAPI.uploadAttachment(ticketId, file, false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitError('');
    if (session?.storeId == null || !validate()) return;
    try {
      const ticket = await createMutation.mutateAsync({
        storeId: session.storeId,
        category,
        description,
        urgent,
      });
      if (selectedFiles.length > 0) {
        await uploadFilesToTicket(ticket.id);
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowSuccess('draft');
    } catch {
      // Error shown via createMutation.isError
    }
  };

  const handleSend = async () => {
    setSubmitError('');
    if (session?.storeId == null || !validate()) return;
    setIsSending(true);
    try {
      const ticket = await createMutation.mutateAsync({
        storeId: session.storeId,
        category,
        description,
        urgent,
      });
      if (selectedFiles.length > 0) {
        await uploadFilesToTicket(ticket.id);
      }
      try {
        await ticketsAPI.submit(ticket.id);
      } catch (err) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to submit ticket';
        setSubmitError(msg);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowSuccess('submitted');
    } catch {
      // Create error shown via createMutation.isError
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {showSuccess != null ? (
          <div className="p-8 text-center">
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-6 mb-4">
              <p className="text-green-800 font-semibold text-xl mb-2">
                {showSuccess === 'draft'
                  ? '✓ Ticket saved in draft.'
                  : '✓ Ticket submitted.'}
              </p>
              <p className="text-green-700 text-sm">
                Returning to dashboard in 2 seconds...
              </p>
            </div>
          </div>
        ) : (
          <>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Create New Ticket
          </h2>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select Category --</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Describe the issue in detail..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="urgent"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="urgent"
              className="text-sm font-medium text-gray-700"
            >
              Mark as URGENT
            </label>
          </div>

          {urgent && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                ⚠️ Urgent tickets bypass the approval chain and go directly to
                the Area Maintenance Manager for immediate action.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (optional)
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Add files or take a photo. On mobile, choosing images may open the camera.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Add files or take photo
            </Button>
            {selectedFiles.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {selectedFiles.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isBusy}
            >
              {createMutation.isPending && !isSending ? 'Saving...' : 'Save as draft'}
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={isBusy}
              className="flex-1"
            >
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>

          {validationError && (
            <p className="text-amber-600 text-sm">{validationError}</p>
          )}
          {createMutation.isError && (
            <p className="text-red-600 text-sm">
              Error:{' '}
              {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'Failed to create ticket'}
            </p>
          )}
          {submitError && (
            <p className="text-red-600 text-sm">Error: {submitError}</p>
          )}
        </form>
          </>
        )}
      </div>
    </div>
  );
}
