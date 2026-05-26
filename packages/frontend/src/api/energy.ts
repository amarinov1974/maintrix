/**
 * Energy module API
 */

import { apiClient } from './client';

export interface EnergyMeter {
  id: number;
  storeId: number;
  ommId: string;
  eanNumber: string | null;
  meterName: string;
  meterPurpose: string;
  isMainMeter: boolean;
  distributor: string | null;
  supplier: string | null;
  contractedPower: number | null;
  voltageLevel: string | null;
  tariffModel: string | null;
  meterPhases: string | null;
  meterSerialNumber: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnergyStore {
  id: number;
  name: string;
  address: string | null;
  active: boolean;
  internalCode: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  ownershipType: string | null;
  ownerName: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  grossArea: number | null;
  salesArea: number | null;
  storageArea: number | null;
  floors: number | null;
  buildYear: number | null;
  renovationYear: number | null;
  buildingType: string | null;
  workingHours: Record<string, string> | null;
  facilityContactName: string | null;
  facilityContactPhone: string | null;
  ownerContactName: string | null;
  ownerContactPhone: string | null;
  hasSolar: boolean;
  solarCapacityKwp: number | null;
  hasEvChargers: boolean;
  evChargerCount: number | null;
  evChargerPowerKw: number | null;
  heatingType: string | null;
  coolingType: string | null;
  region?: { id: number; name: string } | null;
  energyMeters: EnergyMeter[];
}

export interface EnergyReading {
  id: number;
  energyMeterId: number;
  intervalStart: string;
  activeEnergyKwh: number;
  reactiveEnergyKvarh: number | null;
  peakPowerKw: number | null;
  tariff: string | null;
  createdAt: string;
}

export interface EnergyReadingsSummary {
  totalKwh: number;
  peakKw: number;
  vtKwh: number;
  ntKwh: number;
}

export interface EnergyReadingsResponse {
  date: string;
  meterId: number;
  meterName: string;
  readings: EnergyReading[];
  summary: EnergyReadingsSummary;
}

export const energyAPI = {
  getEnergyStores: async () => {
    const { data } = await apiClient.get<{ stores: EnergyStore[] }>('/energy/stores');
    return data.stores;
  },

  getEnergyStore: async (id: number) => {
    const { data } = await apiClient.get<{ store: EnergyStore }>(`/energy/stores/${id}`);
    return data.store;
  },

  getEnergyReadings: async (storeId: number, date: string) => {
    const { data } = await apiClient.get<EnergyReadingsResponse>(
      `/energy/stores/${storeId}/readings`,
      { params: { date } }
    );
    return data;
  },
};
