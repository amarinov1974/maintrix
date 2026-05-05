# Maintrix — Tehnički dug i lessons learned

*Zadnje ažurirano: 2026-05-04 (cookie hardening — env-aware secure/sameSite)*

Ovaj dokument prati tehničke odluke koje su odgođene, bug paterne koji se ponavljaju, i konkretne incidente koji su naučili nešto vrijedno za buduće odluke.

---

## Lessons learned (incident-based)

### 2026-05-01: Vendor company scope regresija

**Što se dogodilo:**

Commit `fdf56f7` (“security: add company scope filter to work order list endpoints”) primijenio je `where.ticket.companyId = session.companyId` na listanje WO-a **bez razlikovanja INTERNAL i VENDOR userTypea**. Posljedica: vendor korisnici (S1/S2/S3) dobivali su praznu listu WO-a jer je filter tražio WO čiji ticket pripada companyju s ID-om vendor firme — što logički nikad nije moguće (ticketi pripadaju retail firmama, ne vendorima).

**Kako je otkriveno:**

Slučajno, kroz screenshot review S1 vendor stranica. Tri vendor korisnika sva tri imala 0 WO svuda. Uočeno tek danima nakon merge-a.

**Što je trebalo spriječiti incident:**

Test koji simulira vendor login, kreira WO, i provjeri da vendor vidi taj WO. Da je takav test postojao u CI pipelineu, security commit `fdf56f7` bi razbio test i nikad ne bi došao do `feat/croatian-ui` grane.

**Pouka:**

Multi-tenant scope filtri moraju imati testove koji pokrivaju sve userType varijante (INTERNAL i VENDOR). Filter koji se primjenjuje uniformno preko cijelog codebasea bez branch-a po userType je inherentno opasan u sustavu gdje vendor i retail imaju različitu semantiku scope-a.

**Šira implikacija:**

Sljedeći put kad se postavi pitanje “jesu li mi testovi vrijedni vremena”, sjeti se da je vendor flow bio **potpuno mrtav** dok smo to slučajno otkrili. U produkciji s plaćenim klijentom ovo bi bio incident koji se rješava pod pritiskom, ne arhitektonska odluka donesena s mirom.

**Status:** popravljeno commitom `ab8c49c` (2026-05-01).

---

## Otvoreni tehnički dug

### Visoki prioritet (prije prvog plaćenog klijenta)

- [ ] **Test coverage na auth i multi-tenant scope filtre.** Minimalno:
  - vendor vidi samo svoje WO-e — pokriveno (`work-order-service.scope.test.ts`)
  - internal user vidi samo WO-e svoje retail firme — pokriveno (`work-order-service.scope.test.ts`)
  - cross-tenant access (vendor pokušava dohvatiti WO druge vendor firme) je blokiran — pokriveno (`work-order-service.scope.test.ts`)
  - get-by-id varijante svih navedenih — pokriveno (WO + ticket, `cce5962`)
  - ticket scope (listTickets/getTicket po `companyId`, cross-tenant blokiran) — pokriveno (`ticket-service.scope.test.ts`, `cce5962`)
  - preostalo: auth middleware testovi (session/role guards), attachment download scope, admin endpointi
- [x] **Vitest/PostCSS config ne radi lokalno.** ~~Testovi se trenutno ne mogu pokrenuti zbog BOM/JSON parse errora u PostCSS configu.~~ Riješeno (`4f468fd`). Stvarni uzrok bio je UTF-8 BOM (`EF BB BF`) na početku **root `package.json`**, ne PostCSS configa — BOM je razbijao npm-ov JSON parser pri workspace resolution-u. Frontend vitest sada starta čisto (`passWithNoTests: true` dok se ne dodaju testovi).
- [x] **WO scope testovi nisu zapravo trčali u CI/lokalno.** Testovi iz `ab8c49c` postojali su, ali `vi.mock('../src/config/database.js', ...)` referencirao je top-level `prismaMock` koji se zbog vitest hoistinga koristio prije inicijalizacije — cijela suite je collapsala s `ReferenceError` i 0 testova se izvršavalo. Riješeno prelaskom na `vi.hoisted()` (`cce5962`). Sada 15/15 prolazi.
- [ ] **Centralizirani authorization middleware.** Trenutno svaki endpoint mora ručno primijeniti `companyId` filter. To je krhko — jedan zaboravljen filter = tenant data leak ili (kao u ovom incidentu) potpuno mrtav flow. Treba layer koji forsira scope automatski.
- [ ] **CI/CD pipeline.** GitHub Actions: lint, typecheck, prisma migrate validate, vitest run. Bez ovoga svaki push u `main` je rizik.
- [ ] **Better Auth (real per-user login)** prije prvog ugovora. Demo gate ostaje za demo deployment.
- [ ] **Pagination svuda** (tickets, WOs, assets, audit log).
- [ ] **Cookie hardening + custom domena** (`sameSite: strict`). Djelomično (2026-05-04): session cookie sad koristi `getCookieOpts()` na `SessionManager`-u, koji vraća env-aware konfiguraciju (`secure: false / sameSite: 'lax'` u devu zbog Vite proxy-a, `secure: true / sameSite: 'none'` u produkciji zbog cross-site Railway subdomena). Prije je bilo hardkodirano `secure: true, sameSite: 'none'` što je razbijalo dev cookie postavku. Cookie `maxAge` sad reflektira `SESSION_TIMEOUT_MINUTES` env var. **Preostaje:** kad frontend i backend dijele custom domenu, prebaciti `sameSite` na `'strict'` za pun CSRF zaštitu.

