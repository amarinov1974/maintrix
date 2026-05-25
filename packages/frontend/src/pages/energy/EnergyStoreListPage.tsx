import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/shared/Layout';
import { energyAPI } from '../../api/energy';

export function EnergyStoreListPage() {
  const navigate = useNavigate();

  const { data: stores, isLoading, isError } = useQuery({
    queryKey: ['energy-stores'],
    queryFn: energyAPI.getEnergyStores,
  });

  return (
    <Layout screenTitle="Energetika" backLink="/admin" backLabel="Admin panel">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Poslovnice — energetika</h1>
          <p className="text-gray-600">Pregled poslovnica i brojila potrošnje energije</p>
        </div>

        {isLoading && (
          <p className="text-gray-500 text-sm">Učitavanje...</p>
        )}

        {isError && (
          <p className="text-red-600 text-sm">Greška pri učitavanju poslovnica.</p>
        )}

        {!isLoading && !isError && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Naziv</th>
                  <th className="px-4 py-3 font-medium">Šifra</th>
                  <th className="px-4 py-3 font-medium">Grad</th>
                  <th className="px-4 py-3 font-medium">Regija</th>
                  <th className="px-4 py-3 font-medium text-right">Brojila</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stores ?? []).map((store) => (
                  <tr
                    key={store.id}
                    onClick={() => navigate(`/energy/stores/${store.id}`)}
                    className="hover:bg-blue-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{store.name}</td>
                    <td className="px-4 py-3 text-gray-600">{store.internalCode ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{store.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{store.region?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {store.energyMeters.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(stores ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-gray-500 text-sm">Nema poslovnica.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
