# Maintrix — Handoff dokument

*Zadnje ažurirano: 2026-05-07*

---

## Kratki opis projekta

Maintrix je CMMS (Computerized Maintenance Management System) za retail lance.
Pokriva cijeli tok: SM prijavi kvar → ticket ide kroz approval chain (AM → Director ovisno o iznosu) → vendor dobiva work order → izvodi radove → podnosi cost proposal → AMM odobrava → vendor kreira invoice batch.

**Multi-tenant:** svaka retail firma (company) vidi samo svoje podatke. Vendori vide samo svoje work ordere.

---

## Arhitektura

```
packages/
  backend/   Node.js + Express + Prisma + PostgreSQL + Redis (session)
  frontend/  React + Vite + TanStack Query
```

- **Auth:** Express-session s Redis store. Demo gate — jedan login po roli (nema pravih per-user lozinki). Better Auth planiran za nakon prvog klijenta.
- **Tenant scope:** `req.scopedPrisma` — Prisma extension koji automatski injektira `companyId` / `vendorCompanyId` u sve upite. Detalji u `packages/backend/src/lib/scoped-prisma.ts`.
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`) — backend + frontend lint + typecheck + vitest na svakom push/PR. Sve zeleno.
- **Deploy:** Railway (live demo postoji na domeni).

---

## Stanje main grane (2026-05-07)

Sve 30 PR-ova mergano. **Main je čist, CI zelen, 81 backend test + 9 frontend testova.**

| PR | Što |
|----|-----|
| #6–#18 | ESLint, Windows fix, enumi, thresholds, success overlay, cookie hardening, modali, HR prijevodi, attachment scope |
| #19–#20 | Docs refresh |
| #21 | Centralizirani audit-log writes |
| #22 | SM drafts lista |
| #23 | Session endpoint fix (200 umjesto 401) |
| #24 | AMM WO modal ordering |
| #25 | A11y (aria-describedby) |
| #26–#27 | Auth middleware discovery + STATE checkpoint |
| #28 | Faza 1: scopedPrisma u route handlers (admin, store, pm, asset/categories) |
| #29 | Faza 2: nested-relation scope + kompletna asset migracija |
| #30 | Faza 3: vendor-side scopedPrisma (invoice-batch service + routes) |

---

## Lokalni setup

- Repo: `C:\code\maintrix`
- Postgres + Redis u Dockeru: `docker start maintrix-postgres maintrix-redis`
- `packages/backend/.env`:
  ```
  NODE_ENV=development
  PORT=3000
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maintrix"
  SESSION_SECRET="dev-session-secret"
  REDIS_URL="redis://localhost:6379"
  QR_EXPIRATION_MINUTES=5
  ```
- Pokretanje: `npm run dev` (frontend: localhost:5173, backend: localhost:3000)

**Prije rada:** Docker Desktop → `docker start maintrix-postgres maintrix-redis` → `git pull origin main` → `npm run dev`

---

## Što je namjerno ostalo na globalnom prisma (nije bug)

| Gdje | Zašto |
|------|-------|
| `auth-service.ts` — demo dropdowns | Pre-auth, mora vidjeti sve tenante |
| `admin/routes.ts` — vendorUser/vendorCompany | Cross-company by design (admin upravlja svim vendorima) |
| `ticket-service.ts`, `work-order-service.ts` | Servisni layer prima `companyId` kao param, nema `req`. Reads su zaštićeni parametrom iz sessiona; writes su zaštićeni FK lancima. Migracija bi zahtijevala promjenu potpisa ~3000 redaka — poseban PR. |
| `invoice-batch-service.ts` callback tx | `prisma.$transaction(async tx => {...})` je uvijek unscoped; explicit `vendorCompanyId` u `updateMany` where-clausi čuva ispravnost |
| QR service | SM (INTERNAL) čita workOrder koji je u VENDOR_SCOPE; mora ostati na globalnom prisma |

---

## Otvoreni tehnički dug (prioritiziran)

### Prije prvog plaćenog klijenta

| Stavka | Napomena |
|--------|----------|
| **Better Auth** | Pravi per-user login. Scope definirati s klijentom (samo username/password? email invite? SSO?). Tjedan–nekoliko tjedana ovisno o scope-u. |

### Može čekati (post-first-client v1.1)

| Stavka | Napomena |
|--------|----------|
| Service layer scopedPrisma | `ticket-service.ts` (1607 redaka), `work-order-service.ts` (1330 redaka) — veliki zahvat |
| Pagination | Svuda: tickets, WOs, assets, audit log |
| Test coverage gap | Admin endpointi (deactivate, store/asset CRUD) i invoice-batch download scope |
| AuditLog tenant scope | OR logika (ticketId OR workOrderId) — nije podržana jednostavnim `withNestedWhere` |
| Admin audit trail | `AuditLog` schema podržava samo TICKET/WORK_ORDER; admin CRUD nema trail |
| Drafts brisanje | `DELETE /api/tickets/:id` samo za DRAFT status |
| Cookie `sameSite: strict` | Tek kad frontend + backend dijele custom domenu |
| Strukturirani logovi | pino + log shipping |
| Demo seed strategy | Odlučiti hoće li seed kreirati demo tickete/WO-e |
| Backup procedure | Dokumentirati + testirati |

---

## Ključni fajlovi za razumijevanje sistema

```
packages/backend/src/
  lib/scoped-prisma.ts              # Tenant scope engine — čitati prvo
  middleware/auth.middleware.ts     # requireAuth + scopedPrisma getter
  middleware/scope.middleware.ts    # Lazy getter koji se zakači na req
  config/approval-thresholds.ts    # €1000/€3000 pragovi
  services/
    auth/                          # Login, session, demo gate
    ticket/                        # Glavna poslovna logika ticketa
    work-order/                    # WO lifecycle + vendor flow
    invoice-batch/                 # Vendor invoice batching + PDF
    admin/                         # CRUD za usere, stores, assets
    audit/audit-service.ts         # writeTicketAudit/writeWorkOrderAudit helperi

packages/backend/tests/
  scoped-prisma.test.ts            # 81 testova za tenant scope engine
  work-order-service.scope.test.ts # Multi-tenant scope za WO
  ticket-service.scope.test.ts     # Multi-tenant scope za tickete

packages/backend/prisma/schema.prisma  # Cijeli data model

MAINTRIX_TECHNICAL_DEBT.md         # Lessons learned + bug paterni
```

---

## Prompt za novu sesiju

Paste ovo na početku novog chata:

```
Nastavljam rad na Maintrix projektu (CMMS za retail lance).
Pročitaj STATE.md u C:\code\maintrix — tu je sve što trebaš znati o stanju projekta, arhitekturi i tehničkom dugu.

Kratki kontekst:
- Main grana je čista, CI zelen, 30 PR-ova mergano
- Demo je live na domeni, fokus je bio na nalasku prvog klijenta
- Sljedeće na redu: [UPIŠI ŠTO TREBAŠ — npr. "Better Auth implementacija" ili "novi feature X" ili "bug u Y"]

Repo: C:\code\maintrix
Backend: packages/backend (Node/Express/Prisma)
Frontend: packages/frontend (React/Vite)
```
