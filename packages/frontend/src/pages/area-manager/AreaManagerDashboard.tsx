/**
 * Area Manager Dashboard
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Card, Badge, Button } from '../../components/shared';
import { AMTicketDetailModal } from './AMTicketDetailModal';
import { TicketStatus } from '../../types/statuses';

function getStatusBadgeVariant(
  status: string
): 'default' | 'success' | 'warning' | 'danger' {
  if (status.includes('Submitted')) return 'warning';
  if (status.includes('Approved')) return 'success';
  if (status.includes('Rejected')) return 'danger';
  return 'default';
}

const TERMINAL_STATUSES = [
  TicketStatus.REJECTED,
  TicketStatus.WITHDRAWN,
  TicketStatus.ARCHIVED,
];

export function AreaManagerDashboard() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [sectionFilter, setSectionFilter] = useState<'active' | 'closed'>('active');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', 'am-tickets', session?.userId],
    queryFn: () =>
      ticketsAPI.list({
        currentOwnerUserId: session!.userId,
        urgent: false,
      }),
    enabled: session?.userId != null,
  });

  const { data: participatedTickets = [], isLoading: loadingParticipated } = useQuery({
    queryKey: ['tickets', 'am-participated', session?.regionId, session?.userId],
    queryFn: () =>
      ticketsAPI.list({
        regionId: session!.regionId,
        participatedByUserId: session!.userId,
      }),
    enabled: session?.regionId != null && session?.userId != null,
  });

  const { data: regionTickets = [], isLoading: loadingRegion } = useQuery({
    queryKey: ['tickets', 'am-region', session?.regionId],
    queryFn: () => ticketsAPI.list({ regionId: session!.regionId }),
    enabled: session?.regionId != null,
  });

  const closedTickets = regionTickets.filter((t) =>
    TERMINAL_STATUSES.includes(t.currentStatus as typeof TERMINAL_STATUSES[number])
  );
  const sectionTickets =
    sectionFilter === 'active'
      ? [...participatedTickets].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      : [...closedTickets].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
  const sectionLoading = sectionFilter === 'active' ? loadingParticipated : loadingRegion;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Area Manager Dashboard
            </h1>
            <p className="text-gray-600">
              {session?.regionName ?? 'Regional Approval'}
            </p>
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
            <div className="text-blue-600 text-2xl">ℹ️</div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Your Role</h3>
              <p className="text-sm text-blue-700">
                You approve non-urgent tickets before they proceed to cost
                estimation. Review each ticket and either approve for processing
                or reject if not applicable.
              </p>
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
              {tickets.length} ticket(s) awaiting approval
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
                      <Badge
                        variant={getStatusBadgeVariant(ticket.currentStatus)}
                      >
                        {ticket.currentStatus}
                      </Badge>
                    </div>
                    <p className="text-gray-700 mb-2">{ticket.originalDescription ?? ticket.description}</p>
                    <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                      <span>Store: {ticket.storeName}</span>
                      <span>•</span>
                      <span>Category: {ticket.category}</span>
                      <span>•</span>
                      <span>Created by: {ticket.createdByUserName}</span>
                      <span>•</span>
                      <span>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
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
                No tickets awaiting your approval at the moment.
              </p>
            </div>
          </Card>
        )}

        {/* Active tickets (participated) & Closed tickets */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Tickets
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {sectionFilter === 'active'
              ? 'Tickets you participated in (not current owner).'
              : 'Tickets that finished their life (rejected, withdrawn, archived).'}
          </p>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={sectionFilter === 'active' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSectionFilter('active')}
            >
              Active tickets
            </Button>
            <Button
              type="button"
              variant={sectionFilter === 'closed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSectionFilter('closed')}
            >
              Closed tickets
            </Button>
          </div>
          {sectionLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : sectionTickets.length === 0 ? (
            <p className="text-gray-600">No tickets in this list.</p>
          ) : (
            <div className="space-y-3">
              {sectionTickets.map((ticket) => (
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
                    {ticket.urgent && <Badge variant="urgent">URGENT</Badge>}
                    <span className="text-sm text-gray-600">{ticket.category}</span>
                    <span className="text-sm text-gray-500">
                      Last updated {new Date(ticket.updatedAt).toLocaleDateString()}
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
        <AMTicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </Layout>
  );
}
