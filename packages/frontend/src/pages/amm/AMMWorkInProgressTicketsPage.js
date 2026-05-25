import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AMM Tickets — Work in Progress
 * Tickets with work order(s) sent; AMM can create extra work orders or archive when all done.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Badge } from '../../components/shared';
import { AMMTicketDetailModal } from './AMMTicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import { formatStatus } from '../../utils/formatters';
const DESCRIPTION_PREVIEW_LENGTH = 120;
function descriptionPreview(description) {
    const trimmed = description.trim();
    if (trimmed.length <= DESCRIPTION_PREVIEW_LENGTH)
        return trimmed;
    return trimmed.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim() + '…';
}
export function AMMWorkInProgressTicketsPage() {
    const { session } = useSession();
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const { data: ownedTickets = [], isLoading } = useQuery({
        queryKey: ['tickets', 'amm-owned', session?.userId],
        queryFn: () => ticketsAPI.list({ currentOwnerUserId: session.userId }),
        enabled: session?.userId != null,
    });
    const workInProgressTickets = ownedTickets
        .filter((t) => t.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return (_jsxs(Layout, { screenTitle: "Prijave \u2014 rad u tijeku", children: [_jsxs("div", { className: "max-w-4xl mx-auto space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Prijave \u2014 rad u tijeku" }), _jsx("p", { className: "text-sm text-gray-600 mt-0.5", children: "Work order(s) sent \u2014 create extra work orders or archive when all done \u2014 newest first" })] }), _jsx(Link, { to: "/amm", children: _jsx(Button, { type: "button", variant: "secondary", children: "Natrag na nadzornu plo\u010Du" }) })] }), isLoading ? (_jsx("p", { className: "text-gray-500", children: "Loading\u2026" })) : workInProgressTickets.length === 0 ? (_jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600", children: "Nema prijava u tijeku rada." })) : (_jsx("ul", { className: "space-y-2", children: workInProgressTickets.map((ticket) => (_jsx("li", { children: _jsxs("button", { type: "button", className: "w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-teal-50/50 hover:border-teal-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1", onClick: () => setSelectedTicketId(ticket.id), children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-2", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Ticket #", ticket.id] }), ticket.urgent && _jsx(Badge, { variant: "urgent", children: "URGENT" }), _jsx(Badge, { variant: "default", children: formatStatus(ticket.currentStatus) }), _jsx("span", { className: "text-sm text-gray-600", children: ticket.storeName }), _jsx("span", { className: "text-sm text-gray-500", children: new Date(ticket.updatedAt).toLocaleDateString() })] }), _jsx("p", { className: "text-sm text-gray-700 whitespace-pre-wrap line-clamp-2", children: descriptionPreview(ticket.originalDescription ?? ticket.description) })] }) }, ticket.id))) }))] }), selectedTicketId != null && (_jsx(AMMTicketDetailModal, { ticketId: selectedTicketId, onClose: () => setSelectedTicketId(null) }))] }));
}
