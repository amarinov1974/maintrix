import { jsx as _jsx } from "react/jsx-runtime";
export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', children, ...props }) {
    const baseStyles = 'font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed';
    const variantStyles = {
        primary: '',
        secondary: '',
        danger: '',
    };
    const variantInlineStyles = {
        primary: {
            backgroundColor: 'var(--color-accent)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-button)',
            border: 'none',
        },
        secondary: {
            backgroundColor: 'transparent',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-button)',
            border: '1px solid var(--color-border)',
        },
        danger: {
            backgroundColor: 'var(--color-danger)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-button)',
            border: 'none',
        },
    };
    const sizeStyles = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3',
    };
    return (_jsx("button", { type: type, className: `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`, style: variantInlineStyles[variant], onMouseEnter: e => {
            if (variant === 'primary')
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
            if (variant === 'secondary')
                e.currentTarget.style.backgroundColor = 'var(--color-bg)';
            if (variant === 'danger')
                e.currentTarget.style.opacity = '0.85';
        }, onMouseLeave: e => {
            if (variant === 'primary')
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            if (variant === 'secondary')
                e.currentTarget.style.backgroundColor = 'transparent';
            if (variant === 'danger')
                e.currentTarget.style.opacity = '1';
        }, ...props, children: children }));
}
