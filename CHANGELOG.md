## Session: 2026-04-30 — Asset Management Module

### Overview
Asset management module implemented with categories, depreciation
and full demo asset database.

### Changes

#### 1. Asset schema expansion (schema.prisma)
- Added AssetCategory model with depreciation rate per company
- Expanded Asset model: name, serialNumber, manufacturer, model,
  purchaseDate, warrantyExpiry, purchaseValue, status, categoryId
- Added AssetStatus enum: ACTIVE, FAULTY, IN_SERVICE, DECOMMISSIONED

#### 2. Prisma migrations fixed
- Added migrations to Git (were previously in .gitignore)
- Fixed production database migration state manually
- Migrations now deploy correctly on Railway

#### 3. Asset API endpoints (asset/routes.ts)
- GET /api/assets — list with filtering (store, category, status, search)
- GET /api/assets/categories — list categories for company
- GET /api/assets/:id — single asset with book value calculation
- Book value calculated from purchase value and depreciation rate

#### 4. Asset List Page (AssetListPage.tsx)
- Route: /assets
- Accessible by: AM, AMM, D, C2, BOD, ADMIN
- Filters: search, store, category, status
- Columns: name, manufacturer/model, category, store, serial number,
  warranty expiry (with ⚠️ for expired), purchase value, book value, status

#### 5. Demo asset database (seed.ts)
- 12 asset categories with depreciation rates
- 240 realistic demo assets (60 per store × 4 stores)
- Realistic manufacturers: Daikin, OTIS, Schneider Electric, Bosch, etc.

#### 6. Redis reconnect strategy (session-manager.ts)
- Added retryStrategy for Redis connection drops
- Backend now reconnects automatically after Railway hibernation

### Known TODO (next session)
- [ ] Add Assets link to AMM/AM/Director dashboards
- [ ] Asset detail page (service history, documents)
- [ ] Asset management in Admin panel (add/edit/deactivate)
- [ ] Link assets to tickets more prominently
- [ ] Pagination for large asset lists

## Session: 2026-04-29 — Security Review, C3→ADMIN rename, Admin Panel

### Overview
Security review and fixes, C3 role renamed to ADMIN, full admin panel implemented.

### Changes

#### 1. Rate limiter trust proxy fix (app.ts)
- Added app.set('trust proxy', 1) for correct IP detection on Railway
- Rate limiter now correctly identifies users by real IP

#### 2. Cleanup
- Deleted old branches: phase-1-security, phase-2-fixes
- Deleted 72 JS duplicate files from frontend (kept only TS/TSX)

#### 3. Company scope filter on get by ID (ticket-service.ts, work-order-service.ts)
- getTicket now filters by companyId from session
- getWorkOrder now filters by companyId from session
- Company A cannot access Company B tickets by guessing ID

#### 4. Security review fixes
- REDIS_URL and RESEND_API_KEY added to Zod env schema
- SESSION_SECRET fallback removed from 3 locations (session-manager.ts, gate.ts, auth/routes.ts)
- Redis error handler added
- CSRF middleware changed to exact match instead of startsWith
- Redis SCAN instead of KEYS in getActiveSessions
- Hardcoded 'Retail A' removed from users/internal endpoint
- Double DB query in notifyNewOwner() optimized to single query

#### 5. C3 → ADMIN rename
- InternalRole enum: C3 → ADMIN
- Prisma migration: 20260429082825_rename_c3_to_admin
- All frontend and backend references updated
- Folder renamed: pages/c3 → pages/admin
- Component renamed: C3Dashboard → AdminDashboard
- Route changed: /c3 → /admin
- Layout label changed: 'Maintenance Admin' → 'System Administrator'
- Seed updated: role C3 → ADMIN
- Seed email updated: yahoo.com → gmail.com

