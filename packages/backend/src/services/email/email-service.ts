/**
 * Email Service
 * Sends transactional emails via Resend
 */
import { Resend } from 'resend';
import { prisma } from '../../config/database.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'onboarding@resend.dev';
const APP_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.log('[Email] RESEND_API_KEY not set, skipping email');
    return;
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    console.log(`[Email] Sent: ${subject} → ${to}`);
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
  }
}

export async function notifyNewOwner(params: {
  entityType: 'TICKET' | 'WORK_ORDER';
  entityId: number;
  newOwnerId: number;
  ownerType: 'INTERNAL' | 'VENDOR';
  context?: string;
}): Promise<void> {
  const { entityType, entityId, newOwnerId, ownerType, context } = params;

  let email: string | null = null;
  let name: string | null = null;
  let dashboardUrl = APP_URL;

  if (ownerType === 'INTERNAL') {
    const user = await prisma.internalUser.findUnique({
      where: { id: newOwnerId },
      select: { email: true, name: true, role: true },
    });
    email = user?.email ?? null;
    name = user?.name ?? null;
    if (!email) return;
    const roleDashboards: Record<string, string> = {
      SM: '/store-manager',
      AM: '/area-manager',
      AMM: '/amm',
      D: '/director',
      C2: '/director',
      BOD: '/director',
      ADMIN: '/admin',
    };
    dashboardUrl = APP_URL + (roleDashboards[user?.role ?? ''] ?? '/');
  } else {
    const user = await prisma.vendorUser.findUnique({
      where: { id: newOwnerId },
      select: { email: true, name: true, role: true },
    });
    email = user?.email ?? null;
    name = user?.name ?? null;
    if (!email) return;
    const roleDashboards: Record<string, string> = {
      S1: '/vendor/s1',
      S2: '/vendor/s2',
      S3: '/vendor/s3',
    };
    dashboardUrl = APP_URL + (roleDashboards[user?.role ?? ''] ?? '/');
  }

  const entityLabel = entityType === 'TICKET' ? 'Tiket' : 'Radni nalog';
  const subject = `[Maintrix] ${entityLabel} #${entityId} — dodijeljen vam je`;
  const html = `
    <h2>${entityLabel} #${entityId} je dodijeljen vama</h2>
    ${name ? `<p>Pozdrav, <strong>${name}</strong>!</p>` : ''}
    ${context ? `<p><strong>Akcija:</strong> ${context}</p>` : ''}
    <p>
      <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
        Otvori ${entityLabel} #${entityId}
      </a>
    </p>
    <p>Ili kopirajte link: <a href="${dashboardUrl}">${dashboardUrl}</a></p>
    <hr/>
    <p style="color: #666; font-size: 12px;">Ovu poruku ste primili jer ste novi vlasnik ovog zadatka u Maintrix sustavu.</p>
  `;

  await sendEmail(email, subject, html);
}
