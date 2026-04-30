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

function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  if (status.includes('Approved')) return 'success';
  if (status.includes('Rejected') || status.includes('Withdrawn')) return 'danger';
  return 'warning';
}

export function AMMDashboard() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<number | null>(null);
  const [ticketReadOnlyFilter, setTicketReadOnlyFilter] = useState<'active' | 'closed'>('active');
  const [woReadOnlyFilter, setWoReadOnlyFilter] = useState<'active' | 'closed'>('active');

  const { data: ownedTickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['tickets', 'amm-owned', session?.userId],
    queryFn: () =>
      ticketsAPI.list({ currentOwnerUserId: session!.userId }),
    enabled: session?.userId != null,
  });

  const { data: ownedWorkOrders = [], isLoading: loadingWOs } = useQuery({
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
    <Layout screenTitle="Dashboard">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Area Maintenance Manager</h1>
            <p className="text-gray-600">{session?.regionName ?? 'Dashboard'}</p>
          </div>
          <Link
            to="/assets"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            🏭 Asset Register
          </Link>
        </div>

        {/* Tickets — Create Ticket + Ticket action groups */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Tickets</h2>
          <Card className="bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Ticket</h2>
              <p className="text-sm text-gray-600">Create a ticket for any store in your region.</p>
            </div>
            <Link to="/amm/submit">
              <Button type="button">Submit New Ticket</Button>
            </Link>
          </div>
        </Card>

        {/* 10.4 Ticket Action Groups — click to open list when count > 0 */}
        <div className="grid gap-4 sm:grid-cols-2">
          {openUrgentTickets.length > 0 ? (
            <Link to="/amm/urgent-tickets">
              <Card
                className="cursor-pointer hover:shadow-md transition border-amber-200 bg-amber-50/50 block"
                onClick={undefined}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Urgent Tickets</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="warning">{openUrgentTickets.length}</Badge>
                    <span className="text-sm text-gray-500">Click to open list</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Submitted, updated (after clarification), or awaiting cost estimation — urgent, owned by you</p>
              </Card>
            </Link>
          ) : (
            <Card className="border-amber-200 bg-amber-50/50 opacity-90">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Urgent Tickets</h2>
                <Badge variant="warning">0</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Submitted, updated (after clarification), or awaiting cost estimation — urgent, owned by you</p>
            </Card>
          )}
          {costEstimationNeededTickets.length > 0 ? (
            <Link to="/amm/cost-estimation-tickets">
              <Card
                className="cursor-pointer hover:shadow-md transition border-blue-200 bg-blue-50/50 block"
                onClick={undefined}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Tickets Awaiting Cost Estimation</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="warning">{costEstimationNeededTickets.length}</Badge>
                    <span className="text-sm text-gray-500">Click to open list</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Non-urgent tickets in Cost Estimation Needed, owned by you</p>
              </Card>
            </Link>
          ) : (
            <Card className="border-blue-200 bg-blue-50/50 opacity-90">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Tickets Awaiting Cost Estimation</h2>
                <Badge variant="warning">0</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Non-urgent tickets in Cost Estimation Needed, owned by you</p>
            </Card>
          )}
          {approvedCostTickets.length > 0 ? (
            <Link to="/amm/approved-cost-tickets">
              <Card
                className="cursor-pointer hover:shadow-md transition border-green-200 bg-green-50/50 block"
                onClick={undefined}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Tickets with Approved Cost</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="success">{approvedCostTickets.length}</Badge>
                    <span className="text-sm text-gray-500">Click to open list</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Cost estimation approved — create first work order or archive</p>
              </Card>
            </Link>
          ) : (
            <Card className="border-green-200 bg-green-50/50 opacity-90">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Tickets with Approved Cost</h2>
                <Badge variant="success">0</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Cost estimation approved — create first work order or archive</p>
            </Card>
          )}
          {workInProgressTickets.length > 0 ? (
            <Link to="/amm/work-in-progress-tickets">
              <Card
                className="cursor-pointer hover:shadow-md transition border-teal-200 bg-teal-50/50 block"
                onClick={undefined}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Tickets — Work in Progress</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{workInProgressTickets.length}</Badge>
                    <span className="text-sm text-gray-500">Click to open list</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Work order(s) sent — create extra work orders or archive when all done</p>
              </Card>
            </Link>
          ) : (
            <Card className="border-teal-200 bg-teal-50/50 opacity-90">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Tickets — Work in Progress</h2>
                <Badge variant="default">0</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Work order(s) sent — create extra work orders or archive when all done</p>
            </Card>
          )}
        </div>
        </div>

        {/* Work Orders — WO action groups */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Work Orders</h2>
          <div className="grid gap-4 sm:grid-cols-2">
          {returnedWorkOrders.length > 0 ? (
            <Link to="/amm/returned-work-orders">
              <Card
                className="cursor-pointer hover:shadow-md transition border-rose-200 bg-rose-50/50 block"
                onClick={undefined}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Work orders — returned</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="warning">{returnedWorkOrders.length}</Badge>
                    <span className="text-sm text-gray-500">Click to open list</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Returned or rejected by service provider (S1) — review and resend or close</p>
              </Card>
            </Link>
          ) : (
            <Card className="border-rose-200 bg-rose-50/50 opacity-90">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Work orders — returned</h2>
                <Badge variant="warning">0</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Returned or rejected by service provider (S1) — review and resend or close</p>
            </Card>
          )}
          {workOrdersWithVendor.length > 0 ? (
            <Link to="/amm/work-orders-with-vendor">
              <Card
                className="cursor-pointer hover:shadow-md transition border-sky-200 bg-sky-50/50 block"
                onClick={undefined}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Work orders sent to vendors</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{workOrdersWithVendor.length}</Badge>
                    <span className="text-sm text-gray-500">Click to open list</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">View status and details</p>
              </Card>
            </Link>
          ) : (
            <Card className="border-sky-200 bg-sky-50/50 opacity-90">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Work orders sent to vendors</h2>
                <Badge variant="default">0</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">View status and details</p>
            </Card>
          )}
          {costProposalPreparedWOs.length > 0 ? (
            <Link to="/amm/cost-proposal-work-orders">
              <Card
                className="cursor-pointer hover:shadow-md transition border-emerald-200 bg-emerald-50/50 block"
                onClick={undefined}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Work Orders Awaiting Cost Proposal Review</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="warning">{costProposalPreparedWOs.length}</Badge>
                    <span className="text-sm text-gray-500">Click to open list</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Approve / Request Revision / Close Without Cost</p>
              </Card>
            </Link>
          ) : (
            <Card className="border-emerald-200 bg-emerald-50/50 opacity-90">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Work Orders Awaiting Cost Proposal Review</h2>
                <Badge variant="warning">0</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Approve / Request Revision / Close Without Cost</p>
            </Card>
          )}
          {followUpExceptionWOs.length > 0 ? (
            <Link to="/amm/follow-up-work-orders">
              <Card
                className="cursor-pointer hover:shadow-md transition border-orange-200 bg-orange-50/50 block"
                onClick={undefined}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Follow-Up / Exception Work Orders</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="warning">{followUpExceptionWOs.length}</Badge>
                    <span className="text-sm text-gray-500">Click to open list</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Follow-Up Requested, Repair Unsuccessful, or New WO Needed</p>
              </Card>
            </Link>
          ) : (
            <Card className="border-orange-200 bg-orange-50/50 opacity-90">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Follow-Up / Exception Work Orders</h2>
                <Badge variant="warning">0</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">Follow-Up Requested, Repair Unsuccessful, or New WO Needed</p>
            </Card>
          )}
          </div>
        </div>

        {/* 10.6 Read-Only — My Tickets */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">My tickets</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tickets in your region you participated in (active) or that are closed.
          </p>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={ticketReadOnlyFilter === 'active' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTicketReadOnlyFilter('active')}
            >
              Active tickets ({myActiveTickets.length})
            </Button>
            <Button
              type="button"
              variant={ticketReadOnlyFilter === 'closed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTicketReadOnlyFilter('closed')}
            >
              Closed tickets ({myClosedTickets.length})
            </Button>
          </div>
          {(ticketReadOnlyFilter === 'active' && loadingParticipatedTickets) ||
          (ticketReadOnlyFilter === 'closed' && loadingRegionTickets) ? (
            <p className="text-gray-500">Loading...</p>
          ) : readOnlyTicketsFiltered.length === 0 ? (
            <p className="text-gray-500">No tickets in this group.</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">My work orders</h2>
          <p className="text-sm text-gray-600 mb-4">
            Work orders in your region — active (in progress) or closed.
          </p>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={woReadOnlyFilter === 'active' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setWoReadOnlyFilter('active')}
            >
              Active work orders ({myActiveWOs.length})
            </Button>
            <Button
              type="button"
              variant={woReadOnlyFilter === 'closed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setWoReadOnlyFilter('closed')}
            >
              Closed work orders ({myClosedWOs.length})
            </Button>
          </div>
          {loadingRegionWOs ? (
            <p className="text-gray-500">Loading...</p>
          ) : readOnlyWOsFiltered.length === 0 ? (
            <p className="text-gray-500">No work orders in this group.</p>
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
      <span className="font-semibold text-gray-900">Ticket #{ticket.id}</span>
      {ticket.urgent && <Badge variant="urgent">URGENT</Badge>}
      <Badge variant={getStatusBadgeVariant(ticket.currentStatus)}>{ticket.currentStatus}</Badge>
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
      <span className="text-sm text-gray-600">Ticket #{workOrder.ticketId}</span>
      <Badge variant={getStatusBadgeVariant(workOrder.currentStatus)}>{workOrder.currentStatus}</Badge>
      <span className="text-sm text-gray-600">{workOrder.vendorCompanyName}</span>
      <span className="text-sm text-gray-500">{new Date(workOrder.updatedAt).toLocaleDateString()}</span>
    </button>
  );
}
