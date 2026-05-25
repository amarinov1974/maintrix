import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Store Manager Dashboard
 * Sections: 1 Create Ticket, 2 Ticket Drafts, 3 Action Required, 4 QR Generation Required, 5 My Tickets
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { workOrdersAPI } from '../../api/work-orders';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Card, Badge } from '../../components/shared';
import { TicketDetailModal } from './TicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import { formatCategory, formatStatus, getStatusBadgeVariant } from '../../utils/formatters';
import { TerminalTicketStatuses } from '../../types/statuses';
function BucketCard({ title, count, description, accentColor, to, }) {
    const inner = (_jsxs("div", { style: {
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid #E8E8ED',
            borderLeft: `4px solid ${accentColor}`,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'box-shadow 0.2s ease',
            cursor: to && count > 0 ? 'pointer' : 'default',
            opacity: count === 0 ? 0.6 : 1,
        }, onMouseEnter: e => {
            if (to && count > 0)
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        }, onMouseLeave: e => {
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
        }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: '13px', color: '#6E6E73', marginBottom: '2px', fontWeight: 500 }, children: title }), description && (_jsx("p", { style: { fontSize: '11px', color: '#AEAEB2', marginTop: '2px' }, children: description }))] }), _jsx("span", { style: {
                    fontSize: '28px',
                    fontWeight: '600',
                    color: count > 0 ? accentColor : '#AEAEB2',
                    lineHeight: 1,
                    minWidth: '32px',
                    textAlign: 'right',
                }, children: count })] }));
    if (to && count > 0) {
        return _jsx(Link, { to: to, style: { textDecoration: 'none', display: 'block' }, children: inner });
    }
    return inner;
}
export function StoreManagerDashboard() {
    const { session } = useSession();
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const { data: myTickets, isLoading: loadingMyTickets } = useQuery({
        queryKey: ['tickets', 'store-manager', 'my-tickets', session?.storeId],
        queryFn: () => ticketsAPI.list(session?.storeId != null ? { storeId: session.storeId } : undefined),
        enabled: session?.storeId != null,
    });
    const { data: draftTickets = [] } = useQuery({
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
        enabled: session?.storeId != null &&
            session?.userId != null,
    });
    const { data: actionRequiredTickets } = useQuery({
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
        refetchOnWindowFocus: true, // so tickets returned for clarification (any round) show up promptly
    });
    // Include WOs with vendor (S2) and WOs returned to SM for correct tech count
    const { data: qrWorkOrdersAccepted } = useQuery({
        queryKey: [
            'work-orders',
            'store-manager',
            'qr-accepted',
            session?.storeId,
        ],
        queryFn: () => workOrdersAPI.list({
            storeId: session.storeId,
            currentStatus: 'ACCEPTED_TECHNICIAN_ASSIGNED',
        }),
        enabled: session?.storeId != null,
    });
    const { data: qrWorkOrdersInProgress } = useQuery({
        queryKey: [
            'work-orders',
            'store-manager',
            'qr-in-progress',
            session?.storeId,
        ],
        queryFn: () => workOrdersAPI.list({
            storeId: session.storeId,
            currentStatus: 'SERVICE_IN_PROGRESS',
        }),
        enabled: session?.storeId != null,
    });
    const { data: qrWorkOrdersFollowUp = [] } = useQuery({
        queryKey: [
            'work-orders',
            'store-manager',
            'qr-follow-up',
            session?.storeId,
        ],
        queryFn: () => workOrdersAPI.list({
            storeId: session.storeId,
            currentStatus: 'FOLLOW_UP_REQUESTED',
        }),
        enabled: session?.storeId != null,
    });
    const qrWorkOrders = [
        ...(qrWorkOrdersAccepted ?? []),
        ...(qrWorkOrdersInProgress ?? []),
        ...qrWorkOrdersFollowUp,
    ];
    const clarificationTickets = actionRequiredTickets ?? [];
    const qrTicketsMap = (() => {
        const map = new Map();
        if (!qrWorkOrders)
            return map;
        for (const wo of qrWorkOrders) {
            const list = map.get(wo.ticketId) ?? [];
            list.push(wo);
            map.set(wo.ticketId, list);
        }
        return map;
    })();
    const qrTicketIds = Array.from(qrTicketsMap.keys());
    const qrRequiredTickets = qrTicketIds;
    const [myTicketsFilter, setMyTicketsFilter] = useState('active');
    const terminalStatuses = TerminalTicketStatuses;
    const { data: participatedTickets = [], isLoading: loadingParticipated } = useQuery({
        queryKey: ['tickets', 'store-manager', 'participated', session?.storeId, session?.userId],
        queryFn: () => ticketsAPI.list({
            storeId: session.storeId,
            participatedByUserId: session.userId,
        }),
        enabled: session?.storeId != null && session?.userId != null,
    });
    const closedTickets = (myTickets ?? []).filter((t) => terminalStatuses.includes(t.currentStatus));
    const myTicketsFiltered = myTicketsFilter === 'active'
        ? participatedTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        : closedTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Nadzorna plo\u010Da \u2014 Voditelj poslovnice" }), _jsx("p", { className: "text-gray-600", children: session?.storeName ?? 'Poslovnica' })] }), _jsxs("div", { style: {
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            border: '1px solid #E8E8ED',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }, children: "Nova prijava" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginTop: '2px' }, children: "Prijavite novi kvar ili zahtjev za odr\u017Eavanje." })] }), _jsx(Link, { to: "/store-manager/submit", children: _jsx(Button, { type: "button", children: "Nova prijava" }) })] }), _jsx(BucketCard, { title: "Nacrti prijava", count: draftTickets.length, accentColor: "#6E6E73", to: "/store-manager/drafts" }), _jsx(BucketCard, { title: "Potrebna akcija", count: clarificationTickets.length, accentColor: "#FF3B30", to: "/store-manager/action-required" }), _jsx(BucketCard, { title: "Potrebno generiranje QR koda", count: qrRequiredTickets.length, accentColor: "#FF9500", to: "/store-manager/qr-required" }), _jsxs(Card, { children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4 mb-4", children: [_jsx("h2", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '8px' }, children: "Moje prijave" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: myTicketsFilter === 'active' ? 'primary' : 'secondary', onClick: () => setMyTicketsFilter('active'), children: "Aktivne prijave" }), _jsx(Button, { type: "button", variant: myTicketsFilter === 'closed' ? 'primary' : 'secondary', onClick: () => setMyTicketsFilter('closed'), children: "Zatvorene prijave" })] })] }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: myTicketsFilter === 'active'
                                    ? 'Prijave u kojima ste sudjelovali.'
                                    : 'Zatvorene i arhivirane prijave.' }), (myTicketsFilter === 'closed' && loadingMyTickets) || (myTicketsFilter === 'active' && loadingParticipated) ? (_jsx("p", { className: "text-gray-600", children: "Loading..." })) : myTicketsFiltered.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "Nema prijava za prikaz." })) : (_jsx("div", { className: "space-y-3", children: myTicketsFiltered.map((ticket) => (_jsxs("div", { className: "p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition", onClick: () => setSelectedTicketId(ticket.id), children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-1", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Prijava #", ticket.id] }), _jsx(Badge, { variant: getStatusBadgeVariant(ticket.currentStatus), children: formatStatus(ticket.currentStatus) }), ticket.urgent && (_jsx(Badge, { variant: "urgent", children: "URGENT" })), _jsx("span", { className: "text-sm text-gray-600", children: formatCategory(ticket.category) }), _jsxs("span", { className: "text-sm text-gray-500", children: ["Zadnja izmjena", ' ', new Date(ticket.updatedAt).toLocaleDateString()] })] }), _jsx("p", { className: "text-sm text-gray-700 line-clamp-2", children: (() => {
                                                const text = ticket.originalDescription ?? ticket.description;
                                                return text.length > 100 ? `${text.slice(0, 100).trim()}...` : text;
                                            })() })] }, ticket.id))) }))] })] }), selectedTicketId != null && (_jsx(TicketDetailModal, { ticketId: selectedTicketId, onClose: () => setSelectedTicketId(null) }))] }));
}