### Srednji prioritet

- [x] **Centralizirati ticket status stringove** u `TicketStatus` enum/const. ~~Trenutno hardkodirani Title-Case stringovi u frontendu (npr. `'Ticket Cost Estimation Approved'`) nisu zaštićeni od promjena formata u backendu.~~ Riješeno (2026-05-04): PR #11 zamijenio je literale u 7 detail modala; ovaj follow-up zatvorio je preostale slučajeve — 11 duplikatskih `getStatusBadgeVariant` funkcija (substring `.includes('Approved')` i sl.) ekstrahirane u dva imena u `utils/formatters.ts` (`getStatusBadgeVariant` za default-default semantiku, `getInFlightStatusBadgeVariant` za default-warning), `'Draft'` literali zamijenjeni s `TicketStatus.DRAFT`, lokalni `terminalStatuses` array u `StoreManagerDashboard` zamijenjen s `TerminalTicketStatuses`. Sve usporedbe sad idu kroz enum konstante.
- [x] **Centralizirati approval chain pragove.** ~~Trenutno se €1.000 i €3.000 pojavljuju na backendu (`approval-chain-service`) i frontendu (`DirectorDashboard`, `AreaManagerDashboard`, `ApprovalChainInfo` modal). Razmotriti API endpoint ili shared config.~~ Riješeno (2026-05-04): konstante u `packages/backend/src/config/approval-thresholds.ts` i mirror file u `packages/frontend/src/config/approval-thresholds.ts` (s helperima `formatEuro`, `getApprovalChainLabel`). Backend approval-chain-service, frontend DirectorTicketDetailModal, DirectorDashboard, AreaManagerDashboard i ApprovalChainInfo svi sad čitaju iz centralnih konstanti. Backend test `approval-chain.test.ts` (5 testova) pokriva routing logiku i tvrdi vrijednosti `AM_MAX=1000` / `DIRECTOR_MAX=3000` da uhvatimo divergenciju s frontendom kroz code review.
- [x] **Audit svih `every()` poziva u backendu** — pregledano 2026-05-04. Backend ima 2 `.every()` instance (oba u `ticket-service.ts`, linije 1445 i 1522 — `archiveTicket` i `tryAutoArchiveTicketIfAllWorkOrdersComplete`); obje su već zaštićene `length === 0` guardom prije poziva. Bonus pregled frontenda (4 instance: `S2WorkOrderDetailModal`, `CheckOutModal`, `S3WorkOrderDetailModal`, `AMMTicketDetailModal`) — sve guard-ane (`length > 0 &&`, `hasWorkOrders &&`, ili tip koji konstrukcijski uvijek ima ≥1 element). Nema preostalog `every([]) === true` rizika u repu.
- [ ] **Audit log discipline review.** Verificirati da se audit unosi pišu na svim mutacijskim endpointima. Razmotriti helper funkciju ili Prisma extension koji forsira audit.
- [ ] **Attachment serving authorization audit.** Provjeriti da download ruta provjerava session + scope nad parent ticketom/WO-om.
- [ ] **State transition labels cure u UI Povijesti.** Vendor i internal korisnici vide tehničke labele tipa `ASSIGN TECHNICIAN`, `QR GENERATED (ACCEPTED_TECHNICIAN_ASSIGNED → ACCEPTED_TECHNICIAN_ASSIGNED)`, `CHECKIN (ACCEPTED_TECHNICIAN_ASSIGNED → Service In Progress)`. Treba mapping tablica koja prevodi action + status par u human-friendly HR string, ili backend šalje već lokaliziran log entry. Otkriveno u screenshot reviewu 2026-05-02.
- [ ] **Native browser alert za check-in potvrdu.** Trenutno koristi `window.confirm`/`alert` koji se ne može prevesti (`"Your arrival on site has been registered. You can now start work."`). Zamijeniti app-level toast/modal porukom u HR.
- [x] **Audit: hardkodirani `currentStatus` / `ticket.currentStatus` string literali (2026-05-04).** ~~Nekoliko modala i komponenti još uspoređuju statuse s literalima umjesto `WorkOrderStatus` / `TicketStatus` enuma — rizik istog razreda kao bug na S3 dashboardu ako stringovi divergiraju.~~ Riješeno (2026-05-04): zamijenjeno svih ~30 literala u 7 modala (`QRGenerationModal`, `S3WorkOrderDetailModal`, `AMMWorkOrderDetailModal`, `AMMTicketDetailModal`, `AMTicketDetailModal`, `DirectorTicketDetailModal`, `TicketDetailModal`). Bonus: `wo.currentStatus?.includes('Created')` u `AMMTicketDetailModal:359` bio je dead branch (nijedan WO status ne sadrži "Created"), zamijenjen točnom usporedbom s `WorkOrderStatus.CREATED`.