#### 6. Admin Panel — Backend (services/admin/routes.ts)
- New module: /api/admin/*
- ADMIN role guard on all routes
- GET/POST/PUT/DELETE /api/admin/users/internal
- GET/POST/PUT/DELETE /api/admin/users/vendor
- GET/POST/PUT/DELETE /api/admin/stores
- GET /api/admin/vendor-companies
- GET /api/admin/regions
- Soft delete (active: false) instead of hard delete

#### 7. Admin Panel — Frontend (pages/admin/AdminDashboard.tsx)
- 3 tabs: Internal Users, Vendor Users, Stores
- Add/Edit/Activate/Deactivate for all three
- Modal edit forms
- Company-scoped data

### Known TODO (next session)
- [ ] Custom domain (buy and configure)
- [ ] Cookie hardening after custom domain (sameSite: strict)
- [ ] Real login per user (Better Auth) — when first client arrives
- [ ] KPI dashboard for management
- [ ] Export Excel/PDF
- [ ] SLA tracking
- [ ] Design improvements
- [ ] Super Admin panel (for managing multiple clients)

# CMMS System — Changelog

## Session: 2026-04-27 — Phase 2 Fixes & Email Notifications

### Pregled
Popravci gate autentikacije, sigurnosni dodaci i implementacija email notifikacija.

### Promjene

#### 1. Gate auth popravak
- Gate token se sprema u localStorage umjesto cookija
- Radi na svim browserima uključujući Chrome incognito i Safari
- x-gate-token header se šalje na svaki request

#### 2. CSRF middleware na backendu
- Validacija x-requested-with headera na svim POST/PUT/DELETE requestima
- Skip za QR endpoint i gate-login

#### 3. Attachment MIME type validacija
- Whitelist: JPG, PNG, GIF, WebP, PDF, Word, Excel

#### 4. Sentry error tracking
- @sentry/node integriran u backend
- SENTRY_DSN environment varijabla dodana na Railway

#### 5. Email notifikacije
- Resend biblioteka integrirana
- notifyNewOwner() šalje email svakom novom vlasniku tiketa ili radnog naloga
- Email sadrži ime korisnika, akciju i link na dashboard
- Email polje dodano na InternalUser i VendorUser (Prisma migracija)
- Pokriva sve tranzicije u ticket-service.ts i work-order-service.ts

#### 6. Seed skripta
- Uklonjena automatska kreacija tiketa
- railway.json popravljen — seed se više ne pokreće automatski pri deployu
- Seed treba pokrenuti ručno: npm run db:seed

#### 7. Maintrix rebranding
- GitHub repo: cmms-system → maintrix
- Lokalni folder: cmms-system → maintrix
- Railway projekt: cooperative-cooperation → Maintrix
- package.json: @cmms → @maintrix

### Novi paketi
- @sentry/node
- resend

### Environment varijable na Railway
- SENTRY_DSN
- RESEND_API_KEY
- GATE_USERNAME, GATE_PASSWORD

### Poznati TODO (sljedeća sesija)
- [ ] Rate limiter trust proxy fix (X-Forwarded-For warning u logovima)
- [ ] Pravi login sustav po korisniku (Better Auth) — kad dođe prvi klijent
- [ ] Deep link nakon logina — kad bude pravi login
- [ ] Custom domena (kupiti i postaviti)
- [ ] Cookie hardening kad se postavi custom domena (sameSite: strict)
- [ ] Dizajn poboljšanja
- [ ] Obrisati stare brancheve na GitHubu (phase-1-security, phase-2-fixes)
- [ ] Ažurirati CHANGELOG.md u Maintrix Claude projektu

## Session: 2026-04-25 — Phase 1 Security Sprint

### Pregled
Neovisna arhitektonska procjena i implementacija kritičnih sigurnosnih poboljšanja.

### Promjene

#### 1. Helmet middleware (app.ts)
- Dodан `helmet` middleware kao prvi middleware u lancu
- Dodaje sigurnosne HTTP headere na sve odgovore
- Štiti od XSS, clickjacking i drugih web napada

#### 2. Rate limiting na auth rutama (app.ts)
- Dodан `express-rate-limit` na `/api/auth/*` rute
- Max 20 zahtjeva u 15 minuta po IP adresi
- Štiti od brute-force napada na login

#### 3. Demo endpoint zaštita (app.ts)
- `/api/demo/delete-all-tickets` sada vraća 404 u produkciji
- Samo dostupno u development okruženju
- Spriječava brisanje podataka od neautoriziranih korisnika

#### 4. Redis session store (session-manager.ts)
- Zamijenjen in-memory Map s Redis store (ioredis)
- Sessioni preživljavaju restart backend servisa
- Redis servis dodan na Railway
- REDIS_URL environment varijabla dodana u backend servis
- Async/await dodan u auth.middleware.ts i auth-service.ts

#### 5. Company scope filter (ticket i work-order servisi)
- `listTickets` sada uvijek filtrira po `companyId` iz sessije
- `listWorkOrders` sada uvijek filtrira po `companyId` iz sessije
- Firma A ne može vidjeti podatke Firme B
- Preduvjet za multi-tenant SaaS model

#### 6. CSRF zaštita (client.ts i client.js)
- Dodан `x-requested-with: XMLHttpRequest` header na sve API zahtjeve
- Štiti od Cross-Site Request Forgery napada
- Kompatibilno s iOS/Safari cross-site cookie handling

#### 7. Gate autentikacija aktivirana
- GATE_USERNAME i GATE_PASSWORD postavljeni na Railway
- Gate login ekran prikazuje se prije demo logina
- Neautorizirani pristup blokiran

### Novi paketi
- `helmet` ^8.1.0
- `express-rate-limit` ^8.4.1
- `ioredis` ^5.10.1

### Environment varijable dodane na Railway
- `REDIS_URL` — linked iz Redis servisa
- `GATE_USERNAME` — gate korisničko ime
- `GATE_PASSWORD` — gate lozinka

### Poznati TODO (sljedeća sesija)
- [ ] CSRF middleware na backendu (validacija x-requested-with headera)
- [ ] SESSION_SECRET provjera pri startu aplikacije
- [ ] Attachment upload MIME type validacija
- [ ] Sentry error tracking
- [ ] Email notifikacije (Resend)
- [ ] Cookie hardening kad se postavi custom domena (sameSite: strict)
- [ ] Obrisati stari phase-1-security branch na GitHubu

### Arhitektonske odluke
- Redis odabran umjesto express-session zbog jednostavnosti i direktne kontrole
- CSRF zaštita kroz custom header umjesto sameSite:strict zbog iOS/Safari kompatibilnosti
- Gate auth aktiviran kroz environment varijable — nema code promjena
- Company scope filter dodan samo na list endpointe — get by ID još nije pokriven

### Tehnički dug identificiran
- TS i JS duplikati u frontend stablu (client.ts i client.js, EntryScreen.tsx i .js)
- Hardcoded company name uklonjen iz users/internal endpointa
- Demo endpoint još postoji u kodu ali je zaštićen environment checkom
