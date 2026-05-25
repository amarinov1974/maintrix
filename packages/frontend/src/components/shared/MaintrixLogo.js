import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function MaintrixLogo({ size = 'md', variant = 'light' }) {
    const scales = { sm: 0.6, md: 1, lg: 1.6 };
    const s = scales[size];
    const w = Math.round(32 * s);
    const h = Math.round(28 * s);
    const textColor = variant === 'light' ? '#FFFFFF' : '#1D1D1F';
    const leftColor = variant === 'light' ? '#FFFFFF' : '#1D1D1F';
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsxs("svg", { width: w, height: h, viewBox: "0 0 32 28", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("polygon", { points: "0,28 0,0 6,0 16,14 8,28", fill: leftColor }), _jsx("polygon", { points: "32,0 32,28 24,28 16,14 26,0", fill: "#2563EB" }), _jsx("polygon", { points: "22,0 32,0 28,6 18,6", fill: "#60A5FA" })] }), _jsx("span", { style: {
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: size === 'sm' ? '14px' : size === 'md' ? '16px' : '22px',
                    fontWeight: '600',
                    letterSpacing: '0.08em',
                    color: textColor,
                }, children: "MAINTRIX" })] }));
}
export default MaintrixLogo;
