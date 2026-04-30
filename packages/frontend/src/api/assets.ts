import { apiClient } from './client';

export interface Asset {
  id: number;
  name: string;
  description: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  status: 'ACTIVE' | 'FAULTY' | 'IN_SERVICE' | 'DECOMMISSIONED';
  storeId: number;
  category: { id: number; name: string } | null;
}

export const assetsAPI = {
  getById: async (id: number): Promise<Asset | null> => {
    try {
      const { data } = await apiClient.get<Asset>(`/assets/${id}`);
      return data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },

  listByStore: async (storeId: number): Promise<Asset[]> => {
    const { data } = await apiClient.get<{ assets: Asset[] }>(
      `/assets?storeId=${storeId}&limit=100`
    );
    return data.assets;
  },
};
