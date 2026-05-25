import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Area Manager Dashboard
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Card, Badge, Button, ApprovalChainInfo } from '../../components/shared';
import { AMTicketDetailModal } from './AMTicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import { formatCategory, formatStatus, getStatusBadgeVariant } from '../../utils/formatters';
import { APPROVAL_THRESHOLDS, formatEuro } from '../../config/approval-thresholds';
const TERMINAL_STATUSES = [
    TicketStatus.REJECTED,
    TicketStatus.WITHDRAWN,
    TicketStatus.ARCHIVED,
];
export function AreaManagerDashboard() {
    const { session } = useSession();
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [sectionFilter, setSectionFilter] = useState('active');
    const { data: tickets, isLoading } = useQuery({
        queryKey: ['tickets', 'am-tickets', session?.userId],
        queryFn: () => ticketsAPI.list({
            currentOwnerUserId: session.userId,
            urgent: false,
        }),
        enabled: session?.userId != null,
    });
    const { data: participatedTickets = [], isLoading: loadingParticipated } = useQuery({
        queryKey: ['tickets', 'am-participated', session?.regionId, session?.userId],
        queryFn: () => ticketsAPI.list({
            regionId: session.regionId,
            participatedByUserId: session.userId,
        }),
        enabled: session?.regionId != null && session?.userId != null,
    });
    const { data: regionTickets = [], isLoading: loadingRegion } = useQuery({
        queryKey: ['tickets', 'am-region', session?.regionId],
        queryFn: () => ticketsAPI.list({ regionId: session.regionId }),
        enabled: session?.regionId != null,
    });
    const closedTickets = regionTickets.filter((t) => TERMINAL_STATUSES.includes(t.currentStatus));
    const sectionTickets = sectionFilter === 'active'
        ? [...participatedTickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        : [...closedTickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const sectionLoading = sectionFilter === 'active' ? loadingParticipated : loadingRegion;
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Nadzorna plo\u010Da \u2014 Voditelj regije" }), _jsx("p", { className: "text-gray-600", children: session?.regionName ?? 'Regionalno odobrenje' })] }), _jsx(Link, { to: "/assets", className: "inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50", children: "\uD83C\uDFED Registar opreme" })] }), _jsx(ApprovalChainInfo, { roleDescription: `Odobravate procjene troška do ${formatEuro(APPROVAL_THRESHOLDS.AM_MAX)}.` }), isLoading ? (_jsx(Card, { children: _jsx("p", { className: "text-gray-600", children: "U\u010Ditavanje prijava..." }) })) : tickets != null && tickets.length > 0 ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-gray-600", children: [tickets.length, " prijava \u010Deka odobrenje"] }), tickets.map((ticket) => (_jsx(Card, { className: "hover:shadow-md transition cursor-pointer", onClick: () => setSelectedTicketId(ticket.id), children: _jsx("div", { className: "flex justify-between items-start", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900", children: ["Prijava #", ticket.id] }), _jsx(Badge, { variant: getStatusBadgeVariant(ticket.currentStatus), children: formatStatus(ticket.currentStatus) })] }), _jsx("p", { className: "text-gray-700 mb-2", children: ticket.originalDescription ?? ticket.description }), _jsxs("div", { className: "flex gap-4 text-sm text-gray-600 flex-wrap", children: [_jsxs("span", { children: ["Poslovnica: ", ticket.storeName] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Kategorija: ", formatCategory(ticket.category)] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Kreirao: ", ticket.createdByUserName] }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: new Date(ticket.createdAt).toLocaleDateString() })] })] }) }) }, ticket.id)))] })) : (_jsx(Card, { children: _jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "text-4xl mb-4", children: "\u2705" }), _jsx("p", { className: "text-gray-600 text-lg font-medium mb-2", children: "Sve odra\u0111eno!" }), _jsx("p", { className: "text-sm text-gray-500", children: "Nema prijava koje \u010Dekaju odobrenje." })] }) })), _jsxs(Card, { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Prijave" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: sectionFilter === 'active'
                                    ? 'Prijave u kojima ste sudjelovali.'
                                    : 'Zatvorene i arhivirane prijave.' }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsx(Button, { type: "button", variant: sectionFilter === 'active' ? 'primary' : 'secondary', size: "sm", onClick: () => setSectionFilter('active'), children: "Aktivne prijave" }), _jsx(Button, { type: "button", variant: sectionFilter === 'closed' ? 'primary' : 'secondary', size: "sm", onClick: () => setSectionFilter('closed'), children: "Zatvorene prijave" })] }), sectionLoading ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : sectionTickets.length === 0 ? (_jsx("p", { className: "text-gray-600", children: "Nema prijava za prikaz." })) : (_jsx("div", { className: "space-y-3", children: sectionTickets.map((ticket) => (_jsxs("div", { className: "p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition", onClick: () => setSelectedTicketId(ticket.id), children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-1", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Prijava #", ticket.id] }), _jsx(Badge, { variant: getStatusBadgeVariant(ticket.currentStatus), children: formatStatus(ticket.currentStatus) }), ticket.urgent && _jsx(Badge, { variant: "urgent", children: "URGENT" }), _jsx("span", { className: "text-sm text-gray-600", children: formatCategory(ticket.category) }), _jsxs("span", { className: "text-sm text-gray-500", children: ["Zadnja izmjena ", new Date(ticket.updatedAt).toLocaleDateString()] })] }), _jsx("p", { className: "text-sm text-gray-700 line-clamp-2", children: (() => {
                                                const text = ticket.originalDescription ?? ticket.description;
                                                return text.length > 100 ? `${text.slice(0, 100).trim()}...` : text;
                                            })() })] }, ticket.id))) }))] })] }), selectedTicketId != null && (_jsx(AMTicketDetailModal, { ticketId: selectedTicketId, onClose: () => setSelectedTicketId(null) }))] }));
}
