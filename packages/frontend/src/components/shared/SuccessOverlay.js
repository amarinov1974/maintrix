import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * Success overlay shown for ~2s after a ticket action completes.
 * Anchored to the top of the viewport so it appears in the same place
 * regardless of whether it's rendered inside a centered-flex modal
 * backdrop or inline on a page (matches the SM submit page reference).
 */
export function SuccessOverlay({ message }) {
    return (_jsx("div", { className: "self-start mt-24 max-w-md w-full mx-4", children: _jsxs("div", { className: "bg-green-100 border-2 border-green-500 rounded-lg p-6 text-center", children: [_jsxs("p", { className: "text-green-800 font-semibold text-xl mb-2", children: ["\u2713 ", message] }), _jsx("p", { className: "text-green-700 text-sm", children: "Povratak na nadzornu plo\u010Du za 2 sekunde..." })] }) }));
}
