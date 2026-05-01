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
import { formatCategory, formatStatus } from '../../utils/formatters';

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

function getRoleLabel(role: string) {
  if (role === 'D') return 'Direktor prodaje';
  if (role === 'C2') return 'Direktor održavanja';
  if (role === 'BOD') return 'Upravni odbor';
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
            <p className="text-gray-600">Odobrenje procjena troška</p>
          </div>
          <Link
            to="/assets"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            🏭 Registar opreme
          </Link>
        </div>

        <div style={{
          backgroundColor: '#F5F5F7',
          borderRadius: '10px',
          padding: '14px 18px',
          borderLeft: '4px solid #0071E3',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#0071E3', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Vaša uloga u lancu odobrenja</p>
          <p style={{ fontSize: '13px', color: '#3C3C43', marginBottom: '6px' }}>Pregledavate procjene troška na temelju pragova odobrenja:</p>
          <ul style={{ fontSize: '12px', color: '#3C3C43', paddingLeft: '16px', margin: 0, lineHeight: '1.8' }}>
            <li>≤ €1.000: Samo AM (nećete vidjeti ove prijave)</li>
            <li>€1.001 – €3.000: AM → D → C2</li>
            <li>&gt; €3.000: AM → D → C2 → BOD</li>
          </ul>
        </div>

        {isLoading ? (
          <Card>
            <p className="text-gray-600">Učitavanje prijava...</p>
          </Card>
        ) : tickets != null && tickets.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {tickets.length} prijava čeka Vaše odobrenje
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
                        Prijava #{ticket.id}
                      </h3>
                      <Badge variant="warning">Čeka odobrenje</Badge>
                    </div>
                    <p className="text-gray-700 mb-2">{ticket.originalDescription ?? ticket.description}</p>
                    <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                      <span>Poslovnica: {ticket.storeName}</span>
                      <span>•</span>
                      <span>Kategorija: {formatCategory(ticket.category)}</span>
                      <span>•</span>
                      <span>Kreirao: {ticket.createdByUserName}</span>
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
                Nema procjena troška koje čekaju Vaše odobrenje.
              </p>
            </div>
          </Card>
        )}

        {/* My tickets — read-only, participated but not current owner */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Moje prijave</h2>
          <p className="text-sm text-gray-600 mb-4">
            Prijave u kojima ste sudjelovali (npr. u lancu odobrenja). Samo pregled.
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
          {loadingParticipated ? (
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
      <span className="font-semibold text-gray-900">Prijava #{ticket.id}</span>
      {ticket.urgent && <Badge variant="urgent">URGENT</Badge>}
      <Badge variant={getStatusBadgeVariant(ticket.currentStatus)}>{formatStatus(ticket.currentStatus)}</Badge>
      <span className="text-sm text-gray-600">{ticket.storeName}</span>
      <span className="text-sm text-gray-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
    </button>
  );
}
