/**
 * AMM Tickets — Work in Progress
 * Tickets with work order(s) sent; AMM can create extra work orders or archive when all done.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Layout, Button, Badge } from '../../components/shared';
import { AMMTicketDetailModal } from './AMMTicketDetailModal';
import { TicketStatus } from '../../types/statuses';
import { formatStatus } from '../../utils/formatters';

const DESCRIPTION_PREVIEW_LENGTH = 120;

function descriptionPreview(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length <= DESCRIPTION_PREVIEW_LENGTH) return trimmed;
  return trimmed.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim() + '…';
}

export function AMMWorkInProgressTicketsPage() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: ownedTickets = [], isLoading } = useQuery({
    queryKey: ['tickets', 'amm-owned', session?.userId],
    queryFn: () => ticketsAPI.list({ currentOwnerUserId: session!.userId }),
    enabled: session?.userId != null,
  });

  const workInProgressTickets = ownedTickets
    .filter((t) => t.currentStatus === TicketStatus.WORK_ORDER_IN_PROGRESS)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <Layout screenTitle="Prijave — rad u tijeku">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prijave — rad u tijeku</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Work order(s) sent — create extra work orders or archive when all done — newest first
            </p>
          </div>
          <Link to="/amm">
            <Button type="button" variant="secondary">
              Natrag na nadzornu ploču
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading…</p>
        ) : workInProgressTickets.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
            Nema prijava u tijeku rada.
          </div>
        ) : (
          <ul className="space-y-2">
            {workInProgressTickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-teal-50/50 hover:border-teal-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">Ticket #{ticket.id}</span>
                    {ticket.urgent && <Badge variant="urgent">URGENT</Badge>}
                    <Badge variant="default">{formatStatus(ticket.currentStatus)}</Badge>
                    <span className="text-sm text-gray-600">{ticket.storeName}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
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
        <AMMTicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </Layout>
  );
}
