# Centralized Authorization Middleware — Discovery & Plan

*Pripremljeno: 2026-05-04 za tech debt stavku "Centralizirani authorization middleware"*

## Stanje na main (početna točka)

### Što već postoji (otkriveno tijekom analize)

`packages/backend/src/lib/scoped-prisma.ts` (158 linija) — **gotov, mature kostur**:

- **Prisma extension** koji automatski ubacuje `companyId` / `vendorCompanyId` u sve operacije nad scopirated modelima.
- Sve standardne operacije pokrivene: `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy`, `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany`.
- Reads / updates / deletes: scope key se ubacuje u `where`.
- Creates / upserts: scope key se ubacuje u `data`, prepisuje sve što caller pošalje (sprečava cross-tenant planting).
- **Proxy blokira pristup** modelima koji nisu u scope mapi za trenutni session userType — vendor handler ne može slučajno raditi `req.scopedPrisma.ticket.*`, baca runtime grešku.

Trenutna scope mapa:

| userType | Model | Scope key |
|---|---|---|
| INTERNAL | `ticket` | `companyId` |
| INTERNAL | `store` | `companyId` |
| INTERNAL | `region` | `companyId` |
| INTERNAL | `internalUser` | `companyId` |
| INTERNAL | `assetCategory` | `companyId` |
| INTERNAL | `preventiveMaintenancePlan` | `companyId` |
| VENDOR | `workOrder` | `vendorCompanyId` |
| VENDOR | `invoiceBatch` | `vendorCompanyId` |
| VENDOR | `vendorUser` | `vendorCompanyId` |
| VENDOR | `vendorPriceListItem` | `vendorId` |
| VENDOR | `preventiveMaintenancePlan` | `vendorCompanyId` |

`packages/backend/src/middleware/scope.middleware.ts` (38 linija):

- Wired globalno u `app.ts` (line 51).
- Stavlja `req.scopedPrisma` kao **lazy getter** — kreira klijenta tek kad ga handler pročita, nakon što je `requireAuth` postavio `req.session`.
- 24 testa u `tests/scoped-prisma.test.ts` pokrivaju logiku ekstenzije.

### Stanje adopcije: **0%**

```bash
$ grep -rn "scopedPrisma" packages/backend/src --include="*.ts" \
    | grep -v "scope.middleware\|scoped-prisma\.ts\|tests"
packages/backend/src/app.ts:50:// Attach req.scopedPrisma when a valid session is present (after requireAuth in each router)
```

Nijedan route handler ne koristi `req.scopedPrisma`. Svi i dalje pozivaju globalni `prisma` s ručnim `where: { companyId: req.session!.companyId, ... }` filterima.

**Odjeljenost između onoga što je izgrađeno i onoga što je u upotrebi je glavni nalaz.** Risk od neke od regresija tipa `fdf56f7` (vendor scope incident iz lessons learned) ostaje točno onakav kakav je bio prije nego što je scopedPrisma napisan.

### Manualni filteri u kodu

