/**
 * Store Manager — Action Required (clarification needed)
 * List of tickets returned for SM clarification, newest first.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Badge } from '../../components/shared';
import { TicketDetailModal } from './TicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import { formatCategory } from '../../utils/formatters';

const DESCRIPTION_PREVIEW_LENGTH = 120;

function descriptionPreview(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length <= DESCRIPTION_PREVIEW_LENGTH) return trimmed;
  return trimmed.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim() + '…';
}

function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  if (status === 'Draft') return 'default';
  if (status.includes('Submitted') || status.includes('Awaiting')) return 'warning';
  if (status.includes('Approved')) return 'success';
  if (status.includes('Rejected') || status.includes('Withdrawn')) return 'danger';
  return 'default';
}

export function SMActionRequiredPage() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: actionRequiredTickets = [], isLoading } = useQuery({
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
    refetchOnWindowFocus: true, // so returned tickets (e.g. after AMM ping-pong) show up promptly
  });

  const sorted = [...actionRequiredTickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Layout screenTitle="Action Required">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Action Required</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Tickets returned for your clarification — newest first
            </p>
          </div>
          <Link to="/store-manager">
            <Button type="button" variant="secondary">
              Back to dashboard
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading…</p>
        ) : sorted.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
            No tickets requiring your action.
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-amber-50/50 hover:border-amber-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">Ticket #{ticket.id}</span>
                    <Badge variant={getStatusBadgeVariant(ticket.currentStatus)}>
                      {ticket.currentStatus}
                    </Badge>
                    {ticket.urgent && <Badge variant="urgent">URGENT</Badge>}
                    <span className="text-sm text-gray-600">{formatCategory(ticket.category)}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-2">
                    {descriptionPreview(ticket.originalDescription ?? ticket.description)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
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
