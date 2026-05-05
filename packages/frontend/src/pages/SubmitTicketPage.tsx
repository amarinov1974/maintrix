/**
 * Ticket Submit Screen (Section 8)
 * Accessible by Store Manager (store fixed) and AMM (with store selector).
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../api/tickets';
import { storesAPI } from '../api/stores';
import { assetsAPI } from '../api/assets';
import { useSession } from '../contexts/SessionContext';
import { Layout, Button, Card } from '../components/shared';

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

const ASSET_CATEGORY_TO_TICKET_CATEGORY: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.label, c.value])
);

interface SubmitTicketPageProps {
  backLink: string;
  backLabel?: string;
}

export function SubmitTicketPage({ backLink, backLabel = 'Natrag' }: SubmitTicketPageProps) {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [storeId, setStoreId] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState<boolean>(false);
  const [assetIdInput, setAssetIdInput] = useState('');

  const effectiveStoreId = session?.role === 'SM'
    ? (session as { storeId?: number }).storeId ?? null
    : typeof storeId === 'number' ? storeId : null;

  const { data: storeAssets = [] } = useQuery({
    queryKey: ['assets-for-store', effectiveStoreId],
    queryFn: () => assetsAPI.listByStore(effectiveStoreId!),
    enabled: effectiveStoreId != null,
  });

  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<import('../api/assets').Asset | null>(null);
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState<'draft' | 'submitted' | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const onNavigateRef = useRef(() => navigate(backLink));
  const fileInputRef = useRef<HTMLInputElement>(null);
  onNavigateRef.current = () => navigate(backLink);

  const isSM = session?.role === 'SM';
  const isAMM = session?.role === 'AMM';

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: storesAPI.list,
    enabled: isAMM,
  });

  useEffect(() => {
    if (isSM && session?.storeId != null) {
      setStoreId(session.storeId);
    }
    if (isAMM && stores.length === 1) {
      setStoreId(stores[0].id);
    }
  }, [isSM, isAMM, session?.storeId, stores]);

  useEffect(() => {
    if (showSuccess == null) return;
    const t = setTimeout(() => {
      onNavigateRef.current();
    }, 2000);
    return () => clearTimeout(t);
  }, [showSuccess]);

  const createMutation = useMutation({
    mutationFn: ticketsAPI.create,
  });

  const isBusy = createMutation.isPending || isSending;

  const validate = (): boolean => {
    setValidationError('');
    if (isAMM && (storeId === '' || storeId == null)) {
      setValidationError('Odaberite poslovnicu.');
      return false;
    }
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

  const resolvedStoreId = isSM ? session?.storeId : (storeId === '' ? null : Number(storeId));


  const handleAssetSelect = (asset: import('../api/assets').Asset) => {
    setSelectedAsset(asset);
    setAssetIdInput(String(asset.id));
    setShowAssetBrowser(false);
    // Auto-fill category ako postoji mapping
    if (asset.category) {
      const mapped = ASSET_CATEGORY_TO_TICKET_CATEGORY[asset.category.name];
      if (mapped) {
        setCategory(mapped);
        setCategoryLocked(true);
      }
    }
  };

  const handleClearAsset = () => {
    setSelectedAsset(null);
    setAssetIdInput('');
    setCategoryLocked(false);
  };

  const uploadFilesToTicket = async (ticketId: number) => {
    for (const file of selectedFiles) {
      await ticketsAPI.uploadAttachment(ticketId, file, false);
    }
  };

  const handleSaveDraft = async () => {
    setSubmitError('');
    if (resolvedStoreId == null || !validate()) return;
    try {
      const ticket = await createMutation.mutateAsync({
        storeId: resolvedStoreId,
        category,
        description,
        urgent,
        assetId: (() => {
          const id = parseInt(assetIdInput.trim(), 10);
          return Number.isNaN(id) || id < 1 ? undefined : id;
        })(),
      });
      if (selectedFiles.length > 0) await uploadFilesToTicket(ticket.id);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowSuccess('draft');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ??
        (err as { message?: string })?.message ??
        'Spremanje nije uspjelo.';
      setSubmitError(msg);
    }
  };

  const handleSubmitTicket = async () => {
    setSubmitError('');
    if (resolvedStoreId == null || !validate()) return;
    setIsSending(true);
    try {
      const ticket = await createMutation.mutateAsync({
        storeId: resolvedStoreId,
        category,
        description,
        urgent,
        assetId: (() => {
          const id = parseInt(assetIdInput.trim(), 10);
          return Number.isNaN(id) || id < 1 ? undefined : id;
        })(),
      });
      if (selectedFiles.length > 0) await uploadFilesToTicket(ticket.id);
      try {
        await ticketsAPI.submit(ticket.id);
      } catch (err) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to submit ticket';
        setSubmitError(msg);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowSuccess('submitted');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ??
        (err as { message?: string })?.message ??
        'Slanje nije uspjelo.';
      setSubmitError(msg);
    } finally {
      setIsSending(false);
    }
  };

  if (showSuccess != null) {
    return (
      <Layout
        screenTitle="Nova prijava kvara"
        backLink={backLink}
        backLabel={backLabel}
      >
        <Card className="max-w-xl mx-auto text-center">
          <div className="bg-green-100 border-2 border-green-500 rounded-lg p-6">
            <p className="text-green-800 font-semibold text-xl mb-2">
              {showSuccess === 'draft'
                ? '✓ Prijava spremljena kao nacrt.'
                : '✓ Prijava uspješno poslana.'}
            </p>
            <p className="text-green-700 text-sm">
              Povratak na nadzornu ploču za 2 sekunde...
            </p>
          </div>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout
      screenTitle="Nova prijava kvara"
      backLink={backLink}
      backLabel={backLabel}
    >
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* 8.2 Store Selection (AMM only) */}
          {isAMM && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store *
              </label>
              <select
                value={storeId === '' ? '' : String(storeId)}
                onChange={(e) => setStoreId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— Select store —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 8.3 Category (Mandatory) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorija *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={categoryLocked}
              required
              className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${categoryLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">— Odaberite kategoriju —</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {categoryLocked && (
              <p className="text-xs text-blue-600 mt-1">
                Kategorija automatski popunjena iz odabrane opreme.{` `}
                <button type="button" onClick={handleClearAsset} className="underline">
                  Ukloni opremu
                </button>
              </p>
            )}
          </div>

          {/* 8.4 Description (Mandatory) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opis *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              placeholder="Opišite uočeni problem, kontekst i nalaze..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 8.5 Urgency (Mandatory) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hitnost *
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="urgent"
                  checked={!urgent}
                  onChange={() => setUrgent(false)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Nije hitno</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="urgent"
                  checked={urgent}
                  onChange={() => setUrgent(true)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Da (Hitno)</span>
              </label>
            </div>
            {urgent && (
              <p className="mt-2 text-sm text-amber-700">
                Hitne prijave se prosljeđuju Voditelju održavanja na neposrednu akciju.
              </p>
            )}
          </div>

          {/* 8.6 Attachments (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Privici (opcionalno)
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Dodajte datoteke ili fotografiju. Na mobitelu će se možda otvoriti kamera.
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
              Dodaj datoteke ili fotografiju
            </Button>
            {selectedFiles.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {selectedFiles.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>

          {/* 8.7 Asset Linking (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Povezivanje s opremom (opcionalno)
            </label>
            {selectedAsset ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">{selectedAsset.name}</p>
                  <p className="text-xs text-green-700">
                    {selectedAsset.manufacturer} {selectedAsset.model}
                    {selectedAsset.serialNumber ? ` • S/N: ${selectedAsset.serialNumber}` : ''}
                    {selectedAsset.category ? ` • ${selectedAsset.category.name}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearAsset}
                  className="text-xs text-gray-500 hover:text-red-600 underline"
                >
                  Ukloni
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAssetBrowser(!showAssetBrowser)}
                  disabled={effectiveStoreId == null}
                >
                  {showAssetBrowser ? 'Zatvori' : '🔍 Pretraži opremu'}
                </Button>
                {effectiveStoreId == null && (
                  <p className="text-xs text-gray-500">Najprije odaberite poslovnicu.</p>
                )}
                {showAssetBrowser && storeAssets.length === 0 && (
                  <p className="text-sm text-gray-500">Nema opreme za ovu poslovnicu.</p>
                )}
                {showAssetBrowser && storeAssets.length > 0 && (
                  <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    {storeAssets
                      .filter(a => a.status === 'ACTIVE' || a.status === 'IN_SERVICE')
                      .map(asset => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleAssetSelect(asset)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition"
                        >
                          <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                          <p className="text-xs text-gray-500">
                            {asset.manufacturer} {asset.model}
                            {asset.serialNumber ? ` • S/N: ${asset.serialNumber}` : ''}
                            {asset.category ? ` • ${asset.category.name}` : ''}
                          </p>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 8.8 Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => navigate(backLink)}>
              Odustani
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isBusy}
            >
              {createMutation.isPending && !isSending ? 'Spremanje...' : 'Spremi kao nacrt'}
            </Button>
            <Button type="button" onClick={handleSubmitTicket} disabled={isBusy}>
              {isSending ? 'Slanje...' : 'Pošalji prijavu'}
            </Button>
          </div>

          {validationError && (
            <p className="text-amber-600 text-sm">{validationError}</p>
          )}
          {createMutation.isError && (
            <p className="text-red-600 text-sm">
              {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create ticket'}
            </p>
          )}
          {submitError && (
            <p className="text-red-600 text-sm">{submitError}</p>
          )}
        </form>
      </Card>
    </Layout>
  );
}
