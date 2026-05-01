/**
 * Ticket Detail (Store Manager View) — Section 9
 * Read-only block, Clarification mode when owner, visibility rules, history log.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { workOrdersAPI } from '../../api/work-orders';
import { useSession } from '../../contexts/SessionContext';
import { Button, Badge } from '../../components/shared';
import { TicketStatus } from '../../types/statuses';
import { QRGenerationModal } from './QRGenerationModal';
import { formatCategory, formatHistoryAction } from '../../utils/formatters';

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
      onClose();
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => ticketsAPI.withdraw(ticketId, withdrawReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
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
  const canSubmitDraft = isOwner && ticket.currentStatus === 'Draft';
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

  const submittedAt = ticket.submittedAt ?? (ticket.currentStatus !== 'Draft' ? ticket.createdAt : null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* 9.1 Screen Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Detalji prijave</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Prijava #{ticket.id}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={onClose}>
              Natrag
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
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
            <h2 className="font-semibold text-gray-900">Informacije o prijavi</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span><strong>ID prijave:</strong> {ticket.id}</span>
                {submittedAt != null && (
                  <span><strong>Datum i vrijeme prijave:</strong> {new Date(submittedAt).toLocaleString()}</span>
                )}
                <span><strong>Kreirao:</strong> {ticket.createdByUserName}{ticket.createdByUserRole != null ? ` (${ticket.createdByUserRole})` : ''}</span>
                <span><strong>Trenutni vlasnik:</strong> {ticket.currentOwnerUserName != null ? `${ticket.currentOwnerUserName}${ticket.currentOwnerUserRole != null ? ` (${ticket.currentOwnerUserRole})` : ''}` : '—'}</span>
                <span><strong>Poslovnica:</strong> {ticket.storeName}</span>
                <span><strong>Kategorija:</strong> {formatCategory(ticket.category)}</span>
                <span>
                  <strong>Hitnost:</strong>{' '}
                  {ticket.urgent ? <Badge variant="urgent">HITNO</Badge> : <Badge variant="default">Nije hitno</Badge>}
                </span>
                <span><strong>Trenutni status:</strong> <Badge variant={ticket.currentStatus.includes('Approved') ? 'success' : 'warning'}>{ticket.currentStatus}</Badge></span>
              </div>
              <div>
                <strong className="text-sm text-gray-600">Originalni opis problema (zaključano)</strong>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{ticket.originalDescription ?? ticket.description}</p>
              </div>
            </div>
          </section>

          {/* Related Work Orders — SM: list and navigate to QR (one WO direct, multiple require selection) */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Povezani radni nalozi</h3>
            {relatedWorkOrders.length === 0 ? (
              <p className="text-sm text-gray-500">Nema radnih naloga za ovu prijavu.</p>
            ) : (
              <>
                <ul className="bg-gray-50 rounded-lg p-4 space-y-2 mb-3">
                  {relatedWorkOrders.map((wo) => (
                    <li key={wo.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">Radni nalog #{wo.id}</span>
                      <Badge variant="default">{wo.currentStatus}</Badge>
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
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                {ticket.assetId != null && <span><strong>ID opreme:</strong> {ticket.assetId}</span>}
                {ticket.assetDescription != null && (
                  <p className="mt-1"><strong>Opis:</strong> {ticket.assetDescription}</p>
                )}
              </div>
            </section>
          )}

          {/* 9.3 Attachments (view/download only; add-only in clarification) */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Privici</h3>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-3">Ova prijava je u nacrtu. Pošaljite je u obradu.</p>
              <Button type="button" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Slanje...' : 'Pošalji prijavu'}
              </Button>
            </div>
          )}

          {/* 9.5–9.7 Clarification Mode */}
          {isClarificationMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-yellow-800 font-medium">Zatraženo je pojašnjenje. Unesite odgovor (obavezno) i opcionalno dodajte privitke ili poveznicu na opremu.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odgovor na pojašnjenje *</label>
                <textarea
                  value={clarificationText}
                  onChange={(e) => setClarificationText(e.target.value)}
                  placeholder="Unesite odgovor na pojašnjenje..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              {ticket.assetId == null && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dodaj poveznicu na opremu (opcionalno)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={clarificationAssetId}
                    onChange={(e) => setClarificationAssetId(e.target.value)}
                    placeholder="ID opreme"
                    className="w-full p-3 border border-gray-300 rounded-lg max-w-xs"
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
                    className="w-full p-3 border border-gray-300 rounded-lg"
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
              <h3 className="font-semibold text-gray-900 mb-2">Komentari</h3>
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
                  className="w-full p-3 border border-gray-300 rounded-lg"
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
              <h3 className="font-semibold text-gray-900 mb-2">Povijest</h3>
              <div className="space-y-2">
                {ticket.auditLog.map((entry) => (
                  <div key={entry.id} className="text-sm bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-600">{new Date(entry.createdAt).toLocaleString()}</span>
                    {' — '}
                    <span className="font-medium">{formatHistoryAction(entry.actionType)}</span>
                    {entry.prevStatus != null && (
                      <span className="text-gray-600"> ({entry.prevStatus} → {entry.newStatus})</span>
                    )}
                    <p className="mt-1 text-gray-600">
                      Izvršio {entry.actorName}{entry.actorRole != null ? ` (${entry.actorRole})` : ''}
                    </p>
                    {entry.comment != null && <p className="text-gray-600 mt-1">&quot;{entry.comment}&quot;</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 9.11 Visibility: SM must not see cost estimation, approval chain, vendor pricing */}
          {/* Sections costEstimation and approvalRecords are intentionally not rendered for SM */}
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
