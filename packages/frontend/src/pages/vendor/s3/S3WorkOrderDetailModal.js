import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * S3 Work Order Detail — Section 15.5–15.11
 * Read-only: WO, Ticket, Store, Category, Urgency, work report, attachments, asset.
 * Editable invoice table: auto rows (Arrival + Labor) + manual rows; Complete/Edit Proposal; Send Cost Proposal.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI, } from '../../../api/work-orders';
import { useSession } from '../../../contexts/SessionContext';
import { Button, Badge } from '../../../components/shared';
import { WorkOrderStatus } from '../../../types/statuses';
import { getS3WODraft, setS3WODraft, clearS3WODraft } from './s3Draft';
import { formatCategory, formatHistoryAction, formatStatusAny } from '../../../utils/formatters';
const NOT_IN_PRICELIST_VALUE = '__not_in_list__';
function laborHoursFromCheckInOut(checkinTs, checkoutTs) {
    if (checkinTs == null || checkoutTs == null)
        return 0;
    const start = new Date(checkinTs).getTime();
    const end = new Date(checkoutTs).getTime();
    const durationMs = end - start;
    if (durationMs <= 0)
        return 0;
    const durationQuarters = Math.ceil(durationMs / (15 * 60 * 1000));
    return durationQuarters * 0.25;
}
/** Total labor hours across all visit pairs (supports any number of visits, e.g. repeated "follow up visit needed"). */
function totalLaborHoursFromVisitPairs(visitPairs, fallbackCheckin, fallbackCheckout) {
    if (visitPairs != null && visitPairs.length > 0) {
        return visitPairs.reduce((sum, p) => sum + laborHoursFromCheckInOut(p.checkinTs, p.checkoutTs), 0);
    }
    return laborHoursFromCheckInOut(fallbackCheckin, fallbackCheckout);
}
/** Billed units for service-time billing: ceil(duration / unitMinutes). */
function serviceTimeUnitsFromCheckInOut(checkinTs, checkoutTs, unitMinutes) {
    if (checkinTs == null || checkoutTs == null)
        return 0;
    const start = new Date(checkinTs).getTime();
    const end = new Date(checkoutTs).getTime();
    const durationMs = end - start;
    if (durationMs <= 0)
        return 0;
    const units = Math.ceil(durationMs / (unitMinutes * 60 * 1000));
    return units;
}
/** Total service-time units across all visit pairs (any number of visits). */
function totalServiceTimeUnitsFromVisitPairs(visitPairs, unitMinutes, fallbackCheckin, fallbackCheckout) {
    if (visitPairs != null && visitPairs.length > 0) {
        return visitPairs.reduce((sum, p) => sum + serviceTimeUnitsFromCheckInOut(p.checkinTs, p.checkoutTs, unitMinutes), 0);
    }
    return serviceTimeUnitsFromCheckInOut(fallbackCheckin, fallbackCheckout, unitMinutes);
}
export function S3WorkOrderDetailModal({ workOrderId, onClose }) {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [proposalCompleted, setProposalCompleted] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [invoiceRows, setInvoiceRows] = useState([]);
    const [initialized, setInitialized] = useState(false);
    const invoiceRowsRef = useRef([]);
    invoiceRowsRef.current = invoiceRows;
    const { data: wo, isLoading: loadingWO } = useQuery({
        queryKey: ['work-order', workOrderId],
        queryFn: () => workOrdersAPI.getById(workOrderId),
        enabled: workOrderId > 0,
    });
    const { data: priceList = [] } = useQuery({
        queryKey: ['price-list', session?.companyId],
        queryFn: () => workOrdersAPI.getPriceList(session.companyId),
        enabled: session?.companyId != null,
    });
    // Items selectable in dropdown (exclude auto-applied billing rules e.g. Arrival to location, Service time)
    const selectablePriceList = useMemo(() => priceList.filter((p) => p.selectableInUI !== false), [priceList]);
    const autoApplyItems = useMemo(() => priceList.filter((p) => p.selectableInUI === false), [priceList]);
    const isEditable = wo?.currentStatus === WorkOrderStatus.SERVICE_COMPLETED || wo?.currentStatus === WorkOrderStatus.COST_REVISION_REQUESTED;
    const isOwner = session?.userId != null && wo?.currentOwnerId === session.userId;
    const canEditAndSubmit = isEditable && isOwner;
    const techCount = Math.max(1, wo?.declaredTechCount ?? 1);
    const categories = useMemo(() => {
        const set = new Set(selectablePriceList.map((p) => p.category));
        return Array.from(set).sort();
    }, [selectablePriceList]);
    const byCategory = useMemo(() => {
        const map = new Map();
        for (const p of selectablePriceList) {
            if (!map.has(p.category))
                map.set(p.category, []);
            map.get(p.category).push(p);
        }
        return map;
    }, [selectablePriceList]);
    const arrivalItem = useMemo(() => priceList.find((p) => {
        const desc = p.description.toLowerCase();
        const category = p.category.toLowerCase();
        const unit = p.unit.toLowerCase();
        return (desc.includes('arrival') ||
            desc.includes('dolazak') ||
            (category === 'fixed fees' && (unit.includes('visit') || unit.includes('arrival'))));
    }) ??
        priceList.find((p) => p.category.toLowerCase() === 'fixed fees'), [priceList]);
    const laborItem = useMemo(() => priceList.find((p) => {
        const desc = p.description.toLowerCase();
        const category = p.category.toLowerCase();
        return (category === 'labor' &&
            (p.unitMinutes != null ||
                desc.includes('service time') ||
                desc.includes('service hours') ||
                desc.includes('hour') ||
                desc.includes('radni sati') ||
                desc.includes('vrijeme servisa')));
    }) ?? priceList.find((p) => p.category.toLowerCase() === 'labor'), [priceList]);
    const isServiceTimeInvoiceRow = (row) => {
        const desc = row.description.toLowerCase();
        if (desc.includes('service time') ||
            desc.includes('service hours') ||
            desc.includes('radni sati') ||
            desc.includes('vrijeme servisa')) {
            return true;
        }
        if (row.priceListItemId == null)
            return false;
        const item = priceList.find((p) => p.id === row.priceListItemId);
        return (item?.unitMinutes ?? 0) > 0;
    };
    const normalizeServiceTimeRowsPerTechnician = (rows) => {
        if (techCount <= 1)
            return rows;
        const serviceRows = rows.filter((row) => isServiceTimeInvoiceRow(row));
        if (serviceRows.length === 0 || serviceRows.length >= techCount)
            return rows;
        const firstServiceIndex = rows.findIndex((row) => isServiceTimeInvoiceRow(row));
        if (firstServiceIndex < 0)
            return rows;
        const additionalRows = Array.from({ length: techCount - serviceRows.length }, () => ({
            ...serviceRows[0],
        }));
        const nonServiceRowsAfterFirst = rows
            .slice(firstServiceIndex)
            .filter((row) => !isServiceTimeInvoiceRow(row));
        return [
            ...rows.slice(0, firstServiceIndex),
            ...serviceRows,
            ...additionalRows,
            ...nonServiceRowsAfterFirst,
        ];
    };
    useEffect(() => {
        if (wo == null || priceList.length === 0 || initialized)
            return;
        const draft = getS3WODraft(workOrderId);
        if (draft?.invoiceRows != null && draft.invoiceRows.length > 0) {
            setInvoiceRows(normalizeServiceTimeRowsPerTechnician(draft.invoiceRows));
            setInitialized(true);
            return;
        }
        if (wo.invoiceRows != null && wo.invoiceRows.length > 0) {
            const mappedRows = wo.invoiceRows.map((r) => {
                const fromList = r.priceListItemId != null;
                return {
                    description: r.description,
                    unit: r.unit,
                    quantity: r.quantity,
                    pricePerUnit: r.pricePerUnit,
                    priceListItemId: r.priceListItemId ?? undefined,
                    isFromPriceList: fromList,
                    isNotInPricelist: !fromList && r.description.trim() !== '',
                };
            });
            setInvoiceRows(normalizeServiceTimeRowsPerTechnician(mappedRows));
        }
        else {
            const visitPairs = wo.visitPairs;
            // Arrival count = number of site visits (supports many visits when S2 repeatedly chooses "follow up visit needed")
            const visitCount = visitPairs != null && visitPairs.length > 0
                ? visitPairs.length
                : (wo.checkinTs != null && wo.checkoutTs != null ? 1 : 0);
            const totalLaborH = totalLaborHoursFromVisitPairs(visitPairs, wo.checkinTs ?? null, wo.checkoutTs ?? null);
            const rows = [];
            if (autoApplyItems.length > 0) {
                for (const item of autoApplyItems) {
                    if (item.unitMinutes == null) {
                        rows.push({
                            description: item.description,
                            unit: item.unit,
                            quantity: visitCount,
                            pricePerUnit: item.pricePerUnit,
                            priceListItemId: item.id,
                            isFromPriceList: true,
                        });
                    }
                    else {
                        const units = totalServiceTimeUnitsFromVisitPairs(visitPairs, item.unitMinutes, wo.checkinTs ?? null, wo.checkoutTs ?? null);
                        for (let i = 0; i < techCount; i++) {
                            rows.push({
                                description: item.description,
                                unit: item.unit,
                                quantity: units,
                                pricePerUnit: item.pricePerUnit,
                                priceListItemId: item.id,
                                isFromPriceList: true,
                            });
                        }
                    }
                }
            }
            else {
                if (arrivalItem) {
                    rows.push({
                        description: arrivalItem.description,
                        unit: arrivalItem.unit,
                        quantity: visitCount,
                        pricePerUnit: arrivalItem.pricePerUnit,
                        priceListItemId: arrivalItem.id,
                        isFromPriceList: true,
                    });
                }
                if (laborItem && (totalLaborH > 0 || techCount > 0)) {
                    for (let i = 0; i < techCount; i++) {
                        rows.push({
                            description: laborItem.description,
                            unit: laborItem.unit,
                            quantity: totalLaborH,
                            pricePerUnit: laborItem.pricePerUnit,
                            priceListItemId: laborItem.id,
                            isFromPriceList: true,
                        });
                    }
                }
                if (rows.length === 0 && arrivalItem) {
                    rows.push({
                        description: arrivalItem.description,
                        unit: arrivalItem.unit,
                        quantity: visitCount,
                        pricePerUnit: arrivalItem.pricePerUnit,
                        priceListItemId: arrivalItem.id,
                        isFromPriceList: true,
                    });
                }
            }
            setInvoiceRows(rows);
        }
        setInitialized(true);
    }, [wo, priceList, autoApplyItems, arrivalItem, laborItem, initialized, techCount]);
    const submitMutation = useMutation({
        mutationFn: workOrdersAPI.submitCostProposal,
        onSuccess: () => {
            clearS3WODraft(workOrderId);
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
            setSubmitSuccess(true);
        },
    });
    const saveDraftAndClose = () => {
        setS3WODraft(workOrderId, { invoiceRows });
        onClose();
    };
    useEffect(() => {
        return () => {
            if (workOrderId > 0 && invoiceRowsRef.current.length > 0) {
                setS3WODraft(workOrderId, { invoiceRows: invoiceRowsRef.current });
            }
        };
    }, [workOrderId]);
    const addRow = () => {
        if (proposalCompleted)
            return;
        setInvoiceRows((prev) => [
            ...prev,
            { description: '', unit: '', quantity: 0, pricePerUnit: 0, isFromPriceList: false, isNotInPricelist: false },
        ]);
    };
    const updateRow = (index, field, value) => {
        if (proposalCompleted)
            return;
        const next = [...invoiceRows];
        next[index] = { ...next[index], [field]: value };
        setInvoiceRows(next);
    };
    const selectPriceItem = (index, item) => {
        if (proposalCompleted)
            return;
        const next = [...invoiceRows];
        next[index] = {
            description: item.description,
            unit: item.unit,
            quantity: 1,
            pricePerUnit: item.pricePerUnit,
            priceListItemId: item.id,
            isFromPriceList: true,
            isNotInPricelist: false,
        };
        setInvoiceRows(next);
    };
    const removeRow = (index) => {
        if (proposalCompleted)
            return;
        setInvoiceRows((prev) => prev.filter((_, i) => i !== index));
    };
    const canComplete = invoiceRows.length > 0 &&
        invoiceRows.every((r) => r.description.trim() !== '' &&
            r.unit.trim() !== '' &&
            r.quantity >= 0 &&
            !Number.isNaN(r.quantity) &&
            r.pricePerUnit >= 0 &&
            !Number.isNaN(r.pricePerUnit));
    const isServiceTimeRow = (index) => {
        const row = invoiceRows[index];
        if (!row)
            return false;
        const desc = row.description.toLowerCase();
        if (desc.includes('service time') ||
            desc.includes('service hours') ||
            desc.includes('radni sati') ||
            desc.includes('vrijeme servisa')) {
            return true;
        }
        if (row.priceListItemId == null)
            return false;
        const item = priceList.find((p) => p.id === row.priceListItemId);
        return (item?.unitMinutes ?? 0) > 0;
    };
    /** Arrival-to-location row: auto-applied, quantity always 1 (not editable in Service Completed) */
    const isArrivalRow = (index) => {
        const row = invoiceRows[index];
        if (!row)
            return false;
        const desc = row.description.toLowerCase();
        if (desc.includes('arrival') || desc.includes('dolazak'))
            return true;
        if (row.priceListItemId == null)
            return false;
        const item = priceList.find((p) => p.id === row.priceListItemId);
        return item?.selectableInUI === false && (item?.unitMinutes ?? 0) === 0;
    };
    const isAutoGeneratedRow = (index) => isArrivalRow(index) || isServiceTimeRow(index);
    const isAutoGeneratedInvoiceRowReadonly = (row) => {
        const desc = row.description.toLowerCase();
        const unit = row.unit.toLowerCase();
        return (desc.includes('arrival') ||
            desc.includes('dolazak') ||
            desc.includes('service time') ||
            desc.includes('service hours') ||
            desc.includes('radni sati') ||
            desc.includes('vrijeme servisa') ||
            unit.includes('15 min'));
    };
    const total = useMemo(() => invoiceRows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.pricePerUnit) || 0), 0), [invoiceRows]);
    const handleSend = () => {
        if (!canComplete)
            return;
        submitMutation.mutate({
            workOrderId,
            invoiceRows: invoiceRows.map((r, index) => {
                const qty = isArrivalRow(index) ? 1 : r.quantity;
                return {
                    description: r.description,
                    unit: r.unit,
                    quantity: qty,
                    pricePerUnit: r.pricePerUnit,
                    priceListItemId: r.priceListItemId,
                };
            }),
        });
    };
    if (loadingWO || wo == null) {
        return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50", children: _jsx("div", { className: "bg-white rounded-lg p-6", children: _jsx("p", { children: "U\u010Ditavanje..." }) }) }));
    }
    if (submitSuccess) {
        return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg max-w-md w-full p-6", children: [_jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4 mb-4", children: _jsx("p", { className: "text-sm text-green-800", children: "Ponuda tro\u0161ka poslana VMO-u." }) }), _jsx(Button, { type: "button", onClick: onClose, className: "w-full", children: "Natrag na nadzornu plo\u010Du" })] }) }));
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto", children: _jsxs("div", { className: "bg-white rounded-lg max-w-4xl w-full my-8", children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-gray-900", children: "Detalji radnog naloga" }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["WO #", wo.id, " \u2022 Prijava #", wo.ticketId] }), _jsx(Badge, { variant: wo.urgent ? 'danger' : 'secondary', className: "mt-2", children: wo.urgent ? 'Hitno' : 'Nije hitno' })] }), _jsx(Button, { type: "button", variant: "secondary", onClick: saveDraftAndClose, children: "Natrag" })] }) }), _jsxs("div", { className: "p-6 space-y-6 max-h-[75vh] overflow-y-auto", children: [_jsxs("section", { children: [_jsx("h2", { className: "font-semibold text-gray-900 mb-2", children: "Detalji (samo pregled)" }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4 space-y-2 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Poslovnica:" }), " ", wo.storeName ?? '—'] }), wo.storeAddress != null && wo.storeAddress !== '' && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Adresa:" }), " ", wo.storeAddress] })), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Kategorija:" }), " ", wo.category ? formatCategory(wo.category) : '—'] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Komentar VMO:" }), " ", wo.commentToVendor ?? '—'] }), wo.assetDescription != null && wo.assetDescription !== '' && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Oprema:" }), " ", wo.assetDescription] })), wo.attachments != null && wo.attachments.length > 0 && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Privici:" }), _jsx("ul", { className: "list-disc list-inside mt-1", children: wo.attachments.map((a) => (_jsx("li", { children: a.fileName }, a.id))) })] }))] })] }), wo.workReport != null && wo.workReport.length > 0 && (_jsxs("section", { children: [_jsx("h2", { className: "font-semibold text-gray-900 mb-2", children: "Izvje\u0161taj tehni\u010Dara (samo pregled)" }), _jsx("div", { className: "overflow-x-auto border border-gray-200 rounded-lg", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-100", children: [_jsx("th", { className: "text-left p-2", children: "#" }), _jsx("th", { className: "text-left p-2", children: "Description" }), _jsx("th", { className: "text-left p-2", children: "Unit" }), _jsx("th", { className: "text-left p-2", children: "Quantity" })] }) }), _jsx("tbody", { children: wo.workReport.map((row, idx) => (_jsxs("tr", { className: "border-t border-gray-100", children: [_jsx("td", { className: "p-2", children: idx + 1 }), _jsx("td", { className: "p-2", children: row.description }), _jsx("td", { className: "p-2", children: row.unit }), _jsx("td", { className: "p-2", children: row.quantity })] }, idx))) })] }) })] })), canEditAndSubmit && (_jsxs("section", { children: [_jsx("h2", { className: "font-semibold text-gray-900 mb-2", children: "Ponuda tro\u0161ka" }), _jsx("div", { className: "overflow-x-auto border border-gray-200 rounded-lg", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-100", children: [_jsx("th", { className: "text-left p-2 w-10", children: "#" }), _jsx("th", { className: "text-left p-2", children: "Description" }), _jsx("th", { className: "text-left p-2", children: "Unit" }), _jsx("th", { className: "text-right p-2", children: "Kol." }), _jsx("th", { className: "text-right p-2", children: "Price/Unit" }), _jsx("th", { className: "text-right p-2", children: "Ukupno stavke" }), !proposalCompleted && _jsx("th", { className: "w-20" })] }) }), _jsx("tbody", { children: invoiceRows.map((row, index) => (_jsxs("tr", { className: `border-t border-gray-100 ${!row.isFromPriceList
                                                        ? 'bg-red-50'
                                                        : isAutoGeneratedRow(index)
                                                            ? 'bg-yellow-50'
                                                            : 'bg-green-50'}`, children: [_jsx("td", { className: "p-2", children: index + 1 }), _jsx("td", { className: "p-2", children: proposalCompleted ? (row.description) : !isAutoGeneratedRow(index) ? (_jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [_jsxs("select", { value: row.isNotInPricelist ? NOT_IN_PRICELIST_VALUE : (row.priceListItemId != null ? String(row.priceListItemId) : ''), onChange: (e) => {
                                                                            const val = e.target.value;
                                                                            if (val === '') {
                                                                                const next = [...invoiceRows];
                                                                                next[index] = {
                                                                                    description: '',
                                                                                    unit: '',
                                                                                    quantity: 0,
                                                                                    pricePerUnit: 0,
                                                                                    isFromPriceList: false,
                                                                                    isNotInPricelist: false,
                                                                                };
                                                                                setInvoiceRows(next);
                                                                            }
                                                                            else if (val === NOT_IN_PRICELIST_VALUE) {
                                                                                const next = [...invoiceRows];
                                                                                next[index] = {
                                                                                    ...next[index],
                                                                                    description: next[index]?.description ?? '',
                                                                                    unit: next[index]?.unit ?? '',
                                                                                    quantity: next[index]?.quantity ?? 0,
                                                                                    pricePerUnit: next[index]?.pricePerUnit ?? 0,
                                                                                    isFromPriceList: false,
                                                                                    priceListItemId: undefined,
                                                                                    isNotInPricelist: true,
                                                                                };
                                                                                setInvoiceRows(next);
                                                                            }
                                                                            else {
                                                                                const id = parseInt(val, 10);
                                                                                const item = priceList.find((p) => p.id === id);
                                                                                if (item)
                                                                                    selectPriceItem(index, item);
                                                                            }
                                                                        }, className: "p-2 border border-gray-300 rounded flex-shrink-0 w-48", children: [_jsx("option", { value: "", children: "Select item from pricelist" }), categories.map((cat) => (_jsx("optgroup", { label: cat, children: (byCategory.get(cat) ?? []).map((p) => (_jsxs("option", { value: p.id, children: [p.description, " \u2014 \u20AC", p.pricePerUnit] }, p.id))) }, cat))), _jsx("option", { value: NOT_IN_PRICELIST_VALUE, children: "Item not in pricelist" })] }), row.isNotInPricelist && (_jsx("input", { type: "text", value: row.description, onChange: (e) => updateRow(index, 'description', e.target.value), placeholder: "Enter item name", className: "p-2 border border-gray-300 rounded flex-1 min-w-0" }))] })) : (row.description) }), _jsx("td", { className: "p-2", children: proposalCompleted ||
                                                                isArrivalRow(index) ||
                                                                isServiceTimeRow(index) ||
                                                                row.isFromPriceList ? (row.unit) : (_jsx("input", { type: "text", value: row.unit, onChange: (e) => updateRow(index, 'unit', e.target.value), className: "p-2 border border-gray-300 rounded w-24" })) }), _jsx("td", { className: "p-2 text-right", children: proposalCompleted ? (row.quantity) : isServiceTimeRow(index) ? (_jsx("span", { title: "Calculated from check-in/check-out (round up to 15 min units)", children: row.quantity })) : isArrivalRow(index) ? (_jsx("span", { title: "Arrival to location is always 1 per intervention", children: "1" })) : (_jsx("input", { type: "number", min: 0, step: 1, value: row.quantity, onChange: (e) => updateRow(index, 'quantity', parseFloat(e.target.value) || 0), className: "p-2 border border-gray-300 rounded w-20 text-right" })) }), _jsx("td", { className: "p-2 text-right", children: proposalCompleted ||
                                                                isArrivalRow(index) ||
                                                                isServiceTimeRow(index) ||
                                                                row.isFromPriceList ? (`€${Number(row.pricePerUnit).toFixed(2)}`) : (_jsx("input", { type: "number", min: 0, step: 0.01, value: row.pricePerUnit, onChange: (e) => updateRow(index, 'pricePerUnit', parseFloat(e.target.value) || 0), className: "p-2 border border-gray-300 rounded w-24 text-right" })) }), _jsxs("td", { className: "p-2 text-right font-medium", children: ["\u20AC", ((row.quantity || 0) * (row.pricePerUnit || 0)).toFixed(2)] }), !proposalCompleted && (_jsx("td", { className: "p-2", children: !isAutoGeneratedRow(index) ? (_jsx("button", { type: "button", onClick: () => removeRow(index), className: "text-red-600 hover:text-red-800", "aria-label": "Remove row", children: "\u2715" })) : null }))] }, index))) })] }) }), !proposalCompleted && (_jsx(Button, { type: "button", size: "sm", variant: "secondary", onClick: addRow, className: "mt-2", children: "+ Dodaj stavku" })), _jsx("div", { className: "mt-3 flex flex-wrap gap-2 items-center", children: proposalCompleted ? (_jsx(Button, { type: "button", variant: "secondary", size: "sm", onClick: () => setProposalCompleted(false), children: "Uredi ponudu" })) : (_jsx(Button, { type: "button", size: "sm", onClick: () => setProposalCompleted(true), disabled: !canComplete, children: "Zaklju\u010Di ponudu" })) }), _jsxs("div", { className: "mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center", children: [_jsx("span", { className: "font-semibold text-gray-900", children: "Ukupno:" }), _jsxs("span", { className: "text-2xl font-bold text-blue-900", children: ["\u20AC", total.toFixed(2)] })] }), _jsx("div", { className: "mt-4", children: _jsx(Button, { type: "button", onClick: handleSend, disabled: !proposalCompleted || !canComplete || submitMutation.isPending, children: submitMutation.isPending ? 'Slanje...' : 'Pošalji ponudu' }) })] })), !canEditAndSubmit && (wo.invoiceRows != null &&
                            wo.invoiceRows.length > 0 && (_jsxs("section", { children: [_jsx("h2", { className: "font-semibold text-gray-900 mb-2", children: "Ponuda tro\u0161ka (samo pregled)" }), _jsx("div", { className: "overflow-x-auto border border-gray-200 rounded-lg", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-100", children: [_jsx("th", { className: "text-left p-2", children: "#" }), _jsx("th", { className: "text-left p-2", children: "Description" }), _jsx("th", { className: "text-left p-2", children: "Unit" }), _jsx("th", { className: "text-right p-2", children: "Kol." }), _jsx("th", { className: "text-right p-2", children: "Price/Unit" }), _jsx("th", { className: "text-right p-2", children: "Ukupno" })] }) }), _jsx("tbody", { children: wo.invoiceRows.map((r) => (_jsxs("tr", { className: `border-t border-gray-100 ${r.priceListItemId == null
                                                        ? 'bg-red-50'
                                                        : isAutoGeneratedInvoiceRowReadonly(r)
                                                            ? 'bg-yellow-50'
                                                            : 'bg-green-50'}`, children: [_jsx("td", { className: "p-2", children: r.rowNumber }), _jsx("td", { className: "p-2", children: r.description }), _jsx("td", { className: "p-2", children: r.unit }), _jsx("td", { className: "p-2 text-right", children: r.quantity }), _jsxs("td", { className: "p-2 text-right", children: ["\u20AC", Number(r.pricePerUnit).toFixed(2)] }), _jsxs("td", { className: "p-2 text-right", children: ["\u20AC", Number(r.lineTotal).toFixed(2)] })] }, r.id))) })] }) }), _jsx("p", { className: "text-xs text-gray-600 mt-2", children: "Boje: svijetlo \u017Euto = automatski generirano (dolazak/radno vrijeme), svijetlo zeleno = stavka iz cjenika, svijetlo crveno = stavka izvan cjenika." }), wo.totalCost != null && (_jsxs("p", { className: "mt-2 font-semibold", children: ["Ukupno: \u20AC", Number(wo.totalCost).toFixed(2)] }))] }))), wo.auditLog != null && wo.auditLog.length > 0 && (_jsxs("section", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Povijest" }), _jsx("div", { className: "space-y-2", children: wo.auditLog.map((entry) => (_jsxs("div", { className: "text-sm bg-gray-50 rounded-lg p-3", children: [_jsx("span", { className: "text-gray-600", children: new Date(entry.createdAt).toLocaleString() }), ' — ', _jsx("span", { className: "font-medium", children: formatHistoryAction(entry.actionType) }), entry.prevStatus != null && (_jsxs("span", { className: "text-gray-600", children: [" (", formatStatusAny(entry.prevStatus), " \u2192 ", formatStatusAny(entry.newStatus), ")"] })), _jsxs("p", { className: "mt-1 text-gray-600", children: ["Izvr\u0161io ", entry.actorName, entry.actorRole != null ? ` (${entry.actorRole})` : ''] }), entry.comment != null && _jsxs("p", { className: "text-gray-600 mt-1", children: ["\"", entry.comment, "\""] })] }, entry.id))) })] })), submitMutation.isError && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsx("p", { className: "text-sm text-red-700", children: submitMutation.error?.response?.data?.error ??
                                    'Failed to submit' }) }))] })] }) }));
}