| Fajl | Rough count `companyId` / `vendorCompanyId` u `where` |
|---|---|
| `services/admin/routes.ts` | 16 |
| `services/work-order/work-order-service.ts` | ~10 |
| `services/ticket/ticket-service.ts` | ~10 |
| `services/asset/routes.ts` | ~5 |
| `services/invoice-batch/invoice-batch-service.ts` | ~3 |
| `services/preventive-maintenance/preventive-maintenance-service.ts` | ~3 |
| `services/auth/auth-service.ts` | ~3 |
| `services/attachment/attachment-service.ts` | 2 (PR #18) |
| **Ukupno** | **~57** |

## Što NE pokriva trenutna scope mapa

Modeli koji se u praksi koriste ali NISU u INTERNAL/VENDOR mapi (pa se ne mogu zvati preko `req.scopedPrisma`, blokira ih proxy):

- `asset` — scope ide kroz join `asset.store.companyId`. Trenutni Prisma extension ne podržava nested-relation scoping.
- `attachment` — scope kroz `ticket.companyId` ili `asset.store.companyId`, isti problem.
- `qrRecord` — scope kroz `workOrder.vendorCompanyId` (za vendora) ili kroz ticket → store → companyId.
- `auditLog` — scope kroz related ticket / workOrder.
- `costEstimation` — scope kroz `ticket.companyId`.
- `approvalRecord` — scope kroz ticket.
- `workOrderVisit`, `workReportRow`, `invoiceRow`, `invoiceBatchItem` — scope kroz workOrder (vendor) ili workOrder.ticket (internal pregled).
- `ticketComment`, `woComment` — scope kroz parent.

Za ove modele ručni scope filter je **i dalje neizbježan dok se ne proširi `scopedPrisma`** s mogućnošću relation-aware scopinga ili dok se ne uvedu drugi pristupi (npr. shared service helperi).

## Plan migracije (predloženo)

Tri faze. Svaka faza je zaseban PR ili niz PR-ova.

### Faza 1 — Verifikacija scope mape i adopcija "lakših" call sitova

Niski rizik. Migrira se postojeća scope mapa, koja je već testirana (24 testa).

1. **Čisto `companyId` filtriranje na ticket / store / region / internalUser** — admin routes + neki ticket service helperi. Procjena: 16-20 call sitova, 2-3 sata.
2. **Verifikacija da je `region.companyId` stvarno na schemi** (provjera Prisma schema).
3. **Tests:** existing 24 testa prolaze. Migracija ne uvodi nove testove jer je scopedPrisma već pokriven; samo dodaje regresijski safety net na call sitove kroz `req.scopedPrisma` proxy.

### Faza 2 — Proširenje scope mape za asset / attachment / cost estimation / approval records

Srednji rizik. Treba prošireni scope mehanizam (nested-relation scope).

1. Dodati `nestedScope` koncept u `scoped-prisma.ts`: za modele gdje scope ide kroz relation, ubaciti `where: { store: { companyId } }` umjesto `where: { companyId }`. Treba paziti da je relation field correct prema Prisma schemi.
2. Pokriti: `asset`, `attachment`, `costEstimation`, `approvalRecord`, ticketComment / woComment.
3. **Tests:** dodati nested-scope testove (~6 novih, slično kao postojeći, ali za relation form).
4. Migrirati call sitove za te modele (~10-15 call sitova).

### Faza 3 — Vendor-side modeli + audit log

Veći rizik. Vendor user vidi WO iz nekoliko vendor firmi (kroz S1/S2/S3 hierarchy). Treba pažljivo provjeriti da `workOrder.vendorCompanyId` filter pokriva sve scenarije, uključujući "WO vraćen AMM-u" gdje je `currentOwnerType: 'INTERNAL'` ali `vendorCompanyId` i dalje setan.

1. Migrirati vendor-side rute na `req.scopedPrisma.workOrder.*`.
2. Dodati `auditLog` u scope mapu (kroz related `ticket` / `workOrder`).
3. Tests: dodati vendor-side regresijske scenarije za sve userType varijante (S1, S2, S3, AMM kao reviewer).

### Sigurnosna mreža kroz cijelu migraciju

- **Lint pravilo** (custom ili komentar guideline): nakon Faze 1, dodati grep-CI step koji upozorava na `prisma.<model>` direct usage u handlerima (ne service slojevima) za modele koji su u scope mapi.
- **Postojeći testovi** za scoped-prisma (24) + ticket scope (6) + work-order scope (6) + auth middleware (13) = solidan regresijski sloj prije bilo kakve migracije.

## Procjena vremena

| Faza | Sati |
|---|---|
| Faza 1 — laka adopcija | 3-4 h |
| Faza 2 — nested scope + asset/attachment/comment | 5-6 h |
| Faza 3 — vendor-side + audit log | 4-5 h |
| **Ukupno** | **12-15 h** (2-3 sesije) |

## Rizici

1. **Postojeće rute s "izlazima"** — neki handleri agregiraju preko više modela odjednom (npr. AMM dashboard koji broji različite ticket statusa, regije, itd.). Tu se scopedPrisma može nekonzistentno aplicirati ako se neki query zaboravi prebaciti.
2. **`prisma.$transaction([...])` blokovi** — Prisma extension RADI unutar transactiona, ali samo ako se transaction stvara preko **scoped klijenta**. Ako je transaction na global `prisma`, scope se ne aplicira. Trebat će se pažljivo migrirati transactioni.
3. **Auth flow** — `auth-service.ts` legitimno čita `internalUser` / `vendorUser` BEZ scope-a (login mora moći vidjeti korisnike svih companies-a da provjeri credentials). Ovi pozivi MORAJU ostati na globalnom `prisma`. Treba jasno odvojiti pre-auth od post-auth.
4. **Cross-tenant by design** — admin endpointi u budućnosti mogu trebati cross-tenant view (npr. super-admin koji vidi sve firme). Trenutni model pretpostavlja jedan tenant po sessionu, što vrijedi za sad.

## Sljedeći korak

Mergati ovaj doc-only PR. Onda krenuti s **Fazom 1** kao zaseban PR. Faze 2 i 3 nakon što se Faza 1 stabilno deploya.
