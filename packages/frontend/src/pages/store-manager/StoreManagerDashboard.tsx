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

function getStatusBadgeVariant(
  status: string
): 'default' | 'success' | 'warning' | 'danger' {
  if (status === 'Draft') return 'default';
  if (status.includes('Submitted') || status.includes('Awaiting')) return 'warning';
  if (status.includes('Approved')) return 'success';
  if (status.includes('Rejected') || status.includes('Withdrawn')) return 'danger';
  return 'default';
}

export function StoreManagerDashboard() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: myTickets, isLoading: loadingMyTickets } = useQuery({
    queryKey: ['tickets', 'store-manager', 'my-tickets', session?.storeId],
    queryFn: () =>
      ticketsAPI.list(
        session?.storeId != null ? { storeId: session.storeId } : undefined
      ),
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
    queryFn: () =>
      ticketsAPI.list({
        storeId: session!.storeId,
        currentOwnerUserId: session!.userId,
        status: TicketStatus.DRAFT,
      }),
    enabled:
      session?.storeId != null &&
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
    queryFn: () =>
      ticketsAPI.list({
        storeId: session!.storeId,
        currentOwnerUserId: session!.userId,
        status: TicketStatus.AWAITING_CREATOR_RESPONSE,
      }),
    enabled:
      session?.storeId != null &&
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
    queryFn: () =>
      workOrdersAPI.list({
        storeId: session!.storeId,
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
    queryFn: () =>
      workOrdersAPI.list({
        storeId: session!.storeId,
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
    queryFn: () =>
      workOrdersAPI.list({
        storeId: session!.storeId,
        currentStatus: 'FOLLOW_UP_REQUESTED',
      }),
    enabled: session?.storeId != null,
  });
  const qrWorkOrders = [
    ...(qrWorkOrdersAccepted ?? []),
    ...(qrWorkOrdersInProgress ?? []),
    ...qrWorkOrdersFollowUp,
  ];

  const actionRequiredCount = actionRequiredTickets?.length ?? 0;

  const qrTicketsMap = (() => {
    const map = new Map<number, typeof qrWorkOrders>();
    if (!qrWorkOrders) return map;
    for (const wo of qrWorkOrders) {
      const list = map.get(wo.ticketId) ?? [];
      list.push(wo);
      map.set(wo.ticketId, list);
    }
    return map;
  })();
  const qrTicketIds = Array.from(qrTicketsMap.keys());

  const [myTicketsFilter, setMyTicketsFilter] = useState<'active' | 'closed'>('active');
  const terminalStatuses = [
    'Ticket Withdrawn',
    'Ticket Rejected',
    'Ticket Archived',
  ];
  const isActionRequired = (t: { currentOwnerUserId: number | null; currentStatus: string }) =>
    t.currentOwnerUserId === session?.userId &&
    t.currentStatus === TicketStatus.AWAITING_CREATOR_RESPONSE;

  const { data: participatedTickets = [], isLoading: loadingParticipated } = useQuery({
    queryKey: ['tickets', 'store-manager', 'participated', session?.storeId, session?.userId],
    queryFn: () =>
      ticketsAPI.list({
        storeId: session!.storeId,
        participatedByUserId: session!.userId,
      }),
    enabled: session?.storeId != null && session?.userId != null,
  });

  const closedTickets = (myTickets ?? []).filter((t) => terminalStatuses.includes(t.currentStatus));
  const myTicketsFiltered =
    myTicketsFilter === 'active'
      ? participatedTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      : closedTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nadzorna ploča — Voditelj poslovnice
          </h1>
          <p className="text-gray-600">
            {session?.storeName ?? 'Poslovnica'}
          </p>
        </div>

        {/* Section 1 — Create Ticket */}
        <Card className="bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Nova prijava kvara
              </h2>
              <p className="text-sm text-gray-600">
                Prijavite novi kvar ili zahtjev za održavanje.
              </p>
            </div>
            <Link to="/store-manager/submit">
              <Button type="button">Nova prijava</Button>
            </Link>
          </div>
        </Card>

        {/* Section 2 — Ticket Drafts */}
        <Card className="bg-gray-50 border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Nacrti prijava
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Prijave koje ste spremili kao nacrt.
          </p>
          {draftTickets.length === 0 ? (
            <p className="text-sm text-gray-500">Nema nacrta.</p>
          ) : (
            <ul className="space-y-2">
              {draftTickets
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">
                          Ticket #{ticket.id}
                        </span>
                        <Badge variant="default">Nacrt</Badge>
                        {ticket.urgent && (
                          <Badge variant="urgent">URGENT</Badge>
                        )}
                        <span className="text-sm text-gray-500">
                          {new Date(ticket.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      {ticket.description?.trim() && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {ticket.description.trim()}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        {/* Section 3 — Action Required */}
        {actionRequiredCount > 0 ? (
          <Link to="/store-manager/action-required">
            <Card className="bg-amber-50 border-amber-200 cursor-pointer hover:shadow-md transition block">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Potrebna akcija
                  </h2>
                  <p className="text-sm text-gray-600">
                    Prijave vraćene na pojašnjenje.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="warning">{actionRequiredCount}</Badge>
                  <span className="text-sm text-gray-500">Click to open list</span>
                </div>
              </div>
            </Card>
          </Link>
        ) : (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Potrebna akcija
                </h2>
                <p className="text-sm text-gray-600">
                  Prijave vraćene na pojašnjenje.
                </p>
              </div>
              <Badge variant="warning">0</Badge>
            </div>
          </Card>
        )}

        {/* Section 4 — QR Generation Required */}
        <Card className="bg-emerald-50 border-emerald-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Potrebno generiranje QR koda
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Radni nalozi koji zahtijevaju QR kod za prijavu/odjavu tehničara.
          </p>
          {qrTicketIds.length === 0 ? (
            <p className="text-sm text-gray-500">Nema prijava koje zahtijevaju QR kod.</p>
          ) : (
            <Link to="/store-manager/qr-required">
              <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50/50 cursor-pointer transition">
                <span className="font-medium text-gray-900">
                  {qrTicketIds.length} ticket{qrTicketIds.length !== 1 ? 's' : ''} requiring QR
                </span>
                <span className="text-sm text-emerald-700">Click to open list →</span>
              </div>
            </Link>
          )}
        </Card>

        {/* Section 5 — My Tickets */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Moje prijave
            </h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={myTicketsFilter === 'active' ? 'primary' : 'secondary'}
                onClick={() => setMyTicketsFilter('active')}
              >
                Aktivne prijave
              </Button>
              <Button
                type="button"
                variant={myTicketsFilter === 'closed' ? 'primary' : 'secondary'}
                onClick={() => setMyTicketsFilter('closed')}
              >
                Zatvorene prijave
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {myTicketsFilter === 'active'
              ? 'Prijave u kojima ste sudjelovali.'
              : 'Zatvorene i arhivirane prijave.'}
          </p>
          {(myTicketsFilter === 'closed' && loadingMyTickets) || (myTicketsFilter === 'active' && loadingParticipated) ? (
            <p className="text-gray-600">Loading...</p>
          ) : myTicketsFiltered.length === 0 ? (
            <p className="text-gray-500">Nema prijava za prikaz.</p>
          ) : (
            <div className="space-y-3">
              {myTicketsFiltered.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      Ticket #{ticket.id}
                    </span>
                    <Badge variant={getStatusBadgeVariant(ticket.currentStatus)}>
                      {ticket.currentStatus}
                    </Badge>
                    {ticket.urgent && (
                      <Badge variant="urgent">URGENT</Badge>
                    )}
                    <span className="text-sm text-gray-600">
                      {ticket.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      Zadnja izmjena{' '}
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {(() => {
                      const text = ticket.originalDescription ?? ticket.description;
                      return text.length > 100 ? `${text.slice(0, 100).trim()}...` : text;
                    })()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {selectedTicketId != null && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </Layout>
  );
}
