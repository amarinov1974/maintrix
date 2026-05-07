# Maintrix — Sažetak sesije i nastavak rada

*Spremljeno: 2026-05-04 (kraj sesije, prebacujem se na novi chat)*

Ovaj dokument služi kao "checkpoint" za nastavak rada u novoj Claude Code sesiji. Paste-aj ga (ili samo putanju do njega) u novi chat da se Claude brzo orijentira.

---

## Trenutno stanje main grane

Posljednji merge: **PR #26** (doc: discovery + 3-phase plan for centralized auth middleware).

Mergani PR-ovi u ovoj seriji rada (PR #6 → #26):

| # | Naslov | Što |
|---|---|---|
| 6 | ci(backend): add ESLint config and lint step | Backend ESLint setup |
| 8 | fix(dev): cross-platform npm run dev + lazy Resend init | Windows kompatibilnost |
| 9 | refactor(backend): replace remaining no-explicit-any | `no-explicit-any: error` |
| 10 | docs(tech-debt): mark every() audit complete | Audit `[].every()` patterna |
| 11 | refactor(frontend): replace currentStatus string literals with enums in modals | 7 modala |
| 12 | refactor(frontend): centralize getStatusBadgeVariant | 11 duplikata u 2 helpera |
| 13 | refactor: centralize approval chain thresholds (€1000 / €3000) | Backend + frontend config |
| 14 | feat(frontend): consistent success overlay on ticket actions across all roles | useSuccessOverlay hook |
| 15 | security(backend): env-aware cookie hardening for session | secure/sameSite per env |
| 16 | feat(frontend): replace native window.alert/confirm with app modals | AlertModal, ConfirmModal, Toast |
| 17 | feat(frontend): translate state transition labels in audit history | formatStatusAny + 19 actions |
| 18 | security(backend): tenant scope check on attachment uploads + downloads + internal-team visibility | + download endpoint, AM/Director attachment lista |
| 19/20 | docs(tech-debt): refresh after PR #6–#18 sweep | Doc-only ažuriranje |
| 21 | refactor(backend): centralize audit-log writes | writeTicketAudit/writeWorkOrderAudit + HR translacije + AMM action reorder |
| 22 | feat(frontend): drafts list page for SM + clickable bucket card | Nova /store-manager/drafts ruta |
| 23 | fix: GET /api/auth/session returns 200 with null instead of 401 | Login screen 401 noise |
| 24 | fix(frontend): AMM WO modal — review-then-decide ordering | Akcije ispod cost proposal review |
| 25 | fix(frontend): use aria-describedby on AMM archive button instead of div title | A11y |
| 26 | docs: discovery + 3-phase plan for centralized auth middleware | Plan za centralizirani auth middleware |
| 27 | docs: STATE.md checkpoint for new-session handoff | Session checkpoint |
| 28 | refactor(backend): phase 1 — adopt scopedPrisma in route handlers | **Faza 1 auth middleware mergana** |

Statistika testova: backend 12 → 69 testova, frontend 0 → 9 testova.

---

## Lokalni setup (status na korisnikovom Windows laptopu)

- Repo na: `C:\code\maintrix` (premjestio s OneDrive-a zbog file watcher problema)
- Postgres + Redis: u Dockeru
  - `maintrix-postgres` (postgres:17, port 5432, password=postgres, db=maintrix)
  - `maintrix-redis` (redis:7, port 6379)
- Native Windows Postgres servis je zaustavljen i postavljen na manual startup (kolizija na portu 5432)
- Baza punjena s pg_dump-om iz Railway-a (live podaci umjesto seeda)
- `.env` u `packages/backend/.env`:
  ```
  NODE_ENV=development
  PORT=3000
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maintrix"
  SESSION_SECRET="dev-session-secret"
  REDIS_URL="redis://localhost:6379"
  QR_EXPIRATION_MINUTES=5
  ```
- Pokretanje: `npm run dev` (jedan terminal — koristi `concurrently`)
- Frontend: `localhost:5173`, backend: `localhost:3000`

**Prije rada:**
1. Pokreni Docker Desktop, čekaj zelenu Whale ikonu
2. `docker start maintrix-postgres maintrix-redis`
3. `cd C:\code\maintrix && git pull origin main` 
4. `npm run dev`

---

## Sljedeći korak: Faza 2 centraliziranog auth middleware-a

**Faza 1 je završena (PR #28, mergano 2026-05-07).** Route layer (admin, asset, store, preventive-maintenance routes) migriran na `req.scopedPrisma`.

### Što je OSTALO na globalnom prisma (namjerno):

- **`auth-service.ts` + `auth/routes.ts` demo dropdowns** — pre-auth, mora vidjeti sve tenante
- **`admin/routes.ts` vendorUser/vendorCompany** — cross-company by design, nije u INTERNAL scope mapi
- **Service layer** (`ticket-service.ts`, `work-order-service.ts`, `preventive-maintenance-service.ts`, itd.) — primaju `companyId` kao parametar, nemaju `req`. Ovo je prirodni kandidat za zaseban refactor (proslijediti `scopedPrisma` kao parametar, ili drugačiji pristup).

### Faza 2 — nested-relation scope (asset, attachment, costEstimation, comment)

Vidi `docs/auth-middleware-discovery.md` za detalje. Treba proširiti `scoped-prisma.ts` s `nestedScope` konceptom za modele gdje scope ide kroz relation (`asset.store.companyId` umjesto direktnog `asset.companyId`).

---

## Otvoreni tech debt nakon ove sesije

Vidi `MAINTRIX_TECHNICAL_DEBT.md` u repu za potpuni popis. Glavne stavke:

**Visoki:**
- Centralized auth middleware — Faza 1 ✅, **Faza 2 sljedeća** (nested-relation scope + service layer)
- CI/CD pipeline (već postoji, eventualno proširenje)
- Better Auth (massive — pravi per-user login, nakon prvog ugovora)
- Pagination svuda

**Srednji:**
- Admin endpointi i invoice batch download — preostali test coverage gap

**Niski:**
- Drafts: delete endpoint za DRAFT (DELETE /api/tickets/:id ili WITHDRAW transition iz DRAFT)
- TS/JS duplikati u frontendu (povremena provjera)

**Operativno:**
- Demo seed strategy
- Backup procedure
- Strukturirani logovi (pino + log shipping)

---

## Kako otvoriti novi chat za nastavak

1. Otvori `claude` u terminalu (ili web interface)
2. Paste-aj prvo: "Pročitaj `STATE.md` u repu pa idi na sljedeći korak (Faza 1 centralized auth middleware-a)."
3. Claude treba pročitati ovaj fajl + `docs/auth-middleware-discovery.md` i krenuti.

Ili kraće: "Nastavljam rad na Maintrix tech debtu. Sljedeći korak je Faza 1 centraliziranog auth middleware-a — vidi `docs/auth-middleware-discovery.md` i `STATE.md`."

---

## Otvorene grane na GitHub-u (mogu se obrisati)

Sve mergane grane se mogu obrisati. GitHub UI: https://github.com/amarinov1974/maintrix/branches → klik na kantu pored svake grane.
