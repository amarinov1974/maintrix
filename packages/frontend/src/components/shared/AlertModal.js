import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from './Button';
/**
 * App-level replacement for `window.alert()`. Single OK button,
 * dismissible by clicking the backdrop.
 */
export function AlertModal({ message, title, confirmLabel = 'U redu', onClose }) {
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]", onClick: onClose, children: _jsxs("div", { className: "bg-white rounded-2xl max-w-md w-full shadow-2xl", onClick: (e) => e.stopPropagation(), children: [title != null && (_jsx("div", { className: "px-6 pt-6", children: _jsx("h3", { className: "text-lg font-semibold text-gray-900", children: title }) })), _jsx("div", { className: "px-6 py-5", children: _jsx("p", { className: "text-sm text-gray-700 whitespace-pre-line", children: message }) }), _jsx("div", { className: "px-6 pb-6 flex justify-end", children: _jsx(Button, { type: "button", onClick: onClose, children: confirmLabel }) })] }) }));
}
