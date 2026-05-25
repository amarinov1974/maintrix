import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AMM Dashboard — Section 10
 * Action-group based: Create Ticket, Ticket action groups, WO action groups, Read-only.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { workOrdersAPI } from '../../api/work-orders';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Card, Badge } from '../../components/shared';
import { AMMTicketDetailModal } from './AMMTicketDetailModal';
import { AMMWorkOrderDetailModal } from './AMMWorkOrderDetailModal';
import { TicketStatus, WorkOrderStatus, TerminalWorkOrderStatuses } from '../../types/statuses';
import { formatStatus, getInFlightStatusBadgeVariant } from '../../utils/formatters';
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
export function AMMDashboard() {
    const { session } = useSession();
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);
    const [ticketReadOnlyFilter, setTicketReadOnlyFilter] = useState('active');
    const [woReadOnlyFilter, setWoReadOnlyFilter] = useState('active');
    const { data: ownedTickets = [], isLoading: _loadingTickets } = useQuery({
        queryKey: ['tickets', 'amm-owned', session?.userId],
        queryFn: () => ticketsAPI.list({ currentOwnerUserId: session.userId }),
        enabled: session?.userId != null,
    });
    const { data: ownedWorkOrders = [], isLoading: _loadingWOs } = useQuery({
        queryKey: ['work-orders', 'amm-owned', session?.userId],
        queryFn: () => workOrdersAPI.list({
            currentOwnerId: session.userId,
            currentOwnerType: 'INTERNAL',
        }),
        enabled: session?.userId != null,
    });
    // Urgent tickets: submitted, updated (after clarification), or back from SM in Cost Estimation Needed — all show in Urgent Tickets, not in Cost Estimation
    const openUrgentTickets = ownedTickets.filter((t) => t.urgent &&
        (t.currentStatus === TicketStatus.SUBMITTED ||
            t.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
            t.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED));
    const costEstimationNeededTickets = ownedTickets.filter((t) => t.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED && !t.urgent);
    const approvedCostTickets = ownedTickets.filter((t) => t.currentStatus === TicketStatus.COST_ESTIMATION_APPROVED);
    const workInProgressTickets = ownedTickets.filter((t) => t.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS);
    // WOs returned or rejected by S1 to AMM: owner is AMM (INTERNAL), status Awaiting Service Provider or Rejected
    const returnedWorkOrders = ownedWorkOrders.filter((wo) => wo.currentStatus === WorkOrderStatus.CREATED ||
        wo.currentStatus === WorkOrderStatus.REJECTED);
    const costProposalPreparedWOs = ownedWorkOrders.filter((wo) => wo.currentStatus === WorkOrderStatus.COST_PROPOSAL_PREPARED);
    const followUpExceptionWOs = ownedWorkOrders.filter((wo) => [
        WorkOrderStatus.FOLLOW_UP_REQUESTED,
        WorkOrderStatus.REPAIR_UNSUCCESSFUL,
        WorkOrderStatus.NEW_WO_NEEDED,
    ].includes(wo.currentStatus));
    const { data: regionTickets = [], isLoading: loadingRegionTickets } = useQuery({
        queryKey: ['tickets', 'amm-region', session?.regionId],
        queryFn: () => ticketsAPI.list({ regionId: session.regionId }),
        enabled: session?.regionId != null,
    });
    const { data: participatedTickets = [], isLoading: loadingParticipatedTickets } = useQuery({
        queryKey: ['tickets', 'amm-participated', session?.regionId, session?.userId],
        queryFn: () => ticketsAPI.list({
            regionId: session.regionId,
            participatedByUserId: session.userId,
        }),
        enabled: session?.regionId != null && session?.userId != null,
    });
    const terminalStatuses = [
        TicketStatus.REJECTED,
        TicketStatus.WITHDRAWN,
        TicketStatus.ARCHIVED,
    ];
    const closedTickets = regionTickets.filter((t) => terminalStatuses.includes(t.currentStatus));
    const sortByUpdatedAt = (items) => [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const myActiveTickets = sortByUpdatedAt(participatedTickets);
    const myClosedTickets = sortByUpdatedAt(closedTickets);
    const readOnlyTicketsFiltered = ticketReadOnlyFilter === 'active' ? myActiveTickets : myClosedTickets;
    const { data: regionWOs = [], isLoading: loadingRegionWOs } = useQuery({
        queryKey: ['work-orders', 'amm-region', session?.regionId],
        queryFn: () => workOrdersAPI.list({ regionId: session.regionId }),
        enabled: session?.regionId != null,
    });
    const { data: workOrdersWithVendor = [] } = useQuery({
        queryKey: ['work-orders', 'amm-region-vendor', session?.regionId],
        queryFn: () => workOrdersAPI.list({
            regionId: session.regionId,
            currentOwnerType: 'VENDOR',
        }),
        enabled: session?.regionId != null,
    });
    const sortNewestFirst = (items) => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const myActiveWOs = regionWOs.filter((wo) => !TerminalWorkOrderStatuses.includes(wo.currentStatus));
    const myClosedWOs = regionWOs.filter((wo) => TerminalWorkOrderStatuses.includes(wo.currentStatus));
    const readOnlyWOsFiltered = woReadOnlyFilter === 'active'
        ? sortNewestFirst(myActiveWOs)
        : sortNewestFirst(myClosedWOs);
    return (_jsxs(Layout, { screenTitle: "Nadzorna plo\u010Da", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Voditelj odr\u017Eavanja" }), _jsx("p", { className: "text-gray-600", children: session?.regionName ?? 'Nadzorna ploča' })] }), _jsx(Link, { to: "/assets", className: "inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50", children: "\uD83C\uDFED Registar opreme" })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h2", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '8px' }, children: "Prijave" }), _jsxs("div", { style: {
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                    border: '1px solid #E8E8ED',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }, children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }, children: "Nova prijava" }), _jsx("p", { style: { fontSize: '12px', color: '#6E6E73', marginTop: '2px' }, children: "Kreirajte prijavu za bilo koju poslovnicu u regiji." })] }), _jsx(Link, { to: "/amm/submit", children: _jsx(Button, { type: "button", children: "Nova prijava" }) })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(BucketCard, { title: "Hitne prijave", count: openUrgentTickets.length, accentColor: "#FF3B30", to: "/amm/urgent-tickets" }), _jsx(BucketCard, { title: "Prijave \u2014 \u010Deka procjena tro\u0161ka", count: costEstimationNeededTickets.length, accentColor: "#FF9500", to: "/amm/cost-estimation-tickets" }), _jsx(BucketCard, { title: "Prijave s odobrenom procjenom", count: approvedCostTickets.length, accentColor: "#34C759", to: "/amm/approved-cost-tickets" }), _jsx(BucketCard, { title: "Prijave \u2014 rad u tijeku", count: workInProgressTickets.length, accentColor: "#0071E3", to: "/amm/work-in-progress-tickets" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h2", { style: { fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '8px' }, children: "Radni nalozi" }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(BucketCard, { title: "Vra\u0107eni radni nalozi", count: returnedWorkOrders.length, accentColor: "#FF3B30", to: "/amm/returned-work-orders" }), _jsx(BucketCard, { title: "Radni nalozi kod izvo\u0111a\u010Da", count: workOrdersWithVendor.length, accentColor: "#0071E3", to: "/amm/work-orders-with-vendor" }), _jsx(BucketCard, { title: "Radni nalozi \u2014 odobrenje ponude", count: costProposalPreparedWOs.length, accentColor: "#FF9500", to: "/amm/cost-proposal-work-orders" }), _jsx(BucketCard, { title: "Radni nalozi \u2014 iznimke", count: followUpExceptionWOs.length, accentColor: "#FF3B30", to: "/amm/follow-up-work-orders" })] })] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Moje prijave" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Prijave u regiji u kojima ste sudjelovali." }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsxs(Button, { type: "button", variant: ticketReadOnlyFilter === 'active' ? 'primary' : 'secondary', size: "sm", onClick: () => setTicketReadOnlyFilter('active'), children: ["Aktivne prijave (", myActiveTickets.length, ")"] }), _jsxs(Button, { type: "button", variant: ticketReadOnlyFilter === 'closed' ? 'primary' : 'secondary', size: "sm", onClick: () => setTicketReadOnlyFilter('closed'), children: ["Zatvorene prijave (", myClosedTickets.length, ")"] })] }), (ticketReadOnlyFilter === 'active' && loadingParticipatedTickets) ||
                                (ticketReadOnlyFilter === 'closed' && loadingRegionTickets) ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : readOnlyTicketsFiltered.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "Nema prijava u ovoj grupi." })) : (_jsx("div", { className: "space-y-2", children: readOnlyTicketsFiltered.map((t) => (_jsx(TicketRow, { ticket: t, onClick: () => setSelectedTicketId(t.id) }, t.id))) }))] }), _jsxs(Card, { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Moji radni nalozi" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Radni nalozi u regiji \u2014 aktivni ili zatvoreni." }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsxs(Button, { type: "button", variant: woReadOnlyFilter === 'active' ? 'primary' : 'secondary', size: "sm", onClick: () => setWoReadOnlyFilter('active'), children: ["Aktivni radni nalozi (", myActiveWOs.length, ")"] }), _jsxs(Button, { type: "button", variant: woReadOnlyFilter === 'closed' ? 'primary' : 'secondary', size: "sm", onClick: () => setWoReadOnlyFilter('closed'), children: ["Zatvoreni radni nalozi (", myClosedWOs.length, ")"] })] }), loadingRegionWOs ? (_jsx("p", { className: "text-gray-500", children: "U\u010Ditavanje..." })) : readOnlyWOsFiltered.length === 0 ? (_jsx("p", { className: "text-gray-500", children: "Nema radnih naloga u ovoj grupi." })) : (_jsx("div", { className: "space-y-2", children: readOnlyWOsFiltered.map((wo) => (_jsx(WorkOrderRow, { workOrder: wo, onSelect: () => setSelectedWorkOrderId(wo.id) }, wo.id))) }))] })] }), selectedTicketId != null && (_jsx(AMMTicketDetailModal, { ticketId: selectedTicketId, onClose: () => setSelectedTicketId(null) })), selectedWorkOrderId != null && (_jsx(AMMWorkOrderDetailModal, { workOrderId: selectedWorkOrderId, onClose: () => setSelectedWorkOrderId(null) }))] }));
}
function TicketRow({ ticket, onClick }) {
    return (_jsxs("button", { type: "button", className: "w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition flex flex-wrap items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }, children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Prijava #", ticket.id] }), ticket.urgent && _jsx(Badge, { variant: "urgent", children: "URGENT" }), _jsx(Badge, { variant: getInFlightStatusBadgeVariant(ticket.currentStatus), children: formatStatus(ticket.currentStatus) }), _jsx("span", { className: "text-sm text-gray-600", children: ticket.storeName }), _jsx("span", { className: "text-sm text-gray-500", children: new Date(ticket.createdAt).toLocaleDateString() })] }));
}
function WorkOrderRow({ workOrder, onSelect }) {
    return (_jsxs("button", { type: "button", className: "w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition flex flex-wrap items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect();
        }, children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Work Order #", workOrder.id] }), _jsxs("span", { className: "text-sm text-gray-600", children: ["Prijava #", workOrder.ticketId] }), _jsx(Badge, { variant: getInFlightStatusBadgeVariant(workOrder.currentStatus), children: formatStatus(workOrder.currentStatus) }), _jsx("span", { className: "text-sm text-gray-600", children: workOrder.vendorCompanyName }), _jsx("span", { className: "text-sm text-gray-500", children: new Date(workOrder.updatedAt).toLocaleDateString() })] }));
}
