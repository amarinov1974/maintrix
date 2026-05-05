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
import type { Ticket } from '../../api/tickets';
import type { WorkOrder } from '../../api/work-orders';
import { formatStatus, getInFlightStatusBadgeVariant } from '../../utils/formatters';

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

export function AMMDashboard() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<number | null>(null);
  const [ticketReadOnlyFilter, setTicketReadOnlyFilter] = useState<'active' | 'closed'>('active');
  const [woReadOnlyFilter, setWoReadOnlyFilter] = useState<'active' | 'closed'>('active');

  const { data: ownedTickets = [], isLoading: _loadingTickets } = useQuery({
    queryKey: ['tickets', 'amm-owned', session?.userId],
    queryFn: () =>
      ticketsAPI.list({ currentOwnerUserId: session!.userId }),
    enabled: session?.userId != null,
  });

  const { data: ownedWorkOrders = [], isLoading: _loadingWOs } = useQuery({
    queryKey: ['work-orders', 'amm-owned', session?.userId],
    queryFn: () =>
      workOrdersAPI.list({
        currentOwnerId: session!.userId,
        currentOwnerType: 'INTERNAL',
      }),
    enabled: session?.userId != null,
  });

  // Urgent tickets: submitted, updated (after clarification), or back from SM in Cost Estimation Needed — all show in Urgent Tickets, not in Cost Estimation
  const openUrgentTickets = ownedTickets.filter(
    (t) =>
      t.urgent &&
      (t.currentStatus === TicketStatus.SUBMITTED ||
        t.currentStatus === TicketStatus.UPDATED_SUBMITTED ||
        t.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED)
  );
  const costEstimationNeededTickets = ownedTickets.filter(
    (t) =>
      t.currentStatus === TicketStatus.COST_ESTIMATION_NEEDED && !t.urgent
  );
  const approvedCostTickets = ownedTickets.filter(
    (t) => t.currentStatus === TicketStatus.COST_ESTIMATION_APPROVED
  );
  const workInProgressTickets = ownedTickets.filter(
    (t) => t.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS
  );
  // WOs returned or rejected by S1 to AMM: owner is AMM (INTERNAL), status Awaiting Service Provider or Rejected
  const returnedWorkOrders = ownedWorkOrders.filter(
    (wo) =>
      wo.currentStatus === WorkOrderStatus.CREATED ||
      wo.currentStatus === WorkOrderStatus.REJECTED
  );
  const costProposalPreparedWOs = ownedWorkOrders.filter(
    (wo) => wo.currentStatus === WorkOrderStatus.COST_PROPOSAL_PREPARED
  );
  const followUpExceptionWOs = ownedWorkOrders.filter((wo) =>
    (
      [
        WorkOrderStatus.FOLLOW_UP_REQUESTED,
        WorkOrderStatus.REPAIR_UNSUCCESSFUL,
        WorkOrderStatus.NEW_WO_NEEDED,
      ] as readonly string[]
    ).includes(wo.currentStatus)
  );

  const { data: regionTickets = [], isLoading: loadingRegionTickets } = useQuery({
    queryKey: ['tickets', 'amm-region', session?.regionId],
    queryFn: () =>
      ticketsAPI.list({ regionId: session!.regionId }),
    enabled: session?.regionId != null,
  });

  const { data: participatedTickets = [], isLoading: loadingParticipatedTickets } = useQuery({
    queryKey: ['tickets', 'amm-participated', session?.regionId, session?.userId],
    queryFn: () =>
      ticketsAPI.list({
        regionId: session!.regionId,
        participatedByUserId: session!.userId,
      }),
    enabled: session?.regionId != null && session?.userId != null,
  });

  const terminalStatuses: readonly string[] = [
    TicketStatus.REJECTED,
    TicketStatus.WITHDRAWN,
    TicketStatus.ARCHIVED,
  ];
  const closedTickets = regionTickets.filter((t) =>
    terminalStatuses.includes(t.currentStatus)
  );
  const sortByUpdatedAt = <T extends { updatedAt: string }>(items: T[]) =>
    [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const myActiveTickets = sortByUpdatedAt(participatedTickets);
  const myClosedTickets = sortByUpdatedAt(closedTickets);
  const readOnlyTicketsFiltered =
    ticketReadOnlyFilter === 'active' ? myActiveTickets : myClosedTickets;

  const { data: regionWOs = [], isLoading: loadingRegionWOs } = useQuery({
    queryKey: ['work-orders', 'amm-region', session?.regionId],
    queryFn: () =>
      workOrdersAPI.list({ regionId: session!.regionId }),
    enabled: session?.regionId != null,
  });

  const { data: workOrdersWithVendor = [] } = useQuery({
    queryKey: ['work-orders', 'amm-region-vendor', session?.regionId],
    queryFn: () =>
      workOrdersAPI.list({
        regionId: session!.regionId,
        currentOwnerType: 'VENDOR',
      }),
    enabled: session?.regionId != null,
  });

  const sortNewestFirst = <T extends { createdAt: string }>(items: T[]) =>
    [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const myActiveWOs = regionWOs.filter(
    (wo) => !TerminalWorkOrderStatuses.includes(wo.currentStatus)
  );
  const myClosedWOs = regionWOs.filter((wo) =>
    TerminalWorkOrderStatuses.includes(wo.currentStatus)
  );
  const readOnlyWOsFiltered =
    woReadOnlyFilter === 'active'
      ? sortNewestFirst(myActiveWOs)
      : sortNewestFirst(myClosedWOs);

  return (
    <Layout screenTitle="Nadzorna ploča">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Voditelj održavanja</h1>
            <p className="text-gray-600">{session?.regionName ?? 'Nadzorna ploča'}</p>
          </div>
          <Link
            to="/assets"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            🏭 Registar opreme
          </Link>
        </div>

        {/* Tickets — Create Ticket + Ticket action groups */}
        <div className="space-y-4">
          <h2 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '8px' }}>Prijave</h2>
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
              <p style={{ fontSize: '12px', color: '#6E6E73', marginTop: '2px' }}>Kreirajte prijavu za bilo koju poslovnicu u regiji.</p>
            </div>
            <Link to="/amm/submit">
              <Button type="button">Nova prijava</Button>
            </Link>
          </div>
        

        {/* 10.4 Ticket Action Groups — click to open list when count > 0 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <BucketCard
            title="Hitne prijave"
            count={openUrgentTickets.length}
            accentColor="#FF3B30"
            to="/amm/urgent-tickets"
          />
          <BucketCard
            title="Prijave — čeka procjena troška"
            count={costEstimationNeededTickets.length}
            accentColor="#FF9500"
            to="/amm/cost-estimation-tickets"
          />
          <BucketCard
            title="Prijave s odobrenom procjenom"
            count={approvedCostTickets.length}
            accentColor="#34C759"
            to="/amm/approved-cost-tickets"
          />
          <BucketCard
            title="Prijave — rad u tijeku"
            count={workInProgressTickets.length}
            accentColor="#0071E3"
            to="/amm/work-in-progress-tickets"
          />
        </div>
        </div>

        {/* Work Orders — WO action groups */}
        <div className="space-y-4">
          <h2 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', marginTop: '8px' }}>Radni nalozi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <BucketCard
              title="Vraćeni radni nalozi"
              count={returnedWorkOrders.length}
              accentColor="#FF3B30"
              to="/amm/returned-work-orders"
            />
            <BucketCard
              title="Radni nalozi kod izvođača"
              count={workOrdersWithVendor.length}
              accentColor="#0071E3"
              to="/amm/work-orders-with-vendor"
            />
            <BucketCard
              title="Radni nalozi — odobrenje ponude"
              count={costProposalPreparedWOs.length}
              accentColor="#FF9500"
              to="/amm/cost-proposal-work-orders"
            />
            <BucketCard
              title="Radni nalozi — iznimke"
              count={followUpExceptionWOs.length}
              accentColor="#FF3B30"
              to="/amm/follow-up-work-orders"
            />
          </div>
        </div>

        {/* 10.6 Read-Only — My Tickets */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Moje prijave</h2>
          <p className="text-sm text-gray-600 mb-4">
            Prijave u regiji u kojima ste sudjelovali.
          </p>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={ticketReadOnlyFilter === 'active' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTicketReadOnlyFilter('active')}
            >
              Aktivne prijave ({myActiveTickets.length})
            </Button>
            <Button
              type="button"
              variant={ticketReadOnlyFilter === 'closed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTicketReadOnlyFilter('closed')}
            >
              Zatvorene prijave ({myClosedTickets.length})
            </Button>
          </div>
          {(ticketReadOnlyFilter === 'active' && loadingParticipatedTickets) ||
          (ticketReadOnlyFilter === 'closed' && loadingRegionTickets) ? (
            <p className="text-gray-500">Učitavanje...</p>
          ) : readOnlyTicketsFiltered.length === 0 ? (
            <p className="text-gray-500">Nema prijava u ovoj grupi.</p>
          ) : (
            <div className="space-y-2">
              {readOnlyTicketsFiltered.map((t) => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  onClick={() => setSelectedTicketId(t.id)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* 10.7 Read-Only — My Work Orders */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Moji radni nalozi</h2>
          <p className="text-sm text-gray-600 mb-4">
            Radni nalozi u regiji — aktivni ili zatvoreni.
          </p>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={woReadOnlyFilter === 'active' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setWoReadOnlyFilter('active')}
            >
              Aktivni radni nalozi ({myActiveWOs.length})
            </Button>
            <Button
              type="button"
              variant={woReadOnlyFilter === 'closed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setWoReadOnlyFilter('closed')}
            >
              Zatvoreni radni nalozi ({myClosedWOs.length})
            </Button>
          </div>
          {loadingRegionWOs ? (
            <p className="text-gray-500">Učitavanje...</p>
          ) : readOnlyWOsFiltered.length === 0 ? (
            <p className="text-gray-500">Nema radnih naloga u ovoj grupi.</p>
          ) : (
            <div className="space-y-2">
              {readOnlyWOsFiltered.map((wo) => (
                <WorkOrderRow
                  key={wo.id}
                  workOrder={wo}
                  onSelect={() => setSelectedWorkOrderId(wo.id)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {selectedTicketId != null && (
        <AMMTicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}

      {selectedWorkOrderId != null && (
        <AMMWorkOrderDetailModal
          workOrderId={selectedWorkOrderId}
          onClose={() => setSelectedWorkOrderId(null)}
        />
      )}
    </Layout>
  );
}

function TicketRow({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  return (
    <button
      type="button"
      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition flex flex-wrap items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="font-semibold text-gray-900">Prijava #{ticket.id}</span>
      {ticket.urgent && <Badge variant="urgent">URGENT</Badge>}
      <Badge variant={getInFlightStatusBadgeVariant(ticket.currentStatus)}>{formatStatus(ticket.currentStatus)}</Badge>
      <span className="text-sm text-gray-600">{ticket.storeName}</span>
      <span className="text-sm text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
    </button>
  );
}

function WorkOrderRow({ workOrder, onSelect }: { workOrder: WorkOrder; onSelect: () => void }) {
  return (
    <button
      type="button"
      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition flex flex-wrap items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
    >
      <span className="font-semibold text-gray-900">Work Order #{workOrder.id}</span>
      <span className="text-sm text-gray-600">Prijava #{workOrder.ticketId}</span>
      <Badge variant={getInFlightStatusBadgeVariant(workOrder.currentStatus)}>{formatStatus(workOrder.currentStatus)}</Badge>
      <span className="text-sm text-gray-600">{workOrder.vendorCompanyName}</span>
      <span className="text-sm text-gray-500">{new Date(workOrder.updatedAt).toLocaleDateString()}</span>
    </button>
  );
}
