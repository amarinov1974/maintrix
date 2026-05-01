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
import { formatCategory } from '../../utils/formatters';

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
              Nadzorna ploča — Voditelj regije
            </h1>
            <p className="text-gray-600">
              {session?.regionName ?? 'Regionalno odobrenje'}
            </p>
          </div>
          <Link
            to="/assets"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            🏭 Asset Register
          </Link>
        </div>

        <div style={{
          backgroundColor: '#F5F5F7',
          borderRadius: '10px',
          padding: '14px 18px',
          borderLeft: '4px solid #0071E3',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#0071E3', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Vaša uloga</p>
          <p style={{ fontSize: '13px', color: '#3C3C43' }}>
            Odobravate ne-hitne prijave prije procjene troška. Pregledajte svaku prijavu i odobrite ili odbijte.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <p className="text-gray-600">Učitavanje prijava...</p>
          </Card>
        ) : tickets != null && tickets.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {tickets.length} prijava čeka odobrenje
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
                      <span>Poslovnica: {ticket.storeName}</span>
                      <span>•</span>
                      <span>Kategorija: {formatCategory(ticket.category)}</span>
                      <span>•</span>
                      <span>Kreirao: {ticket.createdByUserName}</span>
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
                Sve odrađeno!
              </p>
              <p className="text-sm text-gray-500">
                Nema prijava koje čekaju odobrenje.
              </p>
            </div>
          </Card>
        )}

        {/* Active tickets (participated) & Closed tickets */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Prijave
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {sectionFilter === 'active'
              ? 'Prijave u kojima ste sudjelovali.'
              : 'Zatvorene i arhivirane prijave.'}
          </p>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={sectionFilter === 'active' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSectionFilter('active')}
            >
              Aktivne prijave
            </Button>
            <Button
              type="button"
              variant={sectionFilter === 'closed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSectionFilter('closed')}
            >
              Zatvorene prijave
            </Button>
          </div>
          {sectionLoading ? (
            <p className="text-gray-500">Učitavanje...</p>
          ) : sectionTickets.length === 0 ? (
            <p className="text-gray-600">Nema prijava za prikaz.</p>
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
                    <span className="text-sm text-gray-600">{formatCategory(ticket.category)}</span>
                    <span className="text-sm text-gray-500">
                      Zadnja izmjena {new Date(ticket.updatedAt).toLocaleDateString()}
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
