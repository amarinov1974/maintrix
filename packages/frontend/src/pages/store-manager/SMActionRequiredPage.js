import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Store Manager — Action Required (clarification needed)
 * List of tickets returned for SM clarification, newest first.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Badge } from '../../components/shared';
import { TicketDetailModal } from './TicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import { formatCategory, formatStatus, getStatusBadgeVariant } from '../../utils/formatters';
const DESCRIPTION_PREVIEW_LENGTH = 120;
function descriptionPreview(description) {
    const trimmed = description.trim();
    if (trimmed.length <= DESCRIPTION_PREVIEW_LENGTH)
        return trimmed;
    return trimmed.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim() + '…';
}
export function SMActionRequiredPage() {
    const { session } = useSession();
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const { data: actionRequiredTickets = [], isLoading } = useQuery({
        queryKey: [
            'tickets',
            'store-manager',
            'action-required',
            session?.storeId,
            session?.userId,
        ],
        queryFn: () => ticketsAPI.list({
            storeId: session.storeId,
            currentOwnerUserId: session.userId,
            status: TicketStatus.AWAITING_CREATOR_RESPONSE,
        }),
        enabled: session?.storeId != null &&
            session?.userId != null,
        refetchOnWindowFocus: true, // so returned tickets (e.g. after AMM ping-pong) show up promptly
    });
    const sorted = [...actionRequiredTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return (_jsxs(Layout, { screenTitle: "Action Required", children: [_jsxs("div", { className: "max-w-4xl mx-auto space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Action Required" }), _jsx("p", { className: "text-sm text-gray-600 mt-0.5", children: "Tickets returned for your clarification \u2014 newest first" })] }), _jsx(Link, { to: "/store-manager", children: _jsx(Button, { type: "button", variant: "secondary", children: "Back to dashboard" }) })] }), isLoading ? (_jsx("p", { className: "text-gray-500", children: "Loading\u2026" })) : sorted.length === 0 ? (_jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600", children: "No tickets requiring your action." })) : (_jsx("ul", { className: "space-y-2", children: sorted.map((ticket) => (_jsx("li", { children: _jsxs("button", { type: "button", className: "w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-amber-50/50 hover:border-amber-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1", onClick: () => setSelectedTicketId(ticket.id), children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-2", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Ticket #", ticket.id] }), _jsx(Badge, { variant: getStatusBadgeVariant(ticket.currentStatus), children: formatStatus(ticket.currentStatus) }), ticket.urgent && _jsx(Badge, { variant: "urgent", children: "URGENT" }), _jsx("span", { className: "text-sm text-gray-600", children: formatCategory(ticket.category) }), _jsx("span", { className: "text-sm text-gray-500", children: new Date(ticket.createdAt).toLocaleDateString() })] }), _jsx("p", { className: "text-sm text-gray-700 whitespace-pre-wrap line-clamp-2", children: descriptionPreview(ticket.originalDescription ?? ticket.description) })] }) }, ticket.id))) }))] }), selectedTicketId != null && (_jsx(TicketDetailModal, { ticketId: selectedTicketId, onClose: () => setSelectedTicketId(null) }))] }));
}
