import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const CATEGORIES = [
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
const ASSET_CATEGORY_TO_TICKET_CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.label, c.value]));
export function SubmitTicketPage({ backLink, backLabel = 'Natrag' }) {
    const { session } = useSession();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [storeId, setStoreId] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [urgent, setUrgent] = useState(false);
    const [assetIdInput, setAssetIdInput] = useState('');
    const effectiveStoreId = session?.role === 'SM'
        ? session.storeId ?? null
        : typeof storeId === 'number' ? storeId : null;
    const { data: storeAssets = [] } = useQuery({
        queryKey: ['assets-for-store', effectiveStoreId],
        queryFn: () => assetsAPI.listByStore(effectiveStoreId),
        enabled: effectiveStoreId != null,
    });
    const [showAssetBrowser, setShowAssetBrowser] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [categoryLocked, setCategoryLocked] = useState(false);
    const [showSuccess, setShowSuccess] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [validationError, setValidationError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const onNavigateRef = useRef(() => navigate(backLink));
    const fileInputRef = useRef(null);
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
        if (showSuccess == null)
            return;
        const t = setTimeout(() => {
            onNavigateRef.current();
        }, 2000);
        return () => clearTimeout(t);
    }, [showSuccess]);
    const createMutation = useMutation({
        mutationFn: ticketsAPI.create,
    });
    const isBusy = createMutation.isPending || isSending;
    const validate = () => {
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
    const handleAssetSelect = (asset) => {
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
    const uploadFilesToTicket = async (ticketId) => {
        for (const file of selectedFiles) {
            await ticketsAPI.uploadAttachment(ticketId, file, false);
        }
    };
    const handleSaveDraft = async () => {
        setSubmitError('');
        if (resolvedStoreId == null || !validate())
            return;
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
            if (selectedFiles.length > 0)
                await uploadFilesToTicket(ticket.id);
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            setShowSuccess('draft');
        }
        catch (err) {
            const msg = err?.response?.data?.error ??
                err?.message ??
                'Spremanje nije uspjelo.';
            setSubmitError(msg);
        }
    };
    const handleSubmitTicket = async () => {
        setSubmitError('');
        if (resolvedStoreId == null || !validate())
            return;
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
            if (selectedFiles.length > 0)
                await uploadFilesToTicket(ticket.id);
            try {
                await ticketsAPI.submit(ticket.id);
            }
            catch (err) {
                const msg = err?.response?.data?.error ?? 'Failed to submit ticket';
                setSubmitError(msg);
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            setShowSuccess('submitted');
        }
        catch (err) {
            const msg = err?.response?.data?.error ??
                err?.message ??
                'Slanje nije uspjelo.';
            setSubmitError(msg);
        }
        finally {
            setIsSending(false);
        }
    };
    if (showSuccess != null) {
        return (_jsx(Layout, { screenTitle: "Nova prijava kvara", backLink: backLink, backLabel: backLabel, children: _jsx(Card, { className: "max-w-xl mx-auto text-center", children: _jsxs("div", { className: "bg-green-100 border-2 border-green-500 rounded-lg p-6", children: [_jsx("p", { className: "text-green-800 font-semibold text-xl mb-2", children: showSuccess === 'draft'
                                ? '✓ Prijava spremljena kao nacrt.'
                                : '✓ Prijava uspješno poslana.' }), _jsx("p", { className: "text-green-700 text-sm", children: "Povratak na nadzornu plo\u010Du za 2 sekunde..." })] }) }) }));
    }
    return (_jsx(Layout, { screenTitle: "Nova prijava kvara", backLink: backLink, backLabel: backLabel, children: _jsx(Card, { className: "max-w-2xl mx-auto", children: _jsxs("form", { onSubmit: (e) => e.preventDefault(), className: "space-y-6", children: [isAMM && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Store *" }), _jsxs("select", { value: storeId === '' ? '' : String(storeId), onChange: (e) => setStoreId(e.target.value === '' ? '' : parseInt(e.target.value, 10)), required: true, className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", children: [_jsx("option", { value: "", children: "\u2014 Select store \u2014" }), stores.map((s) => (_jsx("option", { value: s.id, children: s.name }, s.id)))] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Kategorija *" }), _jsxs("select", { value: category, onChange: (e) => setCategory(e.target.value), disabled: categoryLocked, required: true, className: `w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${categoryLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`, children: [_jsx("option", { value: "", children: "\u2014 Odaberite kategoriju \u2014" }), CATEGORIES.map((cat) => (_jsx("option", { value: cat.value, children: cat.label }, cat.value)))] }), categoryLocked && (_jsxs("p", { className: "text-xs text-blue-600 mt-1", children: ["Kategorija automatski popunjena iz odabrane opreme.", ` `, _jsx("button", { type: "button", onClick: handleClearAsset, className: "underline", children: "Ukloni opremu" })] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Opis *" }), _jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), required: true, rows: 6, placeholder: "Opi\u0161ite uo\u010Deni problem, kontekst i nalaze...", className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Hitnost *" }), _jsxs("div", { className: "flex gap-6", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", name: "urgent", checked: !urgent, onChange: () => setUrgent(false), className: "w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" }), _jsx("span", { className: "text-sm text-gray-700", children: "Nije hitno" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", name: "urgent", checked: urgent, onChange: () => setUrgent(true), className: "w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" }), _jsx("span", { className: "text-sm text-gray-700", children: "Da (Hitno)" })] })] }), urgent && (_jsx("p", { className: "mt-2 text-sm text-amber-700", children: "Hitne prijave se proslje\u0111uju Voditelju odr\u017Eavanja na neposrednu akciju." }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Privici (opcionalno)" }), _jsx("p", { className: "text-xs text-gray-600 mb-2", children: "Dodajte datoteke ili fotografiju. Na mobitelu \u0107e se mo\u017Eda otvoriti kamera." }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx", className: "hidden", onChange: (e) => setSelectedFiles(Array.from(e.target.files ?? [])) }), _jsx(Button, { type: "button", variant: "secondary", size: "sm", onClick: () => fileInputRef.current?.click(), children: "Dodaj datoteke ili fotografiju" }), selectedFiles.length > 0 && (_jsx("ul", { className: "mt-2 text-sm text-gray-600 list-disc list-inside", children: selectedFiles.map((f, i) => (_jsx("li", { children: f.name }, i))) }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Povezivanje s opremom (opcionalno)" }), selectedAsset ? (_jsxs("div", { className: "flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-medium text-green-900", children: selectedAsset.name }), _jsxs("p", { className: "text-xs text-green-700", children: [selectedAsset.manufacturer, " ", selectedAsset.model, selectedAsset.serialNumber ? ` • S/N: ${selectedAsset.serialNumber}` : '', selectedAsset.category ? ` • ${selectedAsset.category.name}` : ''] })] }), _jsx("button", { type: "button", onClick: handleClearAsset, className: "text-xs text-gray-500 hover:text-red-600 underline", children: "Ukloni" })] })) : (_jsxs("div", { className: "space-y-2", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => setShowAssetBrowser(!showAssetBrowser), disabled: effectiveStoreId == null, children: showAssetBrowser ? 'Zatvori' : '🔍 Pretraži opremu' }), effectiveStoreId == null && (_jsx("p", { className: "text-xs text-gray-500", children: "Najprije odaberite poslovnicu." })), showAssetBrowser && storeAssets.length === 0 && (_jsx("p", { className: "text-sm text-gray-500", children: "Nema opreme za ovu poslovnicu." })), showAssetBrowser && storeAssets.length > 0 && (_jsx("div", { className: "border rounded-lg overflow-hidden max-h-60 overflow-y-auto", children: storeAssets
                                            .filter(a => a.status === 'ACTIVE' || a.status === 'IN_SERVICE')
                                            .map(asset => (_jsxs("button", { type: "button", onClick: () => handleAssetSelect(asset), className: "w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition", children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: asset.name }), _jsxs("p", { className: "text-xs text-gray-500", children: [asset.manufacturer, " ", asset.model, asset.serialNumber ? ` • S/N: ${asset.serialNumber}` : '', asset.category ? ` • ${asset.category.name}` : ''] })] }, asset.id))) }))] }))] }), _jsxs("div", { className: "flex flex-wrap gap-3 pt-4 border-t border-gray-200", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => navigate(backLink), children: "Odustani" }), _jsx(Button, { type: "button", variant: "secondary", onClick: handleSaveDraft, disabled: isBusy, children: createMutation.isPending && !isSending ? 'Spremanje...' : 'Spremi kao nacrt' }), _jsx(Button, { type: "button", onClick: handleSubmitTicket, disabled: isBusy, children: isSending ? 'Slanje...' : 'Pošalji prijavu' })] }), validationError && (_jsx("p", { className: "text-amber-600 text-sm", children: validationError })), createMutation.isError && (_jsx("p", { className: "text-red-600 text-sm", children: createMutation.error?.response?.data?.error ?? 'Failed to create ticket' })), submitError && (_jsx("p", { className: "text-red-600 text-sm", children: submitError }))] }) }) }));
}
