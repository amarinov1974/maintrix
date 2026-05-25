import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Entry Screen
 * Demo login - select user type and user
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../api/auth';
import { SESSION_STORAGE_KEY } from '../api/client';
import { MaintrixLogo } from '../components/shared/MaintrixLogo';
const INTERNAL_ROLE_ORDER = ['SM', 'AM', 'AMM', 'D', 'C2', 'ADMIN', 'BOD'];
function sortInternalUsers(users) {
    return [...users].sort((a, b) => {
        const roleIndexA = INTERNAL_ROLE_ORDER.indexOf(a.role);
        const roleIndexB = INTERNAL_ROLE_ORDER.indexOf(b.role);
        const roleA = roleIndexA === -1 ? 999 : roleIndexA;
        const roleB = roleIndexB === -1 ? 999 : roleIndexB;
        if (roleA !== roleB)
            return roleA - roleB;
        if (a.role === 'SM' && b.role === 'SM') {
            return (a.storeId ?? 0) - (b.storeId ?? 0);
        }
        return (a.name ?? '').localeCompare(b.name ?? '');
    });
}
const VENDOR_ROLE_ORDER = ['S1', 'S2', 'S3'];
function sortVendorUsers(users) {
    return [...users].sort((a, b) => {
        const roleIndexA = VENDOR_ROLE_ORDER.indexOf(a.role);
        const roleIndexB = VENDOR_ROLE_ORDER.indexOf(b.role);
        const roleA = roleIndexA === -1 ? 999 : roleIndexA;
        const roleB = roleIndexB === -1 ? 999 : roleIndexB;
        if (roleA !== roleB)
            return roleA - roleB;
        return (a.name ?? '').localeCompare(b.name ?? '');
    });
}
export function EntryScreen() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [userType, setUserType] = useState('INTERNAL');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [gateUsername, setGateUsername] = useState('');
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState(null);
    const { data: gateStatus, isLoading: gateLoading, refetch: refetchGate, } = useQuery({
        queryKey: ['gate-status'],
        queryFn: authAPI.getGateStatus,
    });
    const gateEnabled = gateStatus?.gateEnabled ?? false;
    const gateAuthenticated = gateStatus?.authenticated ?? false;
    const showGateForm = gateEnabled && !gateAuthenticated;
    const showDemoForm = !gateEnabled || gateAuthenticated;
    const gateLoginMutation = useMutation({
        mutationFn: () => authAPI.gateLogin(gateUsername, gatePassword),
        onSuccess: () => {
            setGateError(null);
            setGateUsername('');
            setGatePassword('');
            refetchGate();
        },
        onError: (err) => {
            setGateError(err?.response?.data?.error ?? 'Prijava neuspješna. Pokušajte ponovo.');
        },
    });
    const { data: internalUsers, isLoading: internalLoading, isError: internalError, error: internalErrorDetail, refetch: refetchInternal, } = useQuery({
        queryKey: ['internal-users'],
        queryFn: authAPI.getInternalUsers,
        enabled: showDemoForm && userType === 'INTERNAL',
    });
    const { data: vendorUsers, isLoading: vendorLoading, isError: vendorError, error: vendorErrorDetail, refetch: refetchVendor, } = useQuery({
        queryKey: ['vendor-users'],
        queryFn: authAPI.getVendorUsers,
        enabled: showDemoForm && userType === 'VENDOR',
    });
    const usersLoading = userType === 'INTERNAL' ? internalLoading : vendorLoading;
    const usersError = userType === 'INTERNAL' ? internalError : vendorError;
    const usersErrorDetail = userType === 'INTERNAL' ? internalErrorDetail : vendorErrorDetail;
    const refetchUsers = userType === 'INTERNAL' ? refetchInternal : refetchVendor;
    const users = userType === 'INTERNAL'
        ? internalUsers != null
            ? sortInternalUsers(internalUsers)
            : undefined
        : vendorUsers != null
            ? sortVendorUsers(vendorUsers)
            : undefined;
    const loginMutation = useMutation({
        mutationFn: authAPI.demoLogin,
        onSuccess: async (data, variables) => {
            if (!data.success || !data.user)
                return;
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
            if (role === 'SM')
                navigate('/store-manager');
            else if (role === 'AM')
                navigate('/area-manager');
            else if (role === 'AMM')
                navigate('/amm');
            else if (role === 'D' || role === 'C2' || role === 'BOD')
                navigate('/director');
            else if (role === 'ADMIN')
                navigate('/admin');
            else if (role === 'S1')
                navigate('/vendor/s1');
            else if (role === 'S2')
                navigate('/vendor/s2');
            else if (role === 'S3')
                navigate('/vendor/s3');
            else
                navigate('/');
        },
    });
    const handleLogin = () => {
        if (selectedUserId == null)
            return;
        loginMutation.mutate({ userType, userId: selectedUserId });
    };
    const handleGateLogout = async () => {
        await authAPI.gateLogout();
        refetchGate();
    };
    return (_jsxs("div", { style: {
            minHeight: '100vh',
            backgroundColor: '#1D1D1F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
        }, children: [gateLoading && (_jsx("div", { style: { position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }, children: _jsx("p", { style: { color: '#6E6E73' }, children: "Loading\u2026" }) })), showGateForm && (_jsxs("div", { style: {
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '48px',
                    width: '100%',
                    maxWidth: '440px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }, children: [_jsx(MaintrixLogo, { size: "lg", variant: "dark" }), _jsx("p", { style: { fontSize: '13px', color: '#6E6E73', marginTop: '8px' }, children: "Prijavite se za nastavak" })] }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); gateLoginMutation.mutate(); }, children: [_jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px', letterSpacing: '0.03em' }, children: "KORISNI\u010CKO IME" }), _jsx("input", { type: "text", value: gateUsername, onChange: (e) => setGateUsername(e.target.value), required: true, autoComplete: "username", style: {
                                            width: '100%',
                                            padding: '12px 14px',
                                            border: '1px solid #D2D2D7',
                                            borderRadius: '10px',
                                            fontSize: '15px',
                                            color: '#1D1D1F',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.15s',
                                        }, onFocus: e => (e.target.style.borderColor = '#0071E3'), onBlur: e => (e.target.style.borderColor = '#D2D2D7') })] }), _jsxs("div", { style: { marginBottom: '24px' }, children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px', letterSpacing: '0.03em' }, children: "LOZINKA" }), _jsx("input", { type: "password", value: gatePassword, onChange: (e) => setGatePassword(e.target.value), required: true, autoComplete: "current-password", style: {
                                            width: '100%',
                                            padding: '12px 14px',
                                            border: '1px solid #D2D2D7',
                                            borderRadius: '10px',
                                            fontSize: '15px',
                                            color: '#1D1D1F',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.15s',
                                        }, onFocus: e => (e.target.style.borderColor = '#0071E3'), onBlur: e => (e.target.style.borderColor = '#D2D2D7') })] }), gateError && (_jsx("p", { style: { color: '#FF3B30', fontSize: '13px', marginBottom: '16px' }, children: gateError })), _jsx("button", { type: "submit", disabled: gateLoginMutation.isPending, style: {
                                    width: '100%',
                                    backgroundColor: '#0071E3',
                                    color: '#FFFFFF',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontSize: '15px',
                                    fontWeight: 500,
                                    cursor: gateLoginMutation.isPending ? 'not-allowed' : 'pointer',
                                    opacity: gateLoginMutation.isPending ? 0.6 : 1,
                                    transition: 'opacity 0.15s',
                                }, children: gateLoginMutation.isPending ? 'Prijava u tijeku...' : 'Prijava' })] })] })), showDemoForm && (_jsxs("div", { style: {
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '48px',
                    width: '100%',
                    maxWidth: '440px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }, children: [_jsx(MaintrixLogo, { size: "lg", variant: "dark" }), _jsx("p", { style: { fontSize: '13px', color: '#6E6E73', marginTop: '8px' }, children: "Demo na\u010Din \u2014 odabir korisnika" })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("p", { style: { fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '8px', letterSpacing: '0.03em' }, children: "VRSTA KORISNIKA" }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("button", { type: "button", onClick: () => { setUserType('INTERNAL'); setSelectedUserId(null); }, style: {
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: userType === 'INTERNAL' ? '2px solid #0071E3' : '2px solid #D2D2D7',
                                            backgroundColor: userType === 'INTERNAL' ? '#EBF5FF' : 'transparent',
                                            color: userType === 'INTERNAL' ? '#0071E3' : '#6E6E73',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }, children: "Interni korisnik" }), _jsx("button", { type: "button", onClick: () => { setUserType('VENDOR'); setSelectedUserId(null); }, style: {
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: userType === 'VENDOR' ? '2px solid #0071E3' : '2px solid #D2D2D7',
                                            backgroundColor: userType === 'VENDOR' ? '#EBF5FF' : 'transparent',
                                            color: userType === 'VENDOR' ? '#0071E3' : '#6E6E73',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }, children: "Izvo\u0111a\u010D" })] })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("p", { style: { fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '8px', letterSpacing: '0.03em' }, children: "ODABIR KORISNIKA" }), usersLoading && (_jsx("p", { style: { fontSize: '13px', color: '#FF9500', backgroundColor: '#FFF5E6', border: '1px solid #FDD8A0', borderRadius: '8px', padding: '10px', marginBottom: '8px' }, children: "U\u010Ditavanje korisnika..." })), usersError && (_jsxs("div", { style: { fontSize: '13px', color: '#FF3B30', backgroundColor: '#FFF0EE', border: '1px solid #FFBBB5', borderRadius: '8px', padding: '10px', marginBottom: '8px' }, children: [_jsx("p", { children: "Nije mogu\u0107e u\u010Ditati korisnike. Provjeri je li backend pokrenut." }), _jsx("p", { style: { marginTop: '6px', fontSize: '12px', opacity: 0.9 }, children: usersErrorDetail?.response?.data?.error ??
                                            usersErrorDetail?.message ??
                                            String(usersErrorDetail) }), _jsx("button", { type: "button", onClick: () => refetchUsers(), style: { marginTop: '6px', fontSize: '12px', color: '#FF3B30', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }, children: "Poku\u0161aj ponovo" })] })), !usersLoading && !usersError && Array.isArray(users) && users.length === 0 && (_jsxs("p", { style: { fontSize: '13px', color: '#FF9500', backgroundColor: '#FFF5E6', border: '1px solid #FDD8A0', borderRadius: '8px', padding: '10px', marginBottom: '8px' }, children: ["Nema korisnika u bazi. Pokreni: ", _jsx("code", { className: "bg-amber-100 px-1 rounded", children: "npm run db:seed" }), " in the backend package."] })), _jsxs("select", { value: selectedUserId ?? '', onChange: (e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null), disabled: usersLoading || !!usersError, style: {
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '1px solid #D2D2D7',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    color: '#1D1D1F',
                                    backgroundColor: '#FFFFFF',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box',
                                }, children: [_jsx("option", { value: "", children: "-- Odaberi korisnika --" }), users?.map((user) => (_jsxs("option", { value: user.id, children: [user.name, " (", user.role, ")", user.storeName != null ? ` - ${user.storeName}` : '', user.regionName != null ? ` - ${user.regionName}` : '', user.vendorCompanyName != null
                                                ? ` - ${user.vendorCompanyName}`
                                                : ''] }, user.id)))] })] }), _jsx("button", { type: "button", onClick: handleLogin, disabled: selectedUserId == null || loginMutation.isPending, style: {
                            width: '100%',
                            backgroundColor: selectedUserId == null || loginMutation.isPending ? '#AEAEB2' : '#0071E3',
                            color: '#FFFFFF',
                            padding: '14px',
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '15px',
                            fontWeight: 500,
                            cursor: selectedUserId == null || loginMutation.isPending ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.15s',
                        }, children: loginMutation.isPending ? 'Prijava u tijeku...' : 'Prijava' }), loginMutation.isError && (_jsx("p", { style: { color: '#FF3B30', fontSize: '13px', textAlign: 'center', marginTop: '12px' }, children: "Prijava neuspje\u0161na. Poku\u0161ajte ponovo." })), _jsx("p", { style: { fontSize: '12px', color: '#AEAEB2', textAlign: 'center', marginTop: '20px' }, children: "Demo na\u010Din \u2014 bez lozinke" }), gateEnabled && gateAuthenticated && (_jsx("button", { type: "button", onClick: handleGateLogout, style: { marginTop: '12px', width: '100%', fontSize: '13px', color: '#6E6E73', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }, children: "Odjava" }))] }))] }));
}
export default EntryScreen;
