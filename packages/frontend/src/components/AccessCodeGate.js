import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Access Code Gate
 * When VITE_ACCESS_CODE is set, requires the user to enter the code before accessing the app.
 * Stores confirmation in localStorage on success.
 */
import { useState } from 'react';
const ACCESS_CODE_STORAGE_KEY = 'cmms_access_code_verified';
function isAccessCodeRequired() {
    const code = import.meta.env.VITE_ACCESS_CODE;
    return typeof code === 'string' && code.trim().length > 0;
}
function isVerified() {
    const expected = import.meta.env.VITE_ACCESS_CODE;
    if (typeof expected !== 'string' || !expected.trim())
        return true;
    try {
        const stored = localStorage.getItem(ACCESS_CODE_STORAGE_KEY);
        return stored === expected.trim();
    }
    catch {
        return false;
    }
}
function setVerified() {
    const code = import.meta.env.VITE_ACCESS_CODE;
    if (typeof code === 'string' && code.trim()) {
        localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code.trim());
    }
}
export function AccessCodeGate({ children }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState(null);
    const [verified, setVerifiedState] = useState(isVerified);
    if (!isAccessCodeRequired()) {
        return _jsx(_Fragment, { children: children });
    }
    if (verified) {
        return _jsx(_Fragment, { children: children });
    }
    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        const expected = (import.meta.env.VITE_ACCESS_CODE ?? '').trim();
        if (code.trim() === expected) {
            setVerified();
            setVerifiedState(true);
        }
        else {
            setError('Invalid access code');
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl p-8 max-w-md w-full", children: [_jsx("div", { className: "flex items-center justify-center mb-4", children: _jsx("img", { src: "/ntl-logo.png", alt: "NTL logo", className: "h-16 w-auto object-contain" }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: "CMMS System" }), _jsx("p", { className: "text-gray-600 mb-6", children: "Enter access code to continue" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("input", { type: "password", value: code, onChange: (e) => setCode(e.target.value), placeholder: "Access code", autoComplete: "off", className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4" }), error && (_jsx("p", { className: "text-red-600 text-sm mb-4", children: error })), _jsx("button", { type: "submit", className: "w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition", children: "Continue" })] })] }) }));
}
