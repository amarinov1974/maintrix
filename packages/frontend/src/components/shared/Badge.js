import { jsx as _jsx } from "react/jsx-runtime";
export function Badge({ children, variant = 'default', className = '' }) {
    const variantStyles = {
        default: { backgroundColor: '#F5F5F7', color: '#1D1D1F', border: '1px solid #D2D2D7' },
        secondary: { backgroundColor: '#E8E8ED', color: '#6E6E73', border: '1px solid #D2D2D7' },
        success: { backgroundColor: '#E8F8EC', color: '#1A7F37', border: '1px solid #B5DFC1' },
        warning: { backgroundColor: '#FFF5E6', color: '#B45309', border: '1px solid #FDD8A0' },
        danger: { backgroundColor: '#FFF0EE', color: '#CC2200', border: '1px solid #FFBBB5' },
        urgent: { backgroundColor: 'var(--color-danger)', color: '#FFFFFF', border: 'none' },
    };
    return (_jsx("span", { className: `inline-flex items-center font-medium ${className}`, style: {
            ...variantStyles[variant],
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-badge)',
            letterSpacing: '0.01em',
            lineHeight: '18px',
        }, children: children }));
}
