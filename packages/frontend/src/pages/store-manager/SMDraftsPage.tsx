/**
 * Store Manager — Drafts list
 *
 * Lists tickets the current SM has saved as drafts (status DRAFT) so they
 * can be re-opened, edited, and submitted. Clicking a row opens the
 * existing TicketDetailModal which already exposes the "Submit ticket"
 * action when `canSubmitDraft` (owner + DRAFT).
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

export function SMDraftsPage() {
  const { session } = useSession();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: drafts = [], isLoading } = useQuery({
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
    enabled: session?.storeId != null && session?.userId != null,
    refetchOnWindowFocus: true,
  });

  const sorted = [...drafts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Layout screenTitle="Nacrti prijava">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nacrti prijava</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Spremljeni nacrti — kliknite na nacrt da ga otvorite, dovršite i pošaljete.
            </p>
          </div>
          <Link to="/store-manager">
            <Button type="button" variant="secondary">
              Natrag na nadzornu ploču
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Učitavanje…</p>
        ) : sorted.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
            Nema spremljenih nacrta.
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">Prijava #{ticket.id}</span>
                    <Badge variant="default">Nacrt</Badge>
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