### Niski prioritet (UX / kozmetika / accessibility)

- [ ] **Skrolanje unutar modala je nezgrapno.** “Detalji radnog naloga” i drugi veliki modali zahtijevaju puno skrolanja gore-dolje da bi se vidio aktivni gumb. Sticky action bar ili pametniji layout pri sljedećem redesignu modala. Otkriveno 2026-05-02.
- [ ] **Accessibility prolaz na disabled gumbima** — tooltip preko `<div>` → `aria-label`/`aria-describedby` pattern.
- [ ] **TS/JS duplikati u frontendu** — već većinski očišćeno u 2026-04-29 sesiji, ali povremeno provjeriti.

### Operativno

- [ ] **Demo seed strategy** — odluka: hoće li seed kreirati demo WO-e i tickete, ili to ostaje “ručno kreiraj kroz UI”? Trenutno (od 2026-04-27) seed ne kreira tickete/WO-e. Privremena odluka 2026-05-02: ostaje na ručno kreiranje kroz UI.
- [ ] **Backup procedure dokumentirana + jednom restano testirana.**
- [ ] **Strukturirani logovi (pino + log shipping).**

---

## Domenske odluke (decided / closed)

- **Izvještaj rada — fleksibilnost potvrđena (2026-05-03).** Domenska odluka: izvještaj je digitalna replika papirnog radnog naloga, slobodan unos je feature. Strukturirana validacija sadržaja se ne uvodi. Polje količina prebačeno s number na text input, dodano brisanje pojedinog reda stavke.

---

## Bug paterni koje vrijedi pamtiti

### Pattern: `Array.every([])` vraća `true`

JavaScript zamka. `[].every(predicate)` je uvijek `true`, neovisno o predikatu. Posljedica u `archiveTicket`: ticket bez WO-a prolazio je validaciju “svi WO terminalni”.

**Kako spriječiti:** kad pišeš validaciju “svi X moraju biti Y”, **uvijek dodaj eksplicitnu provjeru `array.length > 0` prvo**.

```typescript
// LOŠE
if (!items.every(isValid)) throw new Error(...);

// DOBRO
if (items.length === 0) throw new Error('No items');
if (!items.every(isValid)) throw new Error('Some invalid');
```

### Pattern: Uniformni multi-tenant filter bez userType branchinga

Kad različite role imaju različitu semantiku tenant scope-a (npr. INTERNAL gleda na `ticket.companyId`, VENDOR gleda na `workOrder.vendorCompanyId`), filter **mora** imati `if/else` po userType. Uniforman filter će ili (a) napraviti sigurnosnu rupu, ili (b) razbiti jedan od flow-ova kao u 2026-05-01 incidentu.

### Pattern: Hardkodirani string statusi u frontendu

Stringovi tipa `'Ticket Cost Estimation Approved'` u frontend kodu su tihi failure mode — ako backend promijeni format (SCREAMING_SNAKE umjesto Title Case), frontend tiho prestane raditi bez ikakve TypeScript greške. Centralizirati u enum/const.

### Pattern: Engleski stringovi koji cure u UI tijekom prijevoda

Pri prijevodu velikih dijelova UI-a, lako se previde:

- naslovi modala (npr. “Work Order Detail”)
- labeli polja (`Address:`, `Category:`, `Asset:`)
- gumbi unutar specifičnih flow-ova (`Back to dashboard`, “Generate another”)
- log/history entries koji se generiraju runtime
- native browser dialozi (`window.confirm`, `window.alert`)

**Kako spriječiti:** pri prijevodu, prolaziti end-to-end flow po roli, ne samo statički pretraživati po string keywordima. History i runtime-generated stringovi se vide tek kad nešto napraviš u UI-u.

---

## Vodeći principi (utvrđeni iz iskustva)

1. **Testovi nisu luksuz, oni su osiguranje.** Svaki put kad se pojavi regresija koju bi test uhvatio, dokumentiraj ga ovdje.
2. **Multi-tenant je kompleksniji nego što izgleda** — vendor i retail nisu isti tip “tenanta”. Tretirati ih kao različite first-class concepts u svakom scoping layeru.
3. **Bug fix bez root-cause analize je samo simptom-fix.** Cursor je dobar u brzim popravcima — natjeraj ga prvo na dijagnostiku.
4. **Unstaged izmjene su tihi izvor problema.** Working tree redovito provjeri i discardaj/commitaj eksplicitno.
5. **End-to-end screenshot review otkriva što statička analiza ne vidi.** Vendor scope regresija i propušteni prijevodi otkriveni su tek kroz prolazak kroz pravi flow, ne kroz pregled koda.
