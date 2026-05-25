import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Store Manager — QR Generation Required
 * List of tickets that need QR (work orders with technician assigned).
 * Each ticket preview shows: service company, WO number, S2 name. Generate QR opens modal.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workOrdersAPI } from '../../api/work-orders';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Card, Badge } from '../../components/shared';
import { QRGenerationModal } from './QRGenerationModal';
import { WorkOrderStatus } from '../../types/statuses';
/** Croatian plural: radni nalog / radna naloga / radnih naloga */
function formatRadnihNaloga(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11)
        return `${n} radni nalog`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
        return `${n} radna naloga`;
    return `${n} radnih naloga`;
}
export function SMQRRequiredPage() {
    const { session } = useSession();
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [qrMode, setQrMode] = useState(null);
    // Include both: WOs still with S2 (VENDOR) and WOs returned to SM for correct tech count (INTERNAL)
    const { data: qrWorkOrdersAccepted = [] } = useQuery({
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
    const { data: qrWorkOrdersInProgress = [] } = useQuery({
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
        ...qrWorkOrdersAccepted,
        ...qrWorkOrdersInProgress,
        ...qrWorkOrdersFollowUp,
    ];
    const qrTicketsMap = (() => {
        const map = new Map();
        for (const wo of qrWorkOrders) {
            const list = map.get(wo.ticketId) ?? [];
            list.push(wo);
            map.set(wo.ticketId, list);
        }
        return map;
    })();
    const qrTicketIds = Array.from(qrTicketsMap.keys());
    const workOrdersForModal = selectedTicketId != null && qrMode != null
        ? (qrTicketsMap.get(selectedTicketId) ?? []).filter((wo) => qrMode === 'checkin'
            ? wo.currentStatus === WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED ||
                wo.currentStatus === WorkOrderStatus.FOLLOW_UP_REQUESTED
            : wo.currentStatus === WorkOrderStatus.SERVICE_IN_PROGRESS)
        : [];
    return (_jsxs(Layout, { screenTitle: "Potrebno generiranje QR koda", children: [_jsxs("div", { className: "max-w-3xl mx-auto space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Potrebno generiranje QR koda" }), _jsx("p", { className: "text-sm text-gray-600 mt-0.5", children: "Radni nalozi s dodijeljenim tehni\u010Darima ili s potrebnim ponovnim posjetom \u2014 generirajte QR za prijavu dolaska ili odjavu s posla." })] }), _jsx(Link, { to: "/store-manager", children: _jsx(Button, { type: "button", variant: "secondary", children: "Natrag na nadzornu plo\u010Du" }) })] }), qrTicketIds.length === 0 ? (_jsx(Card, { className: "bg-gray-50 p-6 text-center text-gray-600", children: "Trenutno nema prijava koje zahtijevaju QR." })) : (_jsx("div", { className: "space-y-3", children: qrTicketIds.map((ticketId) => {
                            const wos = qrTicketsMap.get(ticketId);
                            return (_jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["Prijava #", ticketId] }), wos.some((wo) => wo.urgent) && (_jsx(Badge, { variant: "danger", children: "Hitno" })), _jsx("span", { className: "text-sm text-gray-500", children: formatRadnihNaloga(wos.length) })] }), _jsx("ul", { className: "space-y-1.5 text-sm text-gray-700", children: wos.map((wo) => (_jsxs("li", { className: "flex flex-wrap items-center gap-x-2 gap-y-0.5", children: [_jsx("span", { className: "font-medium text-gray-900", children: wo.vendorCompanyName }), _jsxs("span", { className: "text-gray-500", children: ["\u2014 WO #", wo.id] }), wo.assignedTechnicianName != null && wo.assignedTechnicianName !== '' && (_jsxs("span", { className: "text-gray-600", children: ["\u2014 ", wo.assignedTechnicianName, " (S2)"] }))] }, wo.id))) })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { type: "button", disabled: !wos.some((wo) => wo.currentStatus === WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED ||
                                                        wo.currentStatus === WorkOrderStatus.FOLLOW_UP_REQUESTED), onClick: () => {
                                                        setSelectedTicketId(ticketId);
                                                        setQrMode('checkin');
                                                    }, children: ["Prijava dolaska", wos.some((wo) => wo.currentStatus === WorkOrderStatus.FOLLOW_UP_REQUESTED)
                                                            ? ' (ponovni posjet)'
                                                            : ''] }), _jsx(Button, { type: "button", variant: "secondary", disabled: !wos.some((wo) => wo.currentStatus === WorkOrderStatus.SERVICE_IN_PROGRESS), onClick: () => {
                                                        setSelectedTicketId(ticketId);
                                                        setQrMode('checkout');
                                                    }, children: "Odjava s posla" })] })] }) }, ticketId));
                        }) }))] }), selectedTicketId != null && qrMode != null && workOrdersForModal.length > 0 && (_jsx(QRGenerationModal, { ticketId: selectedTicketId, workOrders: workOrdersForModal, onClose: () => {
                    setSelectedTicketId(null);
                    setQrMode(null);
                } }))] }));
}
