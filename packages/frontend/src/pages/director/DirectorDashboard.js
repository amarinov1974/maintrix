import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * Director Dashboard
 * Used by D (Sales Director), C2 (Maintenance Director), and BOD (Board of Directors)
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Card, Badge, Button, ApprovalChainInfo } from '../../components/shared';
import { DirectorTicketDetailModal } from './DirectorTicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import { formatCategory, formatStatus, getInFlightStatusBadgeVariant } from '../../utils/formatters';
import { APPROVAL_THRESHOLDS, formatEuro } from '../../config/approval-thresholds';
function getRoleLabel(role) {
    if (role === 'D')
        return 'Direktor prodaje';
    if (role === 'C2')
        return 'Direktor održavanja';
    if (role === 'BOD')
        return 'Upravni odbor';
    return role;
}
function getRoleDescription(role) {
    const directorRange = `od ${formatEuro(APPROVAL_THRESHOLDS.AM_MAX + 1)} do ${formatEuro(APPROVAL_THRESHOLDS.DIRECTOR_MAX)}`;
    if (role === 'D')
        return `Odobravate procjene troška ${directorRange}.`;
    if (role === 'C2')
        return `Odobravate procjene troška ${directorRange}.`;
    if (role === 'BOD')
        return `Odobravate procjene troška iznad ${formatEuro(APPROVAL_THRESHOLDS.DIRECTOR_MAX)}.`;
    return 'Odobravate procjene troška.';
}
export function DirectorDashboard() {
    const { session } = useSession();
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [ticketReadOnlyFilter, setTicketReadOnlyFilter] = useState('active');
    const { data: tickets, isLoading } = useQuery({
        queryKey: ['tickets', 'director-tickets', session?.userId],
        queryFn: () => ticketsAPI.list({
            currentOwnerUserId: session.userId,
        }),
        enabled: session?.userId != null,
    });
    const { data: participatedTickets = [], isLoading: loadingParticipated } = useQuery({
        queryKey: ['tickets', 'director-participated', session?.userId],
        queryFn: () => ticketsAPI.list({
            participatedByUserId: session.userId,
        }),
        enabled: session?.userId != null,
    });
    const terminalStatuses = [
        TicketStatus.REJECTED,
        TicketStatus.WITHDRAWN,
        TicketStatus.ARCHIVED,
    ];
    const sortByUpdatedAt = (items) => [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const myActiveTickets = sortByUpdatedAt(participatedTickets.filter((t) => !terminalStatuses.includes(t.currentStatus)));
    const myClosedTickets = sortByUpdatedAt(participatedTickets.filter((t) => terminalStatuses.includes(t.currentStatus)));
    const readOnlyTicketsFiltered = ticketReadOnlyFilter === 'active' ? myActiveTickets : myClosedTickets;
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-900", children: [getRoleLabel(session?.role ?? ''), " Dashboard"] }), _jsx("p", { className: "text-gray-600", children: "Odobrenje procjena tro\u0161ka" })] }), _jsx(Link, { to: "/assets", className: "inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50", children: "\uD83C\uDFED Registar opreme" })] }), _jsx(ApprovalChainInfo, { roleDescription: getRoleDescription(session?.role ?? '') }), isLoading ? (_jsx(Card, { children: _jsx("p", { className: "text-gray-600", children: "U\u010Ditavanje prijava..." }) })) : tickets != null && tickets.length > 0 ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-gray-600", children: [tickets.length, " prijava \u010Deka Va\u0161e odobrenje"] }), tickets.map((ticket) => (_jsx(Card, { className: "hover:shadow-md transition cursor-pointer", onClick: () => setSelectedTicketId(ticket.id), children: _jsx("div", { className: "flex justify-between items-start", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900", children: ["Prijava #", ticket.id] }), _jsx(Badge, { variant: "warning", children: "\u010Ceka odobrenje" })] }), _jsx("p", { className: "text-gray-700 mb-2", children: ticket.originalDescription ?? ticket.description }), _jsxs("div", { className: "flex gap-4 text-sm text-gray-600 flex-wrap", children: [_jsxs("span", { children: ["Poslovnica: ", ticket.storeName] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Kategorija: ", formatCategory(ticket.category)] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Kreirao: ", ticket.createdByUserName] })] })] }) }) }, ticket.id)))] })) : (_jsx(Card, { children: _jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "text-4xl mb-4", children: "\u2705" }), _jsx("p", { className: "text-gray-600 text-lg font-medium mb-2", children: "Sve odra\u0111eno!" }), _jsx("p", { className: "text-sm text-gray-500", children: "Nema procjena tro\u0161ka koje \u010Dekaju Va\u0161e odobrenje." })] }) })), _jsxs(Card, { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Moje prijave" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Prijave u kojima ste sudjelovali (npr. u lancu odobrenja). Samo pregled." }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsxs(Button, { type: "button", variant: ticketReadOnlyFilter === 'active' ? 'primary' : 'secondary', size: "sm", onClick: () => setTicketReadOnlyFilter('active'), children: ["Aktivne prijave (", myActiveTickets.length, ")"] }), _jsxs(Button, { type: "button", variant: ticketReadOnlyFilter === 'closed' ? 'primary' : 'secondary', size: "sm", onClick: () => setTicketReadOnlyFilter('closed'), children: ["Zatvorene prijave (", myClosedTickets.length, ")"] })] }), loadingParticipated ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : readOnlyTicketsFiltered.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "Nema prijava u ovoj grupi." })) : (_jsx("div", { className: "space-y-2", children: readOnlyTicketsFiltered.map((t) => (_jsx(TicketRow, { ticket: t, onClick: () => setSelectedTicketId(t.id) }, t.id))) }))] })] }), selectedTicketId != null && (_jsx(DirectorTicketDetailModal, { ticketId: selectedTicketId, onClose: () => setSelectedTicketId(null) }))] }));
}
function TicketRow({ ticket, onClick }) {
    return (_jsxs("button", { type: "button", className: "w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition flex flex-wrap items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }, children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Prijava #", ticket.id] }), ticket.urgent && _jsx(Badge, { variant: "urgent", children: "URGENT" }), _jsx(Badge, { variant: getInFlightStatusBadgeVariant(ticket.currentStatus), children: formatStatus(ticket.currentStatus) }), _jsx("span", { className: "text-sm text-gray-600", children: ticket.storeName }), _jsx("span", { className: "text-sm text-gray-500", children: new Date(ticket.createdAt).toLocaleDateString() })] }));
}
