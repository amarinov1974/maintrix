import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { APPROVAL_THRESHOLDS, formatEuro } from '../../config/approval-thresholds';
export function ApprovalChainInfo({ roleDescription }) {
    const [isOpen, setIsOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx("div", { style: { marginBottom: '16px' }, children: _jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                    }, children: [_jsx("p", { style: { fontSize: '13px', color: '#3C3C43', margin: 0 }, children: roleDescription }), _jsx("button", { type: "button", onClick: () => setIsOpen(true), style: {
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                color: '#0071E3',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }, children: "\u24D8 Kako funkcionira odobrenje?" })] }) }), isOpen && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    zIndex: 60,
                    backdropFilter: 'blur(4px)',
                }, onClick: () => setIsOpen(false), children: _jsxs("div", { style: {
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '520px',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                        border: '1px solid #E8E8ED',
                    }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { style: {
                                padding: '20px 24px',
                                borderBottom: '1px solid #E8E8ED',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }, children: [_jsx("h3", { style: { margin: 0, fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }, children: "Kako funkcionira odobrenje?" }), _jsx("button", { type: "button", onClick: () => setIsOpen(false), style: {
                                        border: '1px solid #D2D2D7',
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '10px',
                                        padding: '6px 10px',
                                        fontSize: '12px',
                                        color: '#3C3C43',
                                        cursor: 'pointer',
                                    }, children: "Zatvori" })] }), _jsx("div", { style: { padding: '18px 24px 22px' }, children: _jsxs("ul", { style: { margin: 0, paddingLeft: '18px', color: '#3C3C43', fontSize: '14px', lineHeight: 1.9 }, children: [_jsxs("li", { children: ["\u2264 ", formatEuro(APPROVAL_THRESHOLDS.AM_MAX), ": AM"] }), _jsxs("li", { children: [formatEuro(APPROVAL_THRESHOLDS.AM_MAX + 1), " \u2013 ", formatEuro(APPROVAL_THRESHOLDS.DIRECTOR_MAX), ": AM \u2192 D \u2192 C2"] }), _jsxs("li", { children: ["> ", formatEuro(APPROVAL_THRESHOLDS.DIRECTOR_MAX), ": AM \u2192 D \u2192 C2 \u2192 BOD"] })] }) })] }) }))] }));
}
