/**
 * Entry Screen
 * Demo login - select user type and user
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI, type User } from '../api/auth';
import { SESSION_STORAGE_KEY } from '../api/client';
import { MaintrixLogo } from '../components/shared/MaintrixLogo';

const INTERNAL_ROLE_ORDER = ['SM', 'AM', 'AMM', 'D', 'C2', 'ADMIN', 'BOD'];

function sortInternalUsers(users: User[]): User[] {
  return [...users].sort((a, b) => {
    const roleIndexA = INTERNAL_ROLE_ORDER.indexOf(a.role);
    const roleIndexB = INTERNAL_ROLE_ORDER.indexOf(b.role);
    const roleA = roleIndexA === -1 ? 999 : roleIndexA;
    const roleB = roleIndexB === -1 ? 999 : roleIndexB;
    if (roleA !== roleB) return roleA - roleB;
    if (a.role === 'SM' && b.role === 'SM') {
      return (a.storeId ?? 0) - (b.storeId ?? 0);
    }
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
}

const VENDOR_ROLE_ORDER = ['S1', 'S2', 'S3'];

function sortVendorUsers(users: User[]): User[] {
  return [...users].sort((a, b) => {
    const roleIndexA = VENDOR_ROLE_ORDER.indexOf(a.role);
    const roleIndexB = VENDOR_ROLE_ORDER.indexOf(b.role);
    const roleA = roleIndexA === -1 ? 999 : roleIndexA;
    const roleB = roleIndexB === -1 ? 999 : roleIndexB;
    if (roleA !== roleB) return roleA - roleB;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
}

export function EntryScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userType, setUserType] = useState<'INTERNAL' | 'VENDOR'>('INTERNAL');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [gateUsername, setGateUsername] = useState('');
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);

  const {
    data: gateStatus,
    isLoading: gateLoading,
    refetch: refetchGate,
  } = useQuery({
    queryKey: ['gate-status'],
    queryFn: authAPI.getGateStatus,
  });

  const gateEnabled = gateStatus?.gateEnabled ?? false;
  const gateAuthenticated = gateStatus?.authenticated ?? false;
  const showGateForm = gateEnabled && !gateAuthenticated;
  const showDemoForm = !gateEnabled || gateAuthenticated;

  const gateLoginMutation = useMutation({
    mutationFn: () => authAPI.gateLogin(gateUsername, gatePassword),
    onSuccess: (data) => {
      setGateError(null);
      setGateUsername('');
      setGatePassword('');
      refetchGate();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setGateError(
        err?.response?.data?.error ?? 'Prijava neuspješna. Pokušajte ponovo.'
      );
    },
  });

  const {
    data: internalUsers,
    isLoading: internalLoading,
    isError: internalError,
    error: internalErrorDetail,
    refetch: refetchInternal,
  } = useQuery({
    queryKey: ['internal-users'],
    queryFn: authAPI.getInternalUsers,
    enabled: showDemoForm && userType === 'INTERNAL',
  });

  const {
    data: vendorUsers,
    isLoading: vendorLoading,
    isError: vendorError,
    error: vendorErrorDetail,
    refetch: refetchVendor,
  } = useQuery({
    queryKey: ['vendor-users'],
    queryFn: authAPI.getVendorUsers,
    enabled: showDemoForm && userType === 'VENDOR',
  });

  const usersLoading = userType === 'INTERNAL' ? internalLoading : vendorLoading;
  const usersError = userType === 'INTERNAL' ? internalError : vendorError;
  const usersErrorDetail = userType === 'INTERNAL' ? internalErrorDetail : vendorErrorDetail;
  const refetchUsers = userType === 'INTERNAL' ? refetchInternal : refetchVendor;

  const users: User[] | undefined =
    userType === 'INTERNAL'
      ? internalUsers != null
        ? sortInternalUsers(internalUsers)
        : undefined
      : vendorUsers != null
        ? sortVendorUsers(vendorUsers)
        : undefined;

  const loginMutation = useMutation({
    mutationFn: authAPI.demoLogin,
    onSuccess: async (data, variables) => {
      if (!data.success || !data.user) return;
      if (data.sessionId && typeof window !== 'undefined') {
        localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      }
      const user = data.user;
      const userType = variables.userType;
      const role = String(user.role ?? '').trim();
      if (!role) {
        console.error('Login response missing role', data);
        return;
      }
      queryClient.setQueryData(['session'], {
        session: {
          userId: user.id,
          userName: user.name,
          role,
          userType,
          companyId: user.companyId,
          companyName: user.companyName,
          storeId: user.storeId,
          storeName: user.storeName,
          regionId: user.regionId,
          regionName: user.regionName,
        },
      });
      if (role === 'SM') navigate('/store-manager');
      else if (role === 'AM') navigate('/area-manager');
      else if (role === 'AMM') navigate('/amm');
      else if (role === 'D' || role === 'C2' || role === 'BOD')
        navigate('/director');
      else if (role === 'ADMIN') navigate('/admin');
      else if (role === 'S1') navigate('/vendor/s1');
      else if (role === 'S2') navigate('/vendor/s2');
      else if (role === 'S3') navigate('/vendor/s3');
      else navigate('/');
    },
  });

  const handleLogin = () => {
    if (selectedUserId == null) return;
    loginMutation.mutate({ userType, userId: selectedUserId });
  };

  const handleGateLogout = async () => {
    await authAPI.gateLogout();
    refetchGate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 relative">
      {gateLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
          <p className="text-gray-600">Loading…</p>
        </div>
      )}
      {showGateForm && (
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <MaintrixLogo size="md" variant="dark" />
          </div>
          <p className="text-gray-600 mb-6">Prijavite se za nastavak</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              gateLoginMutation.mutate();
            }}
          >
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Korisničko ime
              </label>
              <input
                type="text"
                value={gateUsername}
                onChange={(e) => setGateUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lozinka
              </label>
              <input
                type="password"
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {gateError && (
              <p className="mb-4 text-red-600 text-sm">{gateError}</p>
            )}
            <button
              type="submit"
              disabled={gateLoginMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {gateLoginMutation.isPending ? 'Prijava u tijeku...' : 'Prijava'}
            </button>
          </form>
        </div>
      )}
      {showDemoForm && (
      <>
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MaintrixLogo size="md" variant="dark" />
        </div>
        <p className="text-gray-600 mb-8">Demo način — odabir korisnika</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vrsta korisnika
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setUserType('INTERNAL');
                setSelectedUserId(null);
              }}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                userType === 'INTERNAL'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Interni korisnik
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('VENDOR');
                setSelectedUserId(null);
              }}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                userType === 'VENDOR'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Izvođač
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Odabir korisnika
          </label>
          {usersLoading && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
              Učitavanje korisnika...
            </p>
          )}
          {usersError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
              <p>Nije moguće učitati korisnike. Provjeri je li backend pokrenut.</p>
              <p className="mt-1 text-xs opacity-90">
                {(usersErrorDetail as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ??
                  (usersErrorDetail as { message?: string })?.message ??
                  String(usersErrorDetail)}
              </p>
              <button
                type="button"
                onClick={() => refetchUsers()}
                className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline"
              >
                Pokušaj ponovo
              </button>
            </div>
          )}
          {!usersLoading && !usersError && Array.isArray(users) && users.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
              Nema korisnika u bazi. Pokreni: <code className="bg-amber-100 px-1 rounded">npm run db:seed</code> in the backend package.
            </p>
          )}
          <select
            value={selectedUserId ?? ''}
            onChange={(e) =>
              setSelectedUserId(e.target.value ? Number(e.target.value) : null)
            }
            disabled={usersLoading || usersError}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Odaberi korisnika --</option>
            {users?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
                {user.storeName != null ? ` - ${user.storeName}` : ''}
                {user.regionName != null ? ` - ${user.regionName}` : ''}
                {user.vendorCompanyName != null
                  ? ` - ${user.vendorCompanyName}`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={selectedUserId == null || loginMutation.isPending}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {loginMutation.isPending ? 'Prijava u tijeku...' : 'Prijava'}
        </button>

        {loginMutation.isError && (
          <p className="mt-4 text-red-600 text-sm text-center">
            Prijava neuspješna. Pokušajte ponovo.
          </p>
        )}

        <p className="mt-6 text-xs text-gray-500 text-center">
          Demo način — bez lozinke
        </p>
        {gateEnabled && gateAuthenticated && (
          <button
            type="button"
            onClick={handleGateLogout}
            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Odjava
          </button>
        )}
      </div>
      </>
      )}
    </div>
  );
}

export default EntryScreen;
