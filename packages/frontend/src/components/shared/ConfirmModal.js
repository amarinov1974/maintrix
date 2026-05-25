import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from './Button';
/**
 * App-level replacement for `window.confirm()`. Two buttons; resolves
 * via callbacks. Use `variant="danger"` for destructive actions to
 * style the confirm button red.
 */
export function ConfirmModal({ message, title = 'Potvrda', confirmLabel = 'Potvrdi', cancelLabel = 'Odustani', variant = 'default', onConfirm, onCancel, }) {
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]", onClick: onCancel, children: _jsxs("div", { className: "bg-white rounded-2xl max-w-md w-full shadow-2xl", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "px-6 pt-6", children: _jsx("h3", { className: "text-lg font-semibold text-gray-900", children: title }) }), _jsx("div", { className: "px-6 py-5", children: _jsx("p", { className: "text-sm text-gray-700 whitespace-pre-line", children: message }) }), _jsxs("div", { className: "px-6 pb-6 flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onCancel, children: cancelLabel }), _jsx(Button, { type: "button", variant: variant === 'danger' ? 'danger' : 'primary', onClick: onConfirm, children: confirmLabel })] })] }) }));
}
