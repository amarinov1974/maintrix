/**
 * Director Dashboard
 * Used by D (Sales Director), C2 (Maintenance Director), and BOD (Board of Directors)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Card, Badge, Button } from '../../components/shared';
import { DirectorTicketDetailModal } from './DirectorTicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import type { Ticket } from '../../api/tickets';

function getRoleLabel(role: string) {
  if (role === 'D') return 'Sales Director';
  if (role === 'C2') return 'Maintenance Director';
  if (role === 'BOD') return 'Board of Directors';
  return role;
}

function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  if (status.includes('Approved')) return 'success';
  if (status.includes('Rejected') || status.includes('Withdrawn')) return 'danger';
  return 'warning';
}

export function DirectorDashboard() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketReadOnlyFilter, setTicketReadOnlyFilter] = useState<'active' | 'closed'>('active');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', 'director-tickets', session?.userId],
    queryFn: () =>
      ticketsAPI.list({
        currentOwnerUserId: session!.userId,
      }),
    enabled: session?.userId != null,
  });

  const { data: participatedTickets = [], isLoading: loadingParticipated } = useQuery({
    queryKey: ['tickets', 'director-participated', session?.userId],
    queryFn: () =>
      ticketsAPI.list({
        participatedByUserId: session!.userId,
      }),
    enabled: session?.userId != null,
  });

  const terminalStatuses: readonly string[] = [
    TicketStatus.REJECTED,
    TicketStatus.WITHDRAWN,
    TicketStatus.ARCHIVED,
  ];
  const sortByUpdatedAt = <T extends { updatedAt: string }>(items: T[]) =>
    [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const myActiveTickets = sortByUpdatedAt(
    participatedTickets.filter((t) => !terminalStatuses.includes(t.currentStatus))
  );
  const myClosedTickets = sortByUpdatedAt(
    participatedTickets.filter((t) => terminalStatuses.includes(t.currentStatus))
  );
  const readOnlyTicketsFiltered =
    ticketReadOnlyFilter === 'active' ? myActiveTickets : myClosedTickets;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getRoleLabel(session?.role ?? '')} Dashboard
            </h1>
            <p className="text-gray-600">Cost Estimation Approvals</p>
          </div>
          <Link
            to="/assets"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            🏭 Asset Register
          </Link>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-2xl">💰</div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">
                Your Role in Approval Chain
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                You review cost estimations for maintenance tickets based on
                approval thresholds:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>
                  <strong>≤ €1,000:</strong> AM only (you won&apos;t see these)
                </li>
                <li>
                  <strong>€1,001 - €3,000:</strong> AM → D → C2
                </li>
                <li>
                  <strong>&gt; €3,000:</strong> AM → D → C2 → BOD
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <Card>
            <p className="text-gray-600">Loading tickets...</p>
          </Card>
        ) : tickets != null && tickets.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {tickets.length} ticket(s) awaiting your approval
            </p>
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Ticket #{ticket.id}
                      </h3>
                      <Badge variant="warning">Awaiting Approval</Badge>
                    </div>
                    <p className="text-gray-700 mb-2">{ticket.originalDescription ?? ticket.description}</p>
                    <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                      <span>Store: {ticket.storeName}</span>
                      <span>•</span>
                      <span>Category: {ticket.category}</span>
                      <span>•</span>
                      <span>Created by: {ticket.createdByUserName}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-gray-600 text-lg font-medium mb-2">
                All Caught Up!
              </p>
              <p className="text-sm text-gray-500">
                No cost estimations awaiting your approval at the moment.
              </p>
            </div>
          </Card>
        )}

        {/* My tickets — read-only, participated but not current owner */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">My tickets</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tickets you participated in (e.g. in the approval chain) but are not currently owning. Read-only.
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
          {loadingParticipated ? (
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
      </div>

      {selectedTicketId != null && (
        <DirectorTicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
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
