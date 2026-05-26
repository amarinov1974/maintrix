import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layout } from '../../components/shared/Layout';
import { energyAPI, type EnergyStore } from '../../api/energy';

type Tab = 'general' | 'energy';

const LABELS: Record<string, string> = {
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

function formatEnum(value: string | null | undefined): string {
  if (value == null) return '—';
  return LABELS[value] ?? value;
}

function formatDate(value: string | null | undefined): string {
  if (value == null) return '—';
  return new Date(value).toLocaleDateString('hr-HR');
}

function formatNumber(value: number | null | undefined, suffix = ''): string {
  if (value == null) return '—';
  return `${value.toLocaleString('hr-HR')}${suffix}`;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatIntervalTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function SummaryCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function GeneralTab({ store }: { store: EnergyStore }) {
  const workingHours =
    store.workingHours != null
      ? Object.entries(store.workingHours)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : '—';

  return (
    <dl className="divide-y divide-gray-100">
      <FieldRow label="Naziv" value={store.name} />
      <FieldRow label="Interna šifra" value={store.internalCode ?? '—'} />
      <FieldRow label="Adresa" value={store.address ?? '—'} />
      <FieldRow label="Grad" value={store.city ?? '—'} />
      <FieldRow label="Poštanski broj" value={store.postalCode ?? '—'} />
      <FieldRow
        label="Koordinate"
        value={
          store.latitude != null && store.longitude != null
            ? `${store.latitude}, ${store.longitude}`
            : '—'
        }
      />
      <FieldRow label="Regija" value={store.region?.name ?? '—'} />
      <FieldRow label="Vlasništvo" value={formatEnum(store.ownershipType)} />
      <FieldRow label="Vlasnik / najmodavac" value={store.ownerName ?? '—'} />
      <FieldRow label="Početak najma" value={formatDate(store.leaseStartDate)} />
      <FieldRow label="Kraj najma" value={formatDate(store.leaseEndDate)} />
      <FieldRow label="Bruto površina (m²)" value={formatNumber(store.grossArea)} />
      <FieldRow label="Prodajna površina (m²)" value={formatNumber(store.salesArea)} />
      <FieldRow label="Skladišna površina (m²)" value={formatNumber(store.storageArea)} />
      <FieldRow label="Katovi" value={store.floors ?? '—'} />
      <FieldRow label="Godina izgradnje" value={store.buildYear ?? '—'} />
      <FieldRow label="Godina renovacije" value={store.renovationYear ?? '—'} />
      <FieldRow label="Tip zgrade" value={formatEnum(store.buildingType)} />
      <FieldRow label="Radno vrijeme" value={workingHours} />
      <FieldRow label="Kontakt objekta" value={store.facilityContactName ?? '—'} />
      <FieldRow label="Telefon objekta" value={store.facilityContactPhone ?? '—'} />
      <FieldRow label="Kontakt vlasnika" value={store.ownerContactName ?? '—'} />
      <FieldRow label="Telefon vlasnika" value={store.ownerContactPhone ?? '—'} />
      <FieldRow label="Grijanje" value={formatEnum(store.heatingType)} />
      <FieldRow label="Hlađenje" value={formatEnum(store.coolingType)} />
      <FieldRow label="Solarni sustav" value={store.hasSolar ? 'Da' : 'Ne'} />
      <FieldRow
        label="Solarna snaga"
        value={store.hasSolar ? formatNumber(store.solarCapacityKwp, ' kWp') : '—'}
      />
      <FieldRow label="EV punionice" value={store.hasEvChargers ? 'Da' : 'Ne'} />
      <FieldRow label="Broj EV punionica" value={store.evChargerCount ?? '—'} />
      <FieldRow
        label="Snaga EV punionica"
        value={formatNumber(store.evChargerPowerKw, ' kW')}
      />
    </dl>
  );
}

function EnergyTab({ store }: { store: EnergyStore }) {
  const [selectedDate, setSelectedDate] = useState(() => todayISO());
  const hasMainMeter = store.energyMeters.some((m) => m.isMainMeter);

  const {
    data: readingsData,
    isLoading: readingsLoading,
    isError: readingsError,
  } = useQuery({
    queryKey: ['energy-readings', store.id, selectedDate],
    queryFn: () => energyAPI.getEnergyReadings(store.id, selectedDate),
    enabled: hasMainMeter,
  });

  const chartData = useMemo(
    () =>
      (readingsData?.readings ?? []).map((r) => ({
        time: formatIntervalTime(r.intervalStart),
        kwh: r.activeEnergyKwh,
      })),
    [readingsData]
  );

  if (store.energyMeters.length === 0) {
    return <p className="text-gray-500 text-sm">Nema registriranih brojila.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Brojila</h2>
      {store.energyMeters.map((meter) => (
        <div
          key={meter.id}
          className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h3 className="font-semibold text-gray-900">{meter.meterName}</h3>
            {meter.isMainMeter && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Glavno brojilo
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
              {formatEnum(meter.meterPurpose)}
            </span>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500">OMM ID</dt>
              <dd className="text-gray-900 font-mono text-xs">{meter.ommId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">EAN</dt>
              <dd className="text-gray-900 font-mono text-xs">{meter.eanNumber ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Distributer</dt>
              <dd className="text-gray-900">{meter.distributor ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Opskrbljivač</dt>
              <dd className="text-gray-900">{meter.supplier ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ugovorena snaga</dt>
              <dd className="text-gray-900">{formatNumber(meter.contractedPower, ' kW')}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Naponska razina</dt>
              <dd className="text-gray-900">{formatEnum(meter.voltageLevel)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Tarifni model</dt>
              <dd className="text-gray-900">{formatEnum(meter.tariffModel)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Faze</dt>
              <dd className="text-gray-900">{formatEnum(meter.meterPhases)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Serijski broj</dt>
              <dd className="text-gray-900">{meter.meterSerialNumber ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="text-gray-900">{meter.active ? 'Aktivno' : 'Neaktivno'}</dd>
            </div>
          </dl>
        </div>
      ))}
      </div>

      {hasMainMeter && (
        <div className="space-y-6 border-t border-gray-200 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Potrošnja po intervalima</h2>
              {readingsData != null && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {readingsData.meterName} · {readingsData.date}
                </p>
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gray-700">Datum</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
          </div>

          {readingsLoading && (
            <p className="text-gray-500 text-sm">Učitavanje očitanja...</p>
          )}

          {readingsError && (
            <p className="text-red-600 text-sm">Greška pri učitavanju očitanja.</p>
          )}

          {readingsData != null && !readingsLoading && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  label="Ukupna potrošnja"
                  value={readingsData.summary.totalKwh.toLocaleString('hr-HR')}
                  unit="kWh"
                />
                <SummaryCard
                  label="Vršna snaga"
                  value={readingsData.summary.peakKw.toLocaleString('hr-HR')}
                  unit="kW"
                />
                <SummaryCard
                  label="VT potrošnja"
                  value={readingsData.summary.vtKwh.toLocaleString('hr-HR')}
                  unit="kWh"
                />
                <SummaryCard
                  label="NT potrošnja"
                  value={readingsData.summary.ntKwh.toLocaleString('hr-HR')}
                  unit="kWh"
                />
              </div>

              {chartData.length > 0 ? (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        interval={7}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        unit=" kWh"
                        width={56}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const n = typeof value === 'number' ? value : Number(value);
                          return [`${n.toLocaleString('hr-HR')} kWh`, 'Potrošnja'];
                        }}
                        labelFormatter={(label) => `Vrijeme: ${label}`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '13px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="kwh"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">
                  Nema očitanja za odabrani datum.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EnergyStorePage() {
  const { id } = useParams();
  const storeId = id != null ? parseInt(id, 10) : NaN;
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const { data: store, isLoading, isError } = useQuery({
    queryKey: ['energy-store', storeId],
    queryFn: () => energyAPI.getEnergyStore(storeId),
    enabled: !Number.isNaN(storeId),
  });

  return (
    <Layout
      screenTitle={store?.name ?? 'Poslovnica'}
      backLink="/energy/stores"
      backLabel="Lista poslovnica"
    >
      <div className="space-y-6">
        {isLoading && <p className="text-gray-500 text-sm">Učitavanje...</p>}
        {isError && <p className="text-red-600 text-sm">Greška pri učitavanju poslovnice.</p>}

        {store != null && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
              <p className="text-gray-600">
                {[store.internalCode, store.city].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>

            <div className="border-b border-gray-200">
              <nav className="flex gap-6">
                {[
                  { key: 'general' as Tab, label: 'Opći podaci' },
                  { key: 'energy' as Tab, label: 'Energetika' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
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

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {activeTab === 'general' && <GeneralTab store={store} />}
              {activeTab === 'energy' && <EnergyTab store={store} />}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
