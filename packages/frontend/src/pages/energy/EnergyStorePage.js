import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { Layout } from '../../components/shared/Layout';
import { energyAPI } from '../../api/energy';
const LABELS = {
    OWNED: 'Vlasništvo',
    LEASED: 'Najam',
    STANDALONE: 'Samostojeća',
    SHOPPING_MALL: 'Trgovački centar',
    ROW: 'Niz',
    GAS: 'Plin',
    HEAT_PUMP: 'Toplinska pumpa',
    DISTRICT: 'Daljinsko grijanje',
    ELECTRIC: 'Električno',
    VRF: 'VRF',
    SPLIT: 'Split sustav',
    CHILLER: 'Chiller',
    OTHER: 'Ostalo',
    GENERAL: 'Opća potrošnja',
    HVAC: 'HVAC',
    REFRIGERATION: 'Rashladni uređaji',
    EV_CHARGING: 'EV punionice',
    LIGHTING: 'Rasvjeta',
    LV: 'NN',
    MV: 'SN',
    SINGLE: 'Jednotarifni',
    DUAL: 'Dvotarifni',
    MULTI: 'Višetarifni',
    SINGLE_PHASE: 'Jednofazno',
    THREE_PHASE: 'Trofazno',
};
function formatEnum(value) {
    if (value == null)
        return '—';
    return LABELS[value] ?? value;
}
function formatDate(value) {
    if (value == null)
        return '—';
    return new Date(value).toLocaleDateString('hr-HR');
}
function formatNumber(value, suffix = '') {
    if (value == null)
        return '—';
    return `${value.toLocaleString('hr-HR')}${suffix}`;
}
function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function formatIntervalTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function SummaryCard({ label, value, unit }) {
    return (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50/50 p-4", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: label }), _jsxs("p", { className: "mt-1 text-2xl font-bold text-gray-900", children: [value, _jsx("span", { className: "text-sm font-normal text-gray-500 ml-1", children: unit })] })] }));
}
function FieldRow({ label, value }) {
    return (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-b border-gray-100 last:border-0", children: [_jsx("dt", { className: "text-sm font-medium text-gray-500", children: label }), _jsx("dd", { className: "sm:col-span-2 text-sm text-gray-900", children: value })] }));
}
function GeneralTab({ store }) {
    const workingHours = store.workingHours != null
        ? Object.entries(store.workingHours)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : '—';
    return (_jsxs("dl", { className: "divide-y divide-gray-100", children: [_jsx(FieldRow, { label: "Naziv", value: store.name }), _jsx(FieldRow, { label: "Interna \u0161ifra", value: store.internalCode ?? '—' }), _jsx(FieldRow, { label: "Adresa", value: store.address ?? '—' }), _jsx(FieldRow, { label: "Grad", value: store.city ?? '—' }), _jsx(FieldRow, { label: "Po\u0161tanski broj", value: store.postalCode ?? '—' }), _jsx(FieldRow, { label: "Koordinate", value: store.latitude != null && store.longitude != null
                    ? `${store.latitude}, ${store.longitude}`
                    : '—' }), _jsx(FieldRow, { label: "Regija", value: store.region?.name ?? '—' }), _jsx(FieldRow, { label: "Vlasni\u0161tvo", value: formatEnum(store.ownershipType) }), _jsx(FieldRow, { label: "Vlasnik / najmodavac", value: store.ownerName ?? '—' }), _jsx(FieldRow, { label: "Po\u010Detak najma", value: formatDate(store.leaseStartDate) }), _jsx(FieldRow, { label: "Kraj najma", value: formatDate(store.leaseEndDate) }), _jsx(FieldRow, { label: "Bruto povr\u0161ina (m\u00B2)", value: formatNumber(store.grossArea) }), _jsx(FieldRow, { label: "Prodajna povr\u0161ina (m\u00B2)", value: formatNumber(store.salesArea) }), _jsx(FieldRow, { label: "Skladi\u0161na povr\u0161ina (m\u00B2)", value: formatNumber(store.storageArea) }), _jsx(FieldRow, { label: "Katovi", value: store.floors ?? '—' }), _jsx(FieldRow, { label: "Godina izgradnje", value: store.buildYear ?? '—' }), _jsx(FieldRow, { label: "Godina renovacije", value: store.renovationYear ?? '—' }), _jsx(FieldRow, { label: "Tip zgrade", value: formatEnum(store.buildingType) }), _jsx(FieldRow, { label: "Radno vrijeme", value: workingHours }), _jsx(FieldRow, { label: "Kontakt objekta", value: store.facilityContactName ?? '—' }), _jsx(FieldRow, { label: "Telefon objekta", value: store.facilityContactPhone ?? '—' }), _jsx(FieldRow, { label: "Kontakt vlasnika", value: store.ownerContactName ?? '—' }), _jsx(FieldRow, { label: "Telefon vlasnika", value: store.ownerContactPhone ?? '—' }), _jsx(FieldRow, { label: "Grijanje", value: formatEnum(store.heatingType) }), _jsx(FieldRow, { label: "Hla\u0111enje", value: formatEnum(store.coolingType) }), _jsx(FieldRow, { label: "Solarni sustav", value: store.hasSolar ? 'Da' : 'Ne' }), _jsx(FieldRow, { label: "Solarna snaga", value: store.hasSolar ? formatNumber(store.solarCapacityKwp, ' kWp') : '—' }), _jsx(FieldRow, { label: "EV punionice", value: store.hasEvChargers ? 'Da' : 'Ne' }), _jsx(FieldRow, { label: "Broj EV punionica", value: store.evChargerCount ?? '—' }), _jsx(FieldRow, { label: "Snaga EV punionica", value: formatNumber(store.evChargerPowerKw, ' kW') })] }));
}
function EnergyTab({ store }) {
    const [selectedDate, setSelectedDate] = useState(() => todayISO());
    const hasMainMeter = store.energyMeters.some((m) => m.isMainMeter);
    const { data: readingsData, isLoading: readingsLoading, isError: readingsError, } = useQuery({
        queryKey: ['energy-readings', store.id, selectedDate],
        queryFn: () => energyAPI.getEnergyReadings(store.id, selectedDate),
        enabled: hasMainMeter,
    });
    const chartData = useMemo(() => (readingsData?.readings ?? []).map((r) => ({
        time: formatIntervalTime(r.intervalStart),
        kwh: r.activeEnergyKwh,
    })), [readingsData]);
    if (store.energyMeters.length === 0) {
        return _jsx("p", { className: "text-gray-500 text-sm", children: "Nema registriranih brojila." });
    }
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Brojila" }), store.energyMeters.map((meter) => (_jsxs("div", { className: "border border-gray-200 rounded-lg p-4 bg-gray-50/50", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-3", children: [_jsx("h3", { className: "font-semibold text-gray-900", children: meter.meterName }), meter.isMainMeter && (_jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800", children: "Glavno brojilo" })), _jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700", children: formatEnum(meter.meterPurpose) })] }), _jsxs("dl", { className: "grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "OMM ID" }), _jsx("dd", { className: "text-gray-900 font-mono text-xs", children: meter.ommId })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "EAN" }), _jsx("dd", { className: "text-gray-900 font-mono text-xs", children: meter.eanNumber ?? '—' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "Distributer" }), _jsx("dd", { className: "text-gray-900", children: meter.distributor ?? '—' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "Opskrbljiva\u010D" }), _jsx("dd", { className: "text-gray-900", children: meter.supplier ?? '—' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "Ugovorena snaga" }), _jsx("dd", { className: "text-gray-900", children: formatNumber(meter.contractedPower, ' kW') })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "Naponska razina" }), _jsx("dd", { className: "text-gray-900", children: formatEnum(meter.voltageLevel) })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "Tarifni model" }), _jsx("dd", { className: "text-gray-900", children: formatEnum(meter.tariffModel) })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "Faze" }), _jsx("dd", { className: "text-gray-900", children: formatEnum(meter.meterPhases) })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "Serijski broj" }), _jsx("dd", { className: "text-gray-900", children: meter.meterSerialNumber ?? '—' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-gray-500", children: "Status" }), _jsx("dd", { className: "text-gray-900", children: meter.active ? 'Aktivno' : 'Neaktivno' })] })] })] }, meter.id)))] }), hasMainMeter && (_jsxs("div", { className: "space-y-6 border-t border-gray-200 pt-8", children: [_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "Potro\u0161nja po intervalima" }), readingsData != null && (_jsxs("p", { className: "text-sm text-gray-500 mt-0.5", children: [readingsData.meterName, " \u00B7 ", readingsData.date] }))] }), _jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [_jsx("span", { className: "font-medium text-gray-700", children: "Datum" }), _jsx("input", { type: "date", value: selectedDate, onChange: (e) => setSelectedDate(e.target.value), className: "border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] })] }), readingsLoading && (_jsx("p", { className: "text-gray-500 text-sm", children: "U\u010Ditavanje o\u010Ditanja..." })), readingsError && (_jsx("p", { className: "text-red-600 text-sm", children: "Gre\u0161ka pri u\u010Ditavanju o\u010Ditanja." })), readingsData != null && !readingsLoading && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(SummaryCard, { label: "Ukupna potro\u0161nja", value: readingsData.summary.totalKwh.toLocaleString('hr-HR'), unit: "kWh" }), _jsx(SummaryCard, { label: "Vr\u0161na snaga", value: readingsData.summary.peakKw.toLocaleString('hr-HR'), unit: "kW" }), _jsx(SummaryCard, { label: "VT potro\u0161nja", value: readingsData.summary.vtKwh.toLocaleString('hr-HR'), unit: "kWh" }), _jsx(SummaryCard, { label: "NT potro\u0161nja", value: readingsData.summary.ntKwh.toLocaleString('hr-HR'), unit: "kWh" })] }), chartData.length > 0 ? (_jsx("div", { className: "w-full h-80", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: chartData, margin: { top: 8, right: 16, left: 0, bottom: 8 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "time", tick: { fontSize: 11, fill: '#6b7280' }, interval: 7 }), _jsx(YAxis, { tick: { fontSize: 11, fill: '#6b7280' }, unit: " kWh", width: 56 }), _jsx(Tooltip, { formatter: (value) => {
                                                    const n = typeof value === 'number' ? value : Number(value);
                                                    return [`${n.toLocaleString('hr-HR')} kWh`, 'Potrošnja'];
                                                }, labelFormatter: (label) => `Vrijeme: ${label}`, contentStyle: {
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    fontSize: '13px',
                                                } }), _jsx(Line, { type: "monotone", dataKey: "kwh", stroke: "#2563eb", strokeWidth: 2, dot: false, activeDot: { r: 4 } })] }) }) })) : (_jsx("p", { className: "text-gray-500 text-sm text-center py-8", children: "Nema o\u010Ditanja za odabrani datum." }))] }))] }))] }));
}
export function EnergyStorePage() {
    const { id } = useParams();
    const storeId = id != null ? parseInt(id, 10) : NaN;
    const [activeTab, setActiveTab] = useState('general');
    const { data: store, isLoading, isError } = useQuery({
        queryKey: ['energy-store', storeId],
        queryFn: () => energyAPI.getEnergyStore(storeId),
        enabled: !Number.isNaN(storeId),
    });
    return (_jsx(Layout, { screenTitle: store?.name ?? 'Poslovnica', backLink: "/energy/stores", backLabel: "Lista poslovnica", children: _jsxs("div", { className: "space-y-6", children: [isLoading && _jsx("p", { className: "text-gray-500 text-sm", children: "U\u010Ditavanje..." }), isError && _jsx("p", { className: "text-red-600 text-sm", children: "Gre\u0161ka pri u\u010Ditavanju poslovnice." }), store != null && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: store.name }), _jsx("p", { className: "text-gray-600", children: [store.internalCode, store.city].filter(Boolean).join(' · ') || '—' })] }), _jsx("div", { className: "border-b border-gray-200", children: _jsx("nav", { className: "flex gap-6", children: [
                                    { key: 'general', label: 'Opći podaci' },
                                    { key: 'energy', label: 'Energetika' },
                                ].map((tab) => (_jsx("button", { type: "button", onClick: () => setActiveTab(tab.key), className: `pb-3 text-sm font-medium border-b-2 transition ${activeTab === tab.key
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: tab.label }, tab.key))) }) }), _jsxs("div", { className: "bg-white rounded-lg border border-gray-200 p-6", children: [activeTab === 'general' && _jsx(GeneralTab, { store: store }), activeTab === 'energy' && _jsx(EnergyTab, { store: store })] })] }))] }) }));
}
