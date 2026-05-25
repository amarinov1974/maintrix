import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Store Manager — Drafts list
 *
 * Lists tickets the current SM has saved as drafts (status DRAFT) so they
 * can be re-opened, edited, and submitted. Clicking a row opens the
 * existing TicketDetailModal which already exposes the "Submit ticket"
 * action when `canSubmitDraft` (owner + DRAFT).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Badge } from '../../components/shared';
import { TicketDetailModal } from './TicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import { formatCategory } from '../../utils/formatters';
const DESCRIPTION_PREVIEW_LENGTH = 120;
function descriptionPreview(description) {
    const trimmed = description.trim();
    if (trimmed.length <= DESCRIPTION_PREVIEW_LENGTH)
        return trimmed;
    return trimmed.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim() + '…';
}
export function SMDraftsPage() {
    const { session } = useSession();
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const { data: drafts = [], isLoading } = useQuery({
        queryKey: [
            'tickets',
            'store-manager',
            'drafts',
            session?.storeId,
            session?.userId,
        ],
        queryFn: () => ticketsAPI.list({
            storeId: session.storeId,
            currentOwnerUserId: session.userId,
            status: TicketStatus.DRAFT,
        }),
        enabled: session?.storeId != null && session?.userId != null,
        refetchOnWindowFocus: true,
    });
    const sorted = [...drafts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return (_jsxs(Layout, { screenTitle: "Nacrti prijava", children: [_jsxs("div", { className: "max-w-4xl mx-auto space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Nacrti prijava" }), _jsx("p", { className: "text-sm text-gray-600 mt-0.5", children: "Spremljeni nacrti \u2014 kliknite na nacrt da ga otvorite, dovr\u0161ite i po\u0161aljete." })] }), _jsx(Link, { to: "/store-manager", children: _jsx(Button, { type: "button", variant: "secondary", children: "Natrag na nadzornu plo\u010Du" }) })] }), isLoading ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje\u2026" })) : sorted.length === 0 ? (_jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600", children: "Nema spremljenih nacrta." })) : (_jsx("ul", { className: "space-y-2", children: sorted.map((ticket) => (_jsx("li", { children: _jsxs("button", { type: "button", className: "w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1", onClick: () => setSelectedTicketId(ticket.id), children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-2", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Prijava #", ticket.id] }), _jsx(Badge, { variant: "default", children: "Nacrt" }), ticket.urgent && _jsx(Badge, { variant: "urgent", children: "URGENT" }), _jsx("span", { className: "text-sm text-gray-600", children: formatCategory(ticket.category) }), _jsx("span", { className: "text-sm text-gray-500", children: new Date(ticket.createdAt).toLocaleDateString() })] }), _jsx("p", { className: "text-sm text-gray-700 whitespace-pre-wrap line-clamp-2", children: descriptionPreview(ticket.originalDescription ?? ticket.description) })] }) }, ticket.id))) }))] }), selectedTicketId != null && (_jsx(TicketDetailModal, { ticketId: selectedTicketId, onClose: () => setSelectedTicketId(null) }))] }));
}
