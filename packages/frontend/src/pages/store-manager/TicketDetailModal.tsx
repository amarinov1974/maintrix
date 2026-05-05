/**
 * Ticket Detail (Store Manager View) — Section 9
 * Read-only block, Clarification mode when owner, visibility rules, history log.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { workOrdersAPI } from '../../api/work-orders';
import { useSession } from '../../contexts/SessionContext';
import { Button, Badge, SuccessOverlay } from '../../components/shared';
import { TicketStatus } from '../../types/statuses';
import { QRGenerationModal } from './QRGenerationModal';
import { formatCategory, formatHistoryAction, formatStatus } from '../../utils/formatters';
import { useSuccessOverlay } from '../../hooks/useSuccessOverlay';

interface TicketDetailModalProps {
  ticketId: number;
  onClose: () => void;
}

export function TicketDetailModal({
  ticketId,
  onClose,
}: TicketDetailModalProps) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [clarificationText, setClarificationText] = useState('');
  const [clarificationAssetId, setClarificationAssetId] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const { message: successMessage, showSuccess } = useSuccessOverlay(onClose);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsAPI.getById(ticketId),
  });

  const { data: relatedWorkOrders = [] } = useQuery({
    queryKey: ['work-orders', 'ticket', ticketId],
    queryFn: () => workOrdersAPI.list({ ticketId }),
    enabled: ticketId != null,
  });

  const submitMutation = useMutation({
    mutationFn: () => ticketsAPI.submit(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      showSuccess('Prijava poslana voditelju održavanja.');
    },
  });

  const submitUpdatedMutation = useMutation({
    mutationFn: () => {
      const raw = clarificationAssetId.trim();
      const assetId = raw ? parseInt(raw, 10) : undefined;
      const validAssetId = assetId != null && !Number.isNaN(assetId) && assetId >= 1 ? assetId : undefined;
      return ticketsAPI.submitUpdated(ticketId, clarificationText, clarificationText, validAssetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setClarificationText('');
      setClarificationAssetId('');
      showSuccess('Pojašnjenje poslano.');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => ticketsAPI.withdraw(ticketId, withdrawReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      showSuccess('Prijava povučena.');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: () => ticketsAPI.addComment(ticketId, clarificationText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setClarificationText('');
    },
  });

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px' }}>
          <p>Učitavanje detalja prijave...</p>
        </div>
      </div>
    );
  }

  if (ticket == null) {
    return null;
  }

  const isOwner = session?.userId != null && ticket.currentOwnerUserId === session.userId;
  const isCreator = session?.userId != null && ticket.createdByUserId === session.userId;
  const canSubmitDraft = isOwner && ticket.currentStatus === TicketStatus.DRAFT;
  // Only the ticket creator (SM who created it) can submit clarification; unlimited exchange with AMM.
  const isClarificationMode =
    isCreator &&
    ticket.currentStatus === TicketStatus.AWAITING_CREATOR_RESPONSE;
  const clarificationValid = (clarificationText?.trim() ?? '').length > 0;
  const readOnly = !isOwner;
  const awaitingCreatorResponseNotCreator =
    ticket.currentStatus === TicketStatus.AWAITING_CREATOR_RESPONSE && !isCreator;

  const visibleComments = (
    ticket.comments != null && readOnly
      ? ticket.comments.filter((c) => !c.internalFlag)
      : ticket.comments ?? []
  ).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const visibleAttachments = (ticket.attachments ?? []).filter(
    (a) => !a.internalFlag
  );

  const submittedAt = ticket.submittedAt ?? (ticket.currentStatus !== TicketStatus.DRAFT ? ticket.createdAt : null);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50, overflowY: 'auto', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '760px', width: '100%', margin: '32px auto', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        {/* 9.1 Screen Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #E8E8ED', position: 'sticky', top: 0, backgroundColor: '#FFFFFF', flexShrink: 0, borderRadius: '16px 16px 0 0' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }}>Detalji prijave</h1>
              <p style={{ fontSize: '13px', color: '#6E6E73', marginTop: '2px' }}>
                Prijava #{ticket.id}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={onClose}>
              Natrag
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {successMessage ? (
            <SuccessOverlay message={successMessage} />
          ) : (
          <>
          {readOnly && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-sm text-gray-700">
              Niste vlasnik ove prijave. Samo pregled — bez izmjena.
            </div>
          )}
          {awaitingCreatorResponseNotCreator && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              Ova prijava čeka odgovor na pojašnjenje od kreatora ({ticket.createdByUserName ?? 'Voditelj poslovnice'}). Samo oni mogu poslati odgovor i vratiti prijavu Voditelju održavanja.
            </div>
          )}

          {/* 9.2 Ticket Core Information (Read-Only Block) */}
          <section className="space-y-4">
            <h2 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Informacije o prijavi</h2>
            <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>ID prijave</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.id}</p>
                </div>
                {submittedAt != null && (
                  <div>
                    <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Datum i vrijeme prijave</p>
                    <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{new Date(submittedAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Kreirao</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.createdByUserName}{ticket.createdByUserRole != null ? ` (${ticket.createdByUserRole})` : ''}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Trenutni vlasnik</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Poslovnica</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.storeName}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Kategorija</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{formatCategory(ticket.category)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Hitnost</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{ticket.urgent ? 'HITNO' : 'Nije hitno'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Trenutni status</p>
                  <p style={{ fontSize: '14px', color: '#1D1D1F' }}>{formatStatus(ticket.currentStatus)}</p>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '11px', color: '#6E6E73', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>Originalni opis problema (zaključano)</p>
                <p style={{ fontSize: '14px', color: '#1D1D1F', whiteSpace: 'pre-wrap' }}>{ticket.originalDescription ?? ticket.description}</p>
              </div>
            </div>
          </section>

          {/* Related Work Orders — SM: list and navigate to QR (one WO direct, multiple require selection) */}
          <section>
            <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Povezani radni nalozi</h3>
            {relatedWorkOrders.length === 0 ? (
              <p className="text-sm text-gray-500">Nema radnih naloga za ovu prijavu.</p>
            ) : (
              <>
                <ul className="bg-gray-50 rounded-lg p-4 space-y-2 mb-3">
                  {relatedWorkOrders.map((wo) => (
                    <li key={wo.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">Radni nalog #{wo.id}</span>
                      <Badge variant="default">{formatStatus(wo.currentStatus)}</Badge>
                      <span className="text-gray-600">{wo.vendorCompanyName}</span>
                      <span className="text-gray-500">{new Date(wo.updatedAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
                <Button type="button" onClick={() => setShowQRModal(true)}>
                  {relatedWorkOrders.length === 1 ? 'Generiraj QR kod' : 'Generiraj QR kod (odabir radnog naloga)'}
                </Button>
              </>
            )}
          </section>

          {/* 9.4 Asset Visibility */}
          {(ticket.assetId != null || ticket.assetDescription != null) && (
            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Oprema</h3>
              <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px' }}>
                {ticket.assetId != null && <span><strong>ID opreme:</strong> {ticket.assetId}</span>}
                {ticket.assetDescription != null && (
                  <p className="mt-1"><strong>Opis:</strong> {ticket.assetDescription}</p>
                )}
              </div>
            </section>
          )}

          {/* 9.3 Attachments (view/download only; add-only in clarification) */}
          <section>
            <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Privici</h3>
            {visibleAttachments.length > 0 ? (
              <ul className="bg-gray-50 rounded-lg p-4 space-y-2">
                {visibleAttachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span>{a.fileName}</span>
                    <span className="text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                    {/* View/Download placeholder - no delete/modify */}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Nema privitaka</p>
            )}
            {isClarificationMode && (
              <p className="mt-2 text-xs text-gray-500">Dodavanje privitaka (samo dodavanje) — učitavanje će biti dostupno u idućoj verziji.</p>
            )}
          </section>

          {/* Draft: Submit Ticket (only when owner and Draft) */}
          {canSubmitDraft && (
            <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #0071E3' }}>
              <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>Ova prijava je u nacrtu. Pošaljite je u obradu.</p>
              <Button type="button" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Slanje...' : 'Pošalji prijavu'}
              </Button>
            </div>
          )}

          {/* 9.5–9.7 Clarification Mode */}
          {isClarificationMode && (
            <div style={{ backgroundColor: '#F5F5F7', borderRadius: '12px', padding: '16px 20px', borderLeft: '4px solid #FF9500' }}>
              <p style={{ fontSize: '12px', color: '#6E6E73', marginBottom: '12px' }}>Zatraženo je pojašnjenje. Unesite odgovor (obavezno) i opcionalno dodajte privitke ili poveznicu na opremu.</p>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }}>Odgovor na pojašnjenje *</label>
                <textarea
                  value={clarificationText}
                  onChange={(e) => setClarificationText(e.target.value)}
                  placeholder="Unesite odgovor na pojašnjenje..."
                  rows={4}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {ticket.assetId == null && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6E6E73', marginBottom: '6px' }}>Dodaj poveznicu na opremu (opcionalno)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={clarificationAssetId}
                    onChange={(e) => setClarificationAssetId(e.target.value)}
                    placeholder="ID opreme"
                    style={{ width: '100%', maxWidth: '240px', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}
              {submitUpdatedMutation.isError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {(() => {
                    const err = submitUpdatedMutation.error as { response?: { data?: { error?: string } }; message?: string };
                    return err?.response?.data?.error ?? (err?.message ?? 'Slanje nije uspjelo. Pokušajte ponovo.');
                  })()}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => submitUpdatedMutation.mutate()}
                  disabled={submitUpdatedMutation.isPending || !clarificationValid}
                >
                  {submitUpdatedMutation.isPending ? 'Slanje...' : 'Pošalji odgovor'}
                </Button>
                <Button type="button" variant="danger" onClick={() => setShowWithdrawConfirm(true)}>
                  Povuci prijavu
                </Button>
              </div>

              {showWithdrawConfirm && (
                <div className="mt-4 pt-4 border-t border-yellow-300 space-y-3">
                  <p className="text-sm text-red-700 font-medium">Povući ovu prijavu? Ovo je završno stanje.</p>
                  <textarea
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    placeholder="Razlog (opcionalno)"
                    rows={2}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div className="flex gap-3">
                    <Button type="button" variant="danger" onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending}>
                      {withdrawMutation.isPending ? 'Povlačenje...' : 'Potvrdi povlačenje'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowWithdrawConfirm(false)}>
                      Odustani
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments (non-internal only when read-only) */}
          <section>
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Komentari</h3>
            {visibleComments.length > 0 ? (
              <div className="space-y-3">
                {visibleComments.map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900">{c.authorUserName}</span>
                      <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nema komentara</p>
            )}
            {!readOnly && !isClarificationMode && (
              <div className="mt-4">
                <textarea
                  value={clarificationText}
                  onChange={(e) => setClarificationText(e.target.value)}
                  placeholder="Dodajte komentar..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D2D2D7', borderRadius: '10px', fontSize: '14px', color: '#1D1D1F', outline: 'none', boxSizing: 'border-box' }}
                />
                <Button type="button" onClick={() => addCommentMutation.mutate()} disabled={!clarificationText.trim() || addCommentMutation.isPending} className="mt-2">
                  {addCommentMutation.isPending ? 'Dodavanje...' : 'Dodaj komentar'}
                </Button>
              </div>
            )}
          </section>

          {/* 9.10 History Log — newest first, Performed by (Name + Role) */}
          {ticket.auditLog != null && ticket.auditLog.length > 0 && (
            <section>
              <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Povijest</h3>
              <div>
                {ticket.auditLog.map((entry) => (
                  <div key={entry.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0F0F5' }}>
                    <span style={{ fontSize: '12px', color: '#6E6E73' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                    {' — '}
                    <span style={{ fontSize: '12px', color: '#6E6E73' }}>{formatHistoryAction(entry.actionType)}</span>
                    {entry.prevStatus != null && (
                      <span style={{ fontSize: '12px', color: '#6E6E73' }}> ({entry.prevStatus} → {entry.newStatus})</span>
                    )}
                    <p style={{ fontSize: '13px', color: '#1D1D1F', fontWeight: 500, marginTop: '4px' }}>
                      Izvršio {entry.actorName}{entry.actorRole != null ? ` (${entry.actorRole})` : ''}
                    </p>
                    {entry.comment != null && <p style={{ fontSize: '13px', color: '#3C3C43', marginTop: '4px' }}>&quot;{entry.comment}&quot;</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 9.11 Visibility: SM must not see cost estimation, approval chain, vendor pricing */}
          {/* Sections costEstimation and approvalRecords are intentionally not rendered for SM */}
          </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white shrink-0">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full">
            Natrag
          </Button>
        </div>
      </div>

      {showQRModal && relatedWorkOrders.length > 0 && (
        <QRGenerationModal
          ticketId={ticketId}
          workOrders={relatedWorkOrders}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
