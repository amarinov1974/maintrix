import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Protected Route
 * Redirects to entry screen if not authenticated
 */
import { Navigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
export function ProtectedRoute({ children, allowedRoles }) {
    const { session, isLoading } = useSession();
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "text-gray-600", children: "Loading..." }) }));
    }
    if (!session) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    const sessionRole = String(session.role ?? '').trim();
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(sessionRole)) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "text-red-600", children: "Access Denied" }) }));
    }
    return _jsx(_Fragment, { children: children });
}
