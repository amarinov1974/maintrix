/**
 * CMMS Seed Data
 * Populates database with demo companies, users, assets, tickets, and workflow data.
 * Run: npm run db:seed (from packages/backend)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Timestamp N days ago (for recent demo data) */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log('Cleaning existing data...');

  // Delete in order of dependencies (children first)
  await prisma.auditLog.deleteMany();
  await prisma.qRRecord.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.wOComment.deleteMany();
  await prisma.workReportRow.deleteMany();
  await prisma.invoiceRow.deleteMany();
  await prisma.invoiceBatchItem.deleteMany();
  await prisma.workOrder.updateMany({ data: { invoiceBatchId: null } });
  await prisma.invoiceBatch.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.costEstimation.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.preventiveMaintenancePlan.deleteMany();
  await prisma.internalUser.deleteMany();
  await prisma.vendorUser.deleteMany();
  await prisma.vendorPriceListItem.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.store.deleteMany();
  await prisma.region.deleteMany();
  await prisma.company.deleteMany();
  await prisma.vendorCompany.deleteMany();

  console.log('Creating companies and structure...');

  const retailA = await prisma.company.create({
    data: { name: 'Retail A', active: true },
  });

  const northRegion = await prisma.region.create({
    data: { companyId: retailA.id, name: 'Regija Sjever' },
  });
  const southRegion = await prisma.region.create({
    data: { companyId: retailA.id, name: 'Regija Jug' },
  });

  const storesRetailA: { id: number; name: string; regionId: number }[] = [];
  for (let i = 1; i <= 4; i++) {
    const s = await prisma.store.create({
      data: {
        companyId: retailA.id,
        regionId: northRegion.id,
        name: `Poslovnica ${i} Sjever`,
        address:
          i === 1
            ? 'Varaždinska cesta 12, Čakovec'
            : i === 2
              ? 'Ulica kralja Tomislava 45, Varaždin'
              : i === 3
                ? 'Koprivnička ulica 8, Koprivnica'
                : 'Trg bana Josipa Jelačića 3, Bjelovar',
        active: true,
      },
    });
    storesRetailA.push(s);
  }
  for (let i = 5; i <= 8; i++) {
    const s = await prisma.store.create({
      data: {
        companyId: retailA.id,
        regionId: southRegion.id,
        name: `Poslovnica ${i} Jug`,
        address:
          i === 5
            ? 'Splitska ulica 21, Split'
            : i === 6
              ? 'Ulica Ante Starčevića 14, Zadar'
              : i === 7
                ? 'Dubrovačka cesta 56, Dubrovnik'
                : 'Šibenska ulica 9, Šibenik',
        active: true,
      },
    });
    storesRetailA.push(s);
  }

  const store1North = storesRetailA[0];
  const store2North = storesRetailA[1];
  const store3North = storesRetailA[2];
  const store4North = storesRetailA[3];
  const store5South = storesRetailA[4];
  const store6South = storesRetailA[5];
  const store7South = storesRetailA[6];
  const store8South = storesRetailA[7];

  console.log('Creating internal users (Retail A)...');

  const sm1 = await prisma.internalUser.create({
    data: { name: 'Ivana Petrović', email: 'anthony.marinov@gmail.com', role: 'SM', companyId: retailA.id, storeId: store1North.id, active: true },
  });
  const sm2 = await prisma.internalUser.create({
    data: { name: 'Tomislav Knežević', email: 'anthony.marinov@gmail.com', role: 'SM', companyId: retailA.id, storeId: store2North.id, active: true },
  });
  const sm3 = await prisma.internalUser.create({
    data: { name: 'Martina Jurić', email: 'anthony.marinov@gmail.com', role: 'SM', companyId: retailA.id, storeId: store3North.id, active: true },
  });
  const sm4 = await prisma.internalUser.create({
    data: { name: 'Davor Šimić', email: 'anthony.marinov@gmail.com', role: 'SM', companyId: retailA.id, storeId: store4North.id, active: true },
  });
  const sm5 = await prisma.internalUser.create({
    data: { name: 'Kristina Kovačić', email: 'anthony.marinov@gmail.com', role: 'SM', companyId: retailA.id, storeId: store5South.id, active: true },
  });
  const sm6 = await prisma.internalUser.create({
    data: { name: 'Matej Babić', email: 'anthony.marinov@gmail.com', role: 'SM', companyId: retailA.id, storeId: store6South.id, active: true },
  });
  const sm7 = await prisma.internalUser.create({
    data: { name: 'Ana Horvat', email: 'anthony.marinov@gmail.com', role: 'SM', companyId: retailA.id, storeId: store7South.id, active: true },
  });
  const sm8 = await prisma.internalUser.create({
    data: { name: 'Nikola Božić', email: 'anthony.marinov@gmail.com', role: 'SM', companyId: retailA.id, storeId: store8South.id, active: true },
  });

  const amNorth = await prisma.internalUser.create({
    data: { name: 'Marko Pavlović', email: 'anthony.marinov@gmail.com', role: 'AM', companyId: retailA.id, regionId: northRegion.id, active: true },
  });
  const amSouth = await prisma.internalUser.create({
    data: { name: 'Ivana Marković', email: 'anthony.marinov@gmail.com', role: 'AM', companyId: retailA.id, regionId: southRegion.id, active: true },
  });
  const ammNorth = await prisma.internalUser.create({
    data: { name: 'Petar Kovač', email: 'anthony.marinov@gmail.com', role: 'AMM', companyId: retailA.id, regionId: northRegion.id, active: true },
  });
  const ammSouth = await prisma.internalUser.create({
    data: { name: 'Sandra Novak', email: 'anthony.marinov@gmail.com', role: 'AMM', companyId: retailA.id, regionId: southRegion.id, active: true },
  });
  const salesDir = await prisma.internalUser.create({
    data: { name: 'Goran Jurković', email: 'anthony.marinov@gmail.com', role: 'D', companyId: retailA.id, active: true },
  });
  const maintDir = await prisma.internalUser.create({
    data: { name: 'Maja Šarić', email: 'anthony.marinov@gmail.com', role: 'C2', companyId: retailA.id, active: true },
  });
  const bod = await prisma.internalUser.create({
    data: { name: 'Zoran Tomašević', email: 'anthony.marinov@gmail.com', role: 'BOD', companyId: retailA.id, active: true },
  });
  const c3 = await prisma.internalUser.create({
    data: { name: 'Ante Jurić', email: 'anthony.marinov@gmail.com', role: 'ADMIN', companyId: retailA.id, active: true },
  });

  console.log('Creating vendor companies and users...');

  const voltaris = await prisma.vendorCompany.create({
    data: { name: 'Elektroservis Jadran d.o.o.', active: true },
  });
  const thermacore = await prisma.vendorCompany.create({
    data: { name: 'Termoklima Projekt d.o.o.', active: true },
  });

  const vendorAna = await prisma.vendorUser.create({
    data: { name: 'Ana Kovač', email: 'anthony.marinov@gmail.com', role: 'S1', vendorCompanyId: voltaris.id, active: true },
  });
  const vendorMarko = await prisma.vendorUser.create({
    data: { name: 'Marko Horvat', email: 'anthony.marinov@gmail.com', role: 'S2', vendorCompanyId: voltaris.id, active: true },
  });
  const vendorPetra = await prisma.vendorUser.create({
    data: { name: 'Petra Novak', email: 'anthony.marinov@gmail.com', role: 'S2', vendorCompanyId: voltaris.id, active: true },
  });
  const vendorIvan = await prisma.vendorUser.create({
    data: { name: 'Ivan Babić', email: 'anthony.marinov@gmail.com', role: 'S3', vendorCompanyId: voltaris.id, active: true },
  });
  const vendorLuka = await prisma.vendorUser.create({
    data: { name: 'Luka Marić', email: 'anthony.marinov@gmail.com', role: 'S1', vendorCompanyId: thermacore.id, active: true },
  });
  const vendorMaja = await prisma.vendorUser.create({
    data: { name: 'Maja Tomić', email: 'anthony.marinov@gmail.com', role: 'S2', vendorCompanyId: thermacore.id, active: true },
  });
  const vendorJosip = await prisma.vendorUser.create({
    data: { name: 'Josip Jurić', email: 'anthony.marinov@gmail.com', role: 'S3', vendorCompanyId: thermacore.id, active: true },
  });
  const frigo = await prisma.vendorCompany.create({
    data: { name: 'Frigo Tehnika Adriatik d.o.o.', active: true },
  });
  await prisma.vendorUser.create({
    data: { name: 'Tomislav Radić', email: 'anthony.marinov@gmail.com', role: 'S1', vendorCompanyId: frigo.id, active: true },
  });
  await prisma.vendorUser.create({
    data: { name: 'Mateo Grgić', email: 'anthony.marinov@gmail.com', role: 'S2', vendorCompanyId: frigo.id, active: true },
  });
  await prisma.vendorUser.create({
    data: { name: 'Filip Jurić', email: 'anthony.marinov@gmail.com', role: 'S3', vendorCompanyId: frigo.id, active: true },
  });

  console.log('Creating vendor price list (Elektroservis Jadran d.o.o.)...');

  const priceListData = [
    { category: 'Kabeli i ožičenje', description: 'NYM-J 3x1.5 mm² (Strujni krug rasvjete)', unit: 'metar', pricePerUnit: 1 },
    { category: 'Kabeli i ožičenje', description: 'NYM-J 3x2.5 mm² (Strujni krug utičnica)', unit: 'metar', pricePerUnit: 2 },
    { category: 'Kabeli i ožičenje', description: 'NYM-J 5x6 mm² (Trofazni napajanje)', unit: 'metar', pricePerUnit: 3.5 },
    { category: 'Kabeli i ožičenje', description: 'H07V-K 6 mm² (Fleksibilni vodič)', unit: 'metar', pricePerUnit: 4 },
    { category: 'Kabeli i ožičenje', description: 'Halogeni kabel 3x2.5 (Sukladno normama)', unit: 'metar', pricePerUnit: 5 },
    { category: 'Razvodni ormarići i zaštita', description: 'Razvodni ormarić 24M (Ugradni)', unit: 'komad', pricePerUnit: 145 },
    { category: 'Razvodni ormarići i zaštita', description: 'Razvodni ormarić 36M (Nadžbukni)', unit: 'komad', pricePerUnit: 185 },
    { category: 'Razvodni ormarići i zaštita', description: 'Automatski osigurač 16A C-krivulja (1P)', unit: 'komad', pricePerUnit: 12 },
    { category: 'Razvodni ormarići i zaštita', description: 'Automatski osigurač 3P 32A (Trofazni)', unit: 'komad', pricePerUnit: 38 },
    { category: 'Razvodni ormarići i zaštita', description: 'Diferencijalni osigurač 40A 30mA (Tip A)', unit: 'komad', pricePerUnit: 65 },
    { category: 'Razvodni ormarići i zaštita', description: 'Odvodnik prenapona Tip 2 (3P+N)', unit: 'komad', pricePerUnit: 120 },
    { category: 'Rasvjeta', description: 'LED Panel 60x60 (36W 4000K)', unit: 'komad', pricePerUnit: 32 },
    { category: 'Rasvjeta', description: 'LED Linearno svjetlo (150cm 50W)', unit: 'komad', pricePerUnit: 48 },
    { category: 'Rasvjeta', description: 'LED Track Light (30W podesivi)', unit: 'komad', pricePerUnit: 55 },
    { category: 'Rasvjeta', description: 'Panik svjetlo (3h autonomija)', unit: 'komad', pricePerUnit: 42 },
    { category: 'Rasvjeta', description: 'Modul za panik rasvjetu (Retrofit)', unit: 'komad', pricePerUnit: 28 },
    { category: 'Instalacijski pribor', description: 'PVC cijev Ø25 (Kruta)', unit: 'metar', pricePerUnit: 1 },
    { category: 'Instalacijski pribor', description: 'Fleksibilna cijev Ø20 (Valovita)', unit: 'metar', pricePerUnit: 1 },
    { category: 'Instalacijski pribor', description: 'Kabelska polica 100mm (Perforirana)', unit: 'metar', pricePerUnit: 14 },
    { category: 'Instalacijski pribor', description: 'Razvodna kutija 100x100 (IP54)', unit: 'komad', pricePerUnit: 6 },
    { category: 'Instalacijski pribor', description: 'Utičnica (Modularna bijela)', unit: 'komad', pricePerUnit: 7 },
    { category: 'Instalacijski pribor', description: 'Prekidač (Modularni bijeli)', unit: 'komad', pricePerUnit: 6 },
    { category: 'Posebna oprema', description: 'Industrijska utičnica 32A (5P 400V)', unit: 'komad', pricePerUnit: 28 },
    { category: 'Posebna oprema', description: 'Industrijski utikač 32A (5P 400V)', unit: 'komad', pricePerUnit: 22 },
    { category: 'Posebna oprema', description: 'Punjač za el. vozila 22kW (Wallbox)', unit: 'komad', pricePerUnit: 890 },
    { category: 'Posebna oprema', description: 'Mrežni ormarić 12U (Zidni)', unit: 'komad', pricePerUnit: 165 },
    { category: 'Posebna oprema', description: 'CAT6 kabel (Kutija 305m)', unit: 'kutija', pricePerUnit: 95 },
  ];

  const priceListItems: { id: number }[] = [];
  for (const row of priceListData) {
    const item = await prisma.vendorPriceListItem.create({
      data: {
        vendorId: voltaris.id,
        category: row.category,
        description: row.description,
        unit: row.unit,
        pricePerUnit: row.pricePerUnit,
        active: true,
      },
    });
    priceListItems.push(item);
  }

  // Elektroservis Jadran billing rules: not selectable in UI; applied automatically per intervention
  await prisma.vendorPriceListItem.create({
    data: {
      vendorId: voltaris.id,
      category: 'Fiksne naknade',
      description: 'Dolazak na lokaciju',
      unit: 'dolazak',
      pricePerUnit: 50,
      active: true,
      selectableInUI: false,
      unitMinutes: null,
    },
  });
  await prisma.vendorPriceListItem.create({
    data: {
      vendorId: voltaris.id,
      category: 'Radni sat',
      description: 'Radni sat',
      unit: 'sat',
      pricePerUnit: 40,
      active: true,
      selectableInUI: false,
      unitMinutes: 60,
    },
  });

  console.log('Creating vendor price list (Termoklima Projekt d.o.o.)...');
  const thermacorePriceListData = [
    { category: 'Klima uređaji', description: 'Split klima (3,5 kW inverter, unutarnja + vanjska)', unit: 'set', pricePerUnit: 780 },
    { category: 'Klima uređaji', description: 'Split klima (5,0 kW inverter)', unit: 'set', pricePerUnit: 980 },
    { category: 'Klima uređaji', description: 'Kazetna klima (5,3 kW komercijalna, stropna)', unit: 'set', pricePerUnit: 1450 },
    { category: 'Klima uređaji', description: 'VRF unutarnja jedinica (Zidna)', unit: 'komad', pricePerUnit: 620 },
    { category: 'Klima uređaji', description: 'VRF vanjska jedinica (Sustav 20 kW)', unit: 'komad', pricePerUnit: 4800 },
    { category: 'Ventilacijska oprema', description: 'Kanalni ventilator (250 mm)', unit: 'komad', pricePerUnit: 190 },
    { category: 'Ventilacijska oprema', description: 'Krovni ventilator (Komercijalni)', unit: 'komad', pricePerUnit: 420 },
    { category: 'Ventilacijska oprema', description: 'Rekuperator topline HRV (800 m³/h)', unit: 'komad', pricePerUnit: 1350 },
    { category: 'Ventilacijska oprema', description: 'Klimatizacijska jedinica AHU (5.000 m³/h)', unit: 'komad', pricePerUnit: 6800 },
    { category: 'Kanali i distribucija', description: 'Spiralni kanal Ø200 (Pocinčani)', unit: 'metar', pricePerUnit: 18 },
    { category: 'Kanali i distribucija', description: 'Pravokutni kanal (500x300 mm)', unit: 'metar', pricePerUnit: 32 },
    { category: 'Kanali i distribucija', description: 'Fleksibilni izolirani kanal (Ø160)', unit: 'metar', pricePerUnit: 9 },
    { category: 'Kanali i distribucija', description: 'Stropna rešetka (4-smjerna)', unit: 'komad', pricePerUnit: 38 },
    { category: 'Kanali i distribucija', description: 'Linearna rešetka (1 metar)', unit: 'komad', pricePerUnit: 85 },
    { category: 'Rashladne komponente', description: 'Bakrena cijev 1/4" (Rashladni vod)', unit: 'metar', pricePerUnit: 6 },
    { category: 'Rashladne komponente', description: 'Bakrena cijev 3/8" (Rashladni vod)', unit: 'metar', pricePerUnit: 9 },
    { category: 'Rashladne komponente', description: 'Izolacijska cijev (Za bakrene cijevi)', unit: 'metar', pricePerUnit: 3 },
    { category: 'Rashladne komponente', description: 'Kondenzatna pumpa (Mini pumpa)', unit: 'komad', pricePerUnit: 95 },
    { category: 'Grijanje', description: 'Plinski kotao (35 kW komercijalni)', unit: 'komad', pricePerUnit: 2600 },
    { category: 'Grijanje', description: 'Električni bojler (24 kW)', unit: 'komad', pricePerUnit: 950 },
    { category: 'Grijanje', description: 'Cirkulacijska pumpa (Visoka učinkovitost)', unit: 'komad', pricePerUnit: 220 },
    { category: 'Upravljanje i pribor', description: 'Zidni termostat (Digitalni programabilni)', unit: 'komad', pricePerUnit: 75 },
    { category: 'Upravljanje i pribor', description: 'Pametni termostat (WiFi)', unit: 'komad', pricePerUnit: 180 },
    { category: 'Upravljanje i pribor', description: 'Upravljačka ploča (Za AHU sustave)', unit: 'komad', pricePerUnit: 650 },
  ];
  for (const row of thermacorePriceListData) {
    await prisma.vendorPriceListItem.create({
      data: {
        vendorId: thermacore.id,
        category: row.category,
        description: row.description,
        unit: row.unit,
        pricePerUnit: row.pricePerUnit,
        active: true,
      },
    });
  }
  // Termoklima Projekt billing rules: not selectable in UI; applied automatically per intervention
  await prisma.vendorPriceListItem.create({
    data: {
      vendorId: thermacore.id,
      category: 'Fiksne naknade',
      description: 'Dolazak na lokaciju',
      unit: 'dolazak',
      pricePerUnit: 55,
      active: true,
      selectableInUI: false,
      unitMinutes: null,
    },
  });
  await prisma.vendorPriceListItem.create({
    data: {
      vendorId: thermacore.id,
      category: 'Radni sat',
      description: 'Radni sat',
      unit: 'sat',
      pricePerUnit: 44,
      active: true,
      selectableInUI: false,
      unitMinutes: 60,
    },
  });

  console.log('Creating vendor price list (Frigo Tehnika Adriatik d.o.o.)...');

  const frigoPriceListData = [
    { category: 'Rashladni uređaji', description: 'Rashladni agregat (5 kW, zrak-voda)', unit: 'komad', pricePerUnit: 2200 },
    { category: 'Rashladni uređaji', description: 'Kondenzatorska jedinica (10 kW)', unit: 'komad', pricePerUnit: 1800 },
    { category: 'Rashladni uređaji', description: 'Isparivač (Stropni, 3 kW)', unit: 'komad', pricePerUnit: 650 },
    { category: 'Rashladni uređaji', description: 'Hladnjak vode (Chiller 20 kW)', unit: 'komad', pricePerUnit: 8500 },
    { category: 'Rashladni uređaji', description: 'Rashladna komora (10 m³, montažna)', unit: 'komad', pricePerUnit: 6200 },
    { category: 'Kompresori i pumpe', description: 'Hermetički kompresor (1,5 kW)', unit: 'komad', pricePerUnit: 480 },
    { category: 'Kompresori i pumpe', description: 'Scroll kompresor (5 kW)', unit: 'komad', pricePerUnit: 1200 },
    { category: 'Kompresori i pumpe', description: 'Rashladna pumpa (Visoki tlak)', unit: 'komad', pricePerUnit: 380 },
    { category: 'Rashladni medij i komponente', description: 'Rashladni medij R32 (Boca 10 kg)', unit: 'boca', pricePerUnit: 95 },
    { category: 'Rashladni medij i komponente', description: 'Rashladni medij R410A (Boca 10 kg)', unit: 'boca', pricePerUnit: 110 },
    { category: 'Rashladni medij i komponente', description: 'Ekspanzijski ventil (Termostatski)', unit: 'komad', pricePerUnit: 85 },
    { category: 'Rashladni medij i komponente', description: 'Filter isušivač (Inline, 3/8")', unit: 'komad', pricePerUnit: 25 },
    { category: 'Rashladni medij i komponente', description: 'Stakleno oko (Indikator vlage)', unit: 'komad', pricePerUnit: 18 },
    { category: 'Izolacija i cijevi', description: 'Bakrena cijev 1/2" (Rashladni vod)', unit: 'metar', pricePerUnit: 12 },
    { category: 'Izolacija i cijevi', description: 'Bakrena cijev 5/8" (Rashladni vod)', unit: 'metar', pricePerUnit: 16 },
    { category: 'Izolacija i cijevi', description: 'Armaflex izolacija 19mm (Ø22)', unit: 'metar', pricePerUnit: 8 },
    { category: 'Upravljanje i automatika', description: 'Elektronski regulator temperature', unit: 'komad', pricePerUnit: 145 },
    { category: 'Upravljanje i automatika', description: 'Presostat niskog tlaka', unit: 'komad', pricePerUnit: 55 },
    { category: 'Upravljanje i automatika', description: 'Presostat visokog tlaka', unit: 'komad', pricePerUnit: 55 },
    { category: 'Upravljanje i automatika', description: 'Upravljačka ploča rashladnog sustava', unit: 'komad', pricePerUnit: 420 },
  ];

  for (const row of frigoPriceListData) {
    await prisma.vendorPriceListItem.create({
      data: {
        vendorId: frigo.id,
        category: row.category,
        description: row.description,
        unit: row.unit,
        pricePerUnit: row.pricePerUnit,
        active: true,
      },
    });
  }

  await prisma.vendorPriceListItem.create({
    data: {
      vendorId: frigo.id,
      category: 'Fiksne naknade',
      description: 'Dolazak na lokaciju',
      unit: 'dolazak',
      pricePerUnit: 60,
      active: true,
      selectableInUI: false,
      unitMinutes: null,
    },
  });
  await prisma.vendorPriceListItem.create({
    data: {
      vendorId: frigo.id,
      category: 'Radni sat',
      description: 'Radni sat',
      unit: 'sat',
      pricePerUnit: 48,
      active: true,
      selectableInUI: false,
      unitMinutes: 60,
    },
  });

  // Create asset categories for Retail A
  console.log('Creating asset categories...');
  const categories = await Promise.all([
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Electrical Installations', depreciationYears: 20, depreciationRate: 5.00, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Heating, Ventilation and Air Conditioning', depreciationYears: 10, depreciationRate: 10.00, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Refrigeration', depreciationYears: 10, depreciationRate: 10.00, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Kitchen Equipment', depreciationYears: 7, depreciationRate: 14.29, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Elevators', depreciationYears: 20, depreciationRate: 5.00, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Automatic Doors', depreciationYears: 10, depreciationRate: 10.00, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Fire Protection System', depreciationYears: 10, depreciationRate: 10.00, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Water and Sewage', depreciationYears: 15, depreciationRate: 6.67, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Construction Works', depreciationYears: 40, depreciationRate: 2.50, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Hygiene', depreciationYears: 5, depreciationRate: 20.00, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Environmental', depreciationYears: 10, depreciationRate: 10.00, active: true } }),
    prisma.assetCategory.create({ data: { companyId: retailA.id, name: 'Other', depreciationYears: 5, depreciationRate: 20.00, active: true } }),
  ]);

  const [electrical, hvac, refrigeration, kitchen, elevators, autoDoors, fireProt, water, construction, hygiene, environmental, other] = categories;

  // Create demo assets for first 4 stores
  console.log('Creating demo assets...');
  const stores = storesRetailA;
  const storesForAssets = stores.slice(0, 4);
  for (const store of storesForAssets) {
    await Promise.all([
      // Electrical Installations (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: electrical.id, name: `Main Distribution Board — ${store.name}`, description: 'Main electrical distribution board, 3-phase 400V', serialNumber: `EDB-${store.id}-001`, manufacturer: 'Schneider Electric', model: 'PrismaSeT G', purchaseDate: new Date('2019-01-10'), warrantyExpiry: new Date('2024-01-10'), purchaseValue: 8500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: electrical.id, name: `Emergency Lighting System — ${store.name}`, description: 'Emergency lighting system with central battery, 50 luminaires', serialNumber: `EML-${store.id}-001`, manufacturer: 'Legrand', model: 'URA21', purchaseDate: new Date('2020-03-15'), warrantyExpiry: new Date('2025-03-15'), purchaseValue: 3200.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: electrical.id, name: `UPS System — ${store.name}`, description: 'Uninterruptible power supply, 10kVA, 30min backup', serialNumber: `UPS-${store.id}-001`, manufacturer: 'APC', model: 'Smart-UPS 10000', purchaseDate: new Date('2021-07-01'), warrantyExpiry: new Date('2026-07-01'), purchaseValue: 4500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: electrical.id, name: `Sub-distribution Panel — ${store.name}`, description: 'Secondary electrical distribution panel, 63A', serialNumber: `SDP-${store.id}-001`, manufacturer: 'ABB', model: 'MISTRAL41F', purchaseDate: new Date('2019-01-10'), warrantyExpiry: new Date('2024-01-10'), purchaseValue: 2200.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: electrical.id, name: `Power Factor Correction Unit — ${store.name}`, description: 'Automatic power factor correction bank, 100kVAr', serialNumber: `PFC-${store.id}-001`, manufacturer: 'Circutor', model: 'OPTIM-10', purchaseDate: new Date('2020-06-01'), warrantyExpiry: new Date('2025-06-01'), purchaseValue: 5800.00, status: 'ACTIVE', active: true } }),

      // HVAC (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: hvac.id, name: `Split AC Unit — ${store.name}`, description: 'Daikin split air conditioning unit, 12kW cooling capacity', serialNumber: `DAI-${store.id}-001`, manufacturer: 'Daikin', model: 'FTXM35R', purchaseDate: new Date('2021-03-15'), warrantyExpiry: new Date('2026-03-15'), purchaseValue: 2800.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: hvac.id, name: `Central Ventilation Unit — ${store.name}`, description: 'Central ventilation unit with heat recovery, 2000m³/h capacity', serialNumber: `VNT-${store.id}-001`, manufacturer: 'Systemair', model: 'SAVE VTR 300', purchaseDate: new Date('2020-05-10'), warrantyExpiry: new Date('2025-05-10'), purchaseValue: 4200.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: hvac.id, name: `Heat Pump — ${store.name}`, description: 'Commercial heat pump, 18kW heating/cooling capacity', serialNumber: `HTP-${store.id}-001`, manufacturer: 'Mitsubishi Electric', model: 'PUHZ-ZRP140YKA', purchaseDate: new Date('2022-02-20'), warrantyExpiry: new Date('2027-02-20'), purchaseValue: 6500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: hvac.id, name: `Fan Coil Unit — ${store.name}`, description: 'Fan coil unit, 4-pipe system, 3.5kW cooling', serialNumber: `FCU-${store.id}-001`, manufacturer: 'Carrier', model: '42EP', purchaseDate: new Date('2021-03-15'), warrantyExpiry: new Date('2026-03-15'), purchaseValue: 1800.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: hvac.id, name: `Air Handling Unit — ${store.name}`, description: 'Central air handling unit with filtration and heat recovery', serialNumber: `AHU-${store.id}-001`, manufacturer: 'Robatherm', model: 'NRECO-20', purchaseDate: new Date('2019-09-01'), warrantyExpiry: new Date('2024-09-01'), purchaseValue: 22000.00, status: 'ACTIVE', active: true } }),

      // Refrigeration (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: refrigeration.id, name: `Refrigerated Display Case — ${store.name}`, description: 'Commercial refrigerated display case for chilled products', serialNumber: `ELX-${store.id}-001`, manufacturer: 'Electrolux', model: 'RC4000', purchaseDate: new Date('2020-06-01'), warrantyExpiry: new Date('2025-06-01'), purchaseValue: 5500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: refrigeration.id, name: `Walk-in Freezer — ${store.name}`, description: 'Walk-in freezer room, -18°C, 12m² floor area', serialNumber: `WIF-${store.id}-001`, manufacturer: 'Carrier', model: 'XCF-12', purchaseDate: new Date('2019-08-15'), warrantyExpiry: new Date('2024-08-15'), purchaseValue: 18000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: refrigeration.id, name: `Ice Machine — ${store.name}`, description: 'Commercial ice machine, 50kg/day production capacity', serialNumber: `ICM-${store.id}-001`, manufacturer: 'Scotsman', model: 'EC 86 AS', purchaseDate: new Date('2021-04-01'), warrantyExpiry: new Date('2026-04-01'), purchaseValue: 3800.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: refrigeration.id, name: `Chest Freezer — ${store.name}`, description: 'Commercial chest freezer, 600L, -22°C', serialNumber: `CFZ-${store.id}-001`, manufacturer: 'Liebherr', model: 'GTP 3656', purchaseDate: new Date('2020-11-01'), warrantyExpiry: new Date('2025-11-01'), purchaseValue: 2400.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: refrigeration.id, name: `Refrigerated Counter — ${store.name}`, description: 'Refrigerated service counter, 2m length, 0-4°C', serialNumber: `RFC-${store.id}-001`, manufacturer: 'Zanussi', model: 'TC18', purchaseDate: new Date('2021-01-15'), warrantyExpiry: new Date('2026-01-15'), purchaseValue: 4200.00, status: 'ACTIVE', active: true } }),

      // Kitchen Equipment (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: kitchen.id, name: `Commercial Dishwasher — ${store.name}`, description: 'Hood-type commercial dishwasher, 60 racks/hour', serialNumber: `DSW-${store.id}-001`, manufacturer: 'Hobart', model: 'FX-90', purchaseDate: new Date('2021-02-01'), warrantyExpiry: new Date('2026-02-01'), purchaseValue: 8500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: kitchen.id, name: `Combi Oven — ${store.name}`, description: 'Combination steam/convection oven, 10 GN 1/1', serialNumber: `CMB-${store.id}-001`, manufacturer: 'Rational', model: 'SCC 101', purchaseDate: new Date('2020-08-01'), warrantyExpiry: new Date('2025-08-01'), purchaseValue: 12000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: kitchen.id, name: `Commercial Fryer — ${store.name}`, description: 'Electric commercial fryer, 2x8L capacity', serialNumber: `FRY-${store.id}-001`, manufacturer: 'Electrolux', model: 'E7FRED2K00', purchaseDate: new Date('2021-05-01'), warrantyExpiry: new Date('2026-05-01'), purchaseValue: 3200.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: kitchen.id, name: `Coffee Machine — ${store.name}`, description: 'Professional espresso machine, 2-group', serialNumber: `COF-${store.id}-001`, manufacturer: 'Franke', model: 'A600', purchaseDate: new Date('2022-01-10'), warrantyExpiry: new Date('2027-01-10'), purchaseValue: 9500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: kitchen.id, name: `Induction Cooktop — ${store.name}`, description: 'Commercial induction cooktop, 4-zone, 14kW', serialNumber: `IND-${store.id}-001`, manufacturer: 'Eloma', model: 'EMI-4', purchaseDate: new Date('2021-09-01'), warrantyExpiry: new Date('2026-09-01'), purchaseValue: 4800.00, status: 'ACTIVE', active: true } }),

      // Elevators (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: elevators.id, name: `Passenger Elevator — ${store.name}`, description: 'Passenger elevator, capacity 630kg, 4 stops', serialNumber: `OTS-${store.id}-001`, manufacturer: 'OTIS', model: 'Gen2 Comfort', purchaseDate: new Date('2018-09-20'), warrantyExpiry: new Date('2023-09-20'), purchaseValue: 45000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: elevators.id, name: `Goods Lift — ${store.name}`, description: 'Goods lift, capacity 2000kg, 3 stops', serialNumber: `GLF-${store.id}-001`, manufacturer: 'Kone', model: 'MonoSpace 700', purchaseDate: new Date('2019-06-15'), warrantyExpiry: new Date('2024-06-15'), purchaseValue: 35000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: elevators.id, name: `Escalator — ${store.name}`, description: 'Moving escalator, width 1000mm, rise 4.5m', serialNumber: `ESC-${store.id}-001`, manufacturer: 'Schindler', model: '9300 AE', purchaseDate: new Date('2018-11-01'), warrantyExpiry: new Date('2023-11-01'), purchaseValue: 85000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: elevators.id, name: `Platform Lift — ${store.name}`, description: 'Disabled access platform lift, capacity 300kg, 2 stops', serialNumber: `PLF-${store.id}-001`, manufacturer: 'Hiro Lift', model: 'P16', purchaseDate: new Date('2020-04-01'), warrantyExpiry: new Date('2025-04-01'), purchaseValue: 18000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: elevators.id, name: `Dumbwaiter — ${store.name}`, description: 'Service dumbwaiter, capacity 100kg, 3 stops', serialNumber: `DMW-${store.id}-001`, manufacturer: 'Kleemann', model: 'MRL-100', purchaseDate: new Date('2019-03-01'), warrantyExpiry: new Date('2024-03-01'), purchaseValue: 12000.00, status: 'ACTIVE', active: true } }),

      // Automatic Doors (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: autoDoors.id, name: `Sliding Entrance Door — ${store.name}`, description: 'Automatic sliding entrance door, 2-leaf, 2.5m opening', serialNumber: `SLD-${store.id}-001`, manufacturer: 'GEZE', model: 'Slimdrive SL', purchaseDate: new Date('2019-05-01'), warrantyExpiry: new Date('2024-05-01'), purchaseValue: 8500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: autoDoors.id, name: `Revolving Door — ${store.name}`, description: 'Automatic revolving door, 3-wing, diameter 2.2m', serialNumber: `RVD-${store.id}-001`, manufacturer: 'Boon Edam', model: 'Tourniket', purchaseDate: new Date('2018-07-01'), warrantyExpiry: new Date('2023-07-01'), purchaseValue: 32000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: autoDoors.id, name: `Emergency Exit Door — ${store.name}`, description: 'Automatic emergency exit door with push bar', serialNumber: `EXD-${store.id}-001`, manufacturer: 'ASSA ABLOY', model: 'Besam UniSlide', purchaseDate: new Date('2019-05-01'), warrantyExpiry: new Date('2024-05-01'), purchaseValue: 4200.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: autoDoors.id, name: `Loading Dock Door — ${store.name}`, description: 'Sectional loading dock door, 3x3m, insulated', serialNumber: `LDD-${store.id}-001`, manufacturer: 'Hörmann', model: 'ALR F42', purchaseDate: new Date('2018-09-01'), warrantyExpiry: new Date('2023-09-01'), purchaseValue: 5500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: autoDoors.id, name: `Fire Door — ${store.name}`, description: 'Automatic fire door, EI60 rated, single leaf', serialNumber: `FRD-${store.id}-001`, manufacturer: 'Mercor', model: 'Firestop 60', purchaseDate: new Date('2019-01-15'), warrantyExpiry: new Date('2024-01-15'), purchaseValue: 3800.00, status: 'ACTIVE', active: true } }),

      // Fire Protection System (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: fireProt.id, name: `Fire Alarm Panel — ${store.name}`, description: 'Addressable fire alarm system with 45 detectors and central panel', serialNumber: `FAS-${store.id}-001`, manufacturer: 'Bosch', model: 'FPA-5000', purchaseDate: new Date('2019-03-01'), warrantyExpiry: new Date('2024-03-01'), purchaseValue: 12000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: fireProt.id, name: `Sprinkler System — ${store.name}`, description: 'Wet pipe sprinkler system, 120 sprinkler heads', serialNumber: `SPR-${store.id}-001`, manufacturer: 'Viking', model: 'VK100', purchaseDate: new Date('2018-09-01'), warrantyExpiry: new Date('2023-09-01'), purchaseValue: 25000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: fireProt.id, name: `Fire Extinguisher Set — ${store.name}`, description: 'Set of 6 powder fire extinguishers, 6kg each', serialNumber: `FEX-${store.id}-001`, manufacturer: 'Ansul', model: 'Sentry 6kg', purchaseDate: new Date('2022-01-01'), warrantyExpiry: new Date('2027-01-01'), purchaseValue: 600.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: fireProt.id, name: `Smoke Detection System — ${store.name}`, description: 'Optical smoke detection system, 30 detectors', serialNumber: `SMK-${store.id}-001`, manufacturer: 'Siemens', model: 'FDO221', purchaseDate: new Date('2019-03-01'), warrantyExpiry: new Date('2024-03-01'), purchaseValue: 6500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: fireProt.id, name: `Fire Suppression System — ${store.name}`, description: 'Kitchen hood fire suppression system, wet chemical', serialNumber: `FSS-${store.id}-001`, manufacturer: 'Kidde', model: 'Sapphire', purchaseDate: new Date('2020-06-01'), warrantyExpiry: new Date('2025-06-01'), purchaseValue: 8500.00, status: 'ACTIVE', active: true } }),

      // Water and Sewage (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: water.id, name: `Booster Pump Station — ${store.name}`, description: 'Pressure booster pump station, 3 pumps, 5bar', serialNumber: `BPS-${store.id}-001`, manufacturer: 'Grundfos', model: 'Hydro MPC-E 3', purchaseDate: new Date('2019-04-01'), warrantyExpiry: new Date('2024-04-01'), purchaseValue: 12000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: water.id, name: `Hot Water Boiler — ${store.name}`, description: 'Gas condensing boiler, 100kW, hot water supply', serialNumber: `HWB-${store.id}-001`, manufacturer: 'Viessmann', model: 'Vitodens 200-W', purchaseDate: new Date('2020-01-15'), warrantyExpiry: new Date('2025-01-15'), purchaseValue: 8500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: water.id, name: `Grease Trap — ${store.name}`, description: 'Grease separator, 4000L capacity, underground', serialNumber: `GRT-${store.id}-001`, manufacturer: 'Kessel', model: 'Grease Ex 4000', purchaseDate: new Date('2018-06-01'), warrantyExpiry: new Date('2023-06-01'), purchaseValue: 5500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: water.id, name: `Sewage Pump — ${store.name}`, description: 'Submersible sewage pump, 15kW, automatic', serialNumber: `SWP-${store.id}-001`, manufacturer: 'Flygt', model: 'N 3068', purchaseDate: new Date('2019-08-01'), warrantyExpiry: new Date('2024-08-01'), purchaseValue: 4200.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: water.id, name: `Water Softener — ${store.name}`, description: 'Automatic water softener, 3m³/h flow rate', serialNumber: `WSF-${store.id}-001`, manufacturer: 'BWT', model: 'Rondomat Duo 3', purchaseDate: new Date('2020-09-01'), warrantyExpiry: new Date('2025-09-01'), purchaseValue: 2800.00, status: 'ACTIVE', active: true } }),

      // Construction Works (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: construction.id, name: `Roof Membrane System — ${store.name}`, description: 'Flat roof waterproofing membrane, 800m² coverage', serialNumber: `RMS-${store.id}-001`, manufacturer: 'Sika', model: 'Sarnafil TS 77', purchaseDate: new Date('2018-05-01'), warrantyExpiry: new Date('2028-05-01'), purchaseValue: 35000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: construction.id, name: `Floor Coating — ${store.name}`, description: 'Epoxy floor coating system, 600m² sales floor area', serialNumber: `FLC-${store.id}-001`, manufacturer: 'Flowcrete', model: 'Deckshield ED', purchaseDate: new Date('2019-02-01'), warrantyExpiry: new Date('2024-02-01'), purchaseValue: 18000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: construction.id, name: `Facade Cladding — ${store.name}`, description: 'Composite facade cladding panels, 400m²', serialNumber: `FAC-${store.id}-001`, manufacturer: 'Kingspan', model: 'Benchmark Karrier', purchaseDate: new Date('2018-05-01'), warrantyExpiry: new Date('2028-05-01'), purchaseValue: 45000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: construction.id, name: `Expansion Joints — ${store.name}`, description: 'Structural expansion joint system, 120m total length', serialNumber: `EXJ-${store.id}-001`, manufacturer: 'Migua', model: 'GFS-25', purchaseDate: new Date('2018-05-01'), warrantyExpiry: new Date('2028-05-01'), purchaseValue: 8500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: construction.id, name: `Waterproofing System — ${store.name}`, description: 'Underground waterproofing, basement walls and floor', serialNumber: `WPS-${store.id}-001`, manufacturer: 'Mapei', model: 'Mapelastic', purchaseDate: new Date('2018-05-01'), warrantyExpiry: new Date('2028-05-01'), purchaseValue: 12000.00, status: 'ACTIVE', active: true } }),

      // Hygiene (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: hygiene.id, name: `Hand Dryer System — ${store.name}`, description: 'High-speed hand dryers, 8 units in restrooms', serialNumber: `HDS-${store.id}-001`, manufacturer: 'Dyson', model: 'Airblade V', purchaseDate: new Date('2021-01-01'), warrantyExpiry: new Date('2024-01-01'), purchaseValue: 4800.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: hygiene.id, name: `Soap Dispenser System — ${store.name}`, description: 'Automatic soap dispensers, 10 units', serialNumber: `SDS-${store.id}-001`, manufacturer: 'Tork', model: 'S4 System', purchaseDate: new Date('2021-01-01'), warrantyExpiry: new Date('2026-01-01'), purchaseValue: 1500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: hygiene.id, name: `Air Purification Unit — ${store.name}`, description: 'Commercial air purifier with HEPA filter, 1000m³/h', serialNumber: `APU-${store.id}-001`, manufacturer: 'Blueair', model: 'Pro XL', purchaseDate: new Date('2021-06-01'), warrantyExpiry: new Date('2026-06-01'), purchaseValue: 3500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: hygiene.id, name: `Pest Control System — ${store.name}`, description: 'Integrated pest control monitoring system', serialNumber: `PCS-${store.id}-001`, manufacturer: 'Rentokil', model: 'PestConnect', purchaseDate: new Date('2020-03-01'), warrantyExpiry: new Date('2025-03-01'), purchaseValue: 2800.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: hygiene.id, name: `Sanitary Waste Disposal — ${store.name}`, description: 'Sanitary waste disposal units, 6 cubicles', serialNumber: `SWD-${store.id}-001`, manufacturer: 'Daniels Health', model: 'Sharpsmart', purchaseDate: new Date('2021-01-01'), warrantyExpiry: new Date('2026-01-01'), purchaseValue: 1800.00, status: 'ACTIVE', active: true } }),

      // Environmental (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: environmental.id, name: `Solar Panel System — ${store.name}`, description: 'Rooftop solar PV system, 50kWp capacity', serialNumber: `SOL-${store.id}-001`, manufacturer: 'SunPower', model: 'Maxeon 3', purchaseDate: new Date('2022-04-01'), warrantyExpiry: new Date('2047-04-01'), purchaseValue: 45000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: environmental.id, name: `EV Charging Station — ${store.name}`, description: 'Electric vehicle charging station, 4 points, 22kW each', serialNumber: `EVC-${store.id}-001`, manufacturer: 'ABB', model: 'Terra AC W22', purchaseDate: new Date('2022-06-01'), warrantyExpiry: new Date('2027-06-01'), purchaseValue: 12000.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: environmental.id, name: `Energy Monitoring System — ${store.name}`, description: 'Building energy management system with smart metering', serialNumber: `EMS-${store.id}-001`, manufacturer: 'Schneider Electric', model: 'EcoStruxure', purchaseDate: new Date('2021-09-01'), warrantyExpiry: new Date('2026-09-01'), purchaseValue: 8500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: environmental.id, name: `Rainwater Harvesting System — ${store.name}`, description: 'Rainwater collection and reuse system, 10000L tank', serialNumber: `RWH-${store.id}-001`, manufacturer: 'Graf', model: 'Carat S', purchaseDate: new Date('2020-08-01'), warrantyExpiry: new Date('2025-08-01'), purchaseValue: 6500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: environmental.id, name: `LED Lighting System — ${store.name}`, description: 'Full LED lighting system, 300 fixtures, DALI controlled', serialNumber: `LED-${store.id}-001`, manufacturer: 'Philips', model: 'CoreLine', purchaseDate: new Date('2021-03-01'), warrantyExpiry: new Date('2026-03-01'), purchaseValue: 28000.00, status: 'ACTIVE', active: true } }),

      // Other (5)
      prisma.asset.create({ data: { storeId: store.id, categoryId: other.id, name: `Security Camera System — ${store.name}`, description: 'IP CCTV system with 16 cameras and NVR recorder', serialNumber: `CCT-${store.id}-001`, manufacturer: 'Hikvision', model: 'DS-7716NI-K4', purchaseDate: new Date('2021-11-15'), warrantyExpiry: new Date('2024-11-15'), purchaseValue: 3200.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: other.id, name: `Access Control System — ${store.name}`, description: 'Electronic access control with card readers, 8 doors', serialNumber: `ACS-${store.id}-001`, manufacturer: 'HID Global', model: 'EDGE EVO', purchaseDate: new Date('2021-08-01'), warrantyExpiry: new Date('2026-08-01'), purchaseValue: 8500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: other.id, name: `Burglar Alarm System — ${store.name}`, description: 'Intruder alarm system with motion sensors and central monitoring', serialNumber: `BAS-${store.id}-001`, manufacturer: 'Bosch', model: 'Solution 3000', purchaseDate: new Date('2020-10-15'), warrantyExpiry: new Date('2025-10-15'), purchaseValue: 4200.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: other.id, name: `PA System — ${store.name}`, description: 'Public address and background music system, 40 speakers', serialNumber: `PAS-${store.id}-001`, manufacturer: 'Bosch', model: 'PAVIRO', purchaseDate: new Date('2019-07-01'), warrantyExpiry: new Date('2024-07-01'), purchaseValue: 6500.00, status: 'ACTIVE', active: true } }),
      prisma.asset.create({ data: { storeId: store.id, categoryId: other.id, name: `Digital Signage System — ${store.name}`, description: 'Digital signage network with 12 displays and central management', serialNumber: `DSS-${store.id}-001`, manufacturer: 'Samsung', model: 'QM65R', purchaseDate: new Date('2021-05-01'), warrantyExpiry: new Date('2026-05-01'), purchaseValue: 18000.00, status: 'ACTIVE', active: true } }),
    ]);
  }

  console.log('Seed completed successfully.');
  console.log('Summary:');
  console.log('  Companies: 1 (Retail A only)');
  console.log('  Regions: 2');
  console.log('  Stores: 8');
  console.log('  Internal users: 16');
  console.log('  Vendor companies: 2');
  console.log('  Vendor users: 7');
  console.log('  Asset categories: 12');
  console.log('  Assets: created (60 per store for first 4 stores = 240 total)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
