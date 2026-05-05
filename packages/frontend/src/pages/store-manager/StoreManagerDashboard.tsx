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

function BucketCard({
  title,
  count,
  description,
  accentColor,
  to,
}: {
  title: string;
  count: number;
  description?: string;
  accentColor: string;
  to?: string;
}) {
  const inner = (
    <div
      style={{
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
      }}
      onMouseEnter={e => {
        if (to && count > 0)
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
      }}
    >
      <div>
        <p style={{ fontSize: '13px', color: '#6E6E73', marginBottom: '2px', fontWeight: 500 }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: '11px', color: '#AEAEB2', marginTop: '2px' }}>{description}</p>
        )}
      </div>
      <span style={{
        fontSize: '28px',
        fontWeight: '600',
        color: count > 0 ? accentColor : '#AEAEB2',
        lineHeight: 1,
        minWidth: '32px',
        textAlign: 'right',
      }}>
        {count}
      </span>
    </div>
  );

  if (to && count > 0) {
    return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  }
  return inner;
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

  const clarificationTickets = actionRequiredTickets ?? [];

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
  const qrRequiredTickets = qrTicketIds;

  const [myTicketsFilter, setMyTicketsFilter] = useState<'active' | 'closed'>('active');
  const terminalStatuses = TerminalTicketStatuses;

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
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid #E8E8ED',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>Nova prijava</p>
            <p style={{ fontSize: '12px', color: '#6E6E73', marginTop: '2px' }}>Prijavite novi kvar ili zahtjev za održavanje.</p>
          </div>
          <Link to="/store-manager/submit">
            <Button type="button">Nova prijava</Button>
          </Link>
        </div>

        {/* Section 2 — Ticket Drafts */}
        <BucketCard
          title="Nacrti prijava"
          count={draftTickets.length}
          accentColor="#6E6E73"
        />

        {/* Section 3 — Action Required */}
        <BucketCard
          title="Potrebna akcija"
          count={clarificationTickets.length}
          accentColor="#FF3B30"
          to="/store-manager/action-required"
        />

        {/* Section 4 — QR Generation Required */}
        <BucketCard
          title="Potrebno generiranje QR koda"
          count={qrRequiredTickets.length}
          accentColor="#FF9500"
          to="/store-manager/qr-required"
        />

        {/* Section 5 — My Tickets */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '8px' }}>
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
                      Prijava #{ticket.id}
                    </span>
                    <Badge variant={getStatusBadgeVariant(ticket.currentStatus)}>
                      {formatStatus(ticket.currentStatus)}
                    </Badge>
                    {ticket.urgent && (
                      <Badge variant="urgent">URGENT</Badge>
                    )}
                    <span className="text-sm text-gray-600">
                      {formatCategory(ticket.category)}
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
