/**
 * Seed mock EnergyReading intervals for a single meter (demo / local).
 * Run: npx tsx prisma/seed-energy-readings.ts
 */

import 'dotenv/config';
import { PrismaClient, EnergyTariff } from '@prisma/client';

const prisma = new PrismaClient();

const ENERGY_METER_ID = 1;
const INTERVAL_COUNT = 96;
const INTERVAL_MINUTES = 15;

/** ±5% random noise */
function withNoise(value: number): number {
  const factor = 1 + (Math.random() * 0.1 - 0.05);
  return Math.round(value * factor * 100) / 100;
}

function randomInRange(min: number, max: number): number {
  return withNoise(min + Math.random() * (max - min));
}

function totalMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function getActiveEnergyRange(hour: number, minute: number): [number, number] {
  const t = totalMinutes(hour, minute);

  if (t <= 6 * 60 + 45) return [2.5, 3.5];
  if (t >= 7 * 60 && t <= 7 * 60 + 45) return [8.0, 12.0];
  if (t >= 8 * 60 && t <= 9 * 60 + 45) return [14.0, 16.0];
  if (t >= 10 * 60 && t <= 12 * 60 + 45) return [16.0, 18.0];
  if (t >= 13 * 60 && t <= 14 * 60 + 45) return [17.0, 19.0];
  if (t >= 15 * 60 && t <= 18 * 60 + 45) return [16.0, 18.0];
  if (t >= 19 * 60 && t <= 20 * 60 + 45) return [14.0, 16.0];
  if (t >= 21 * 60 && t <= 21 * 60 + 45) return [6.0, 8.0];
  if (t >= 22 * 60) return [2.5, 3.5];

  return [2.5, 3.5];
}

function isNightPeriod(hour: number, minute: number): boolean {
  const t = totalMinutes(hour, minute);
  return t <= 6 * 60 + 45 || t >= 22 * 60;
}

function getTariff(hour: number, minute: number): EnergyTariff {
  const t = totalMinutes(hour, minute);
  if (t >= 7 * 60 && t <= 20 * 60 + 59) return 'VT';
  return 'NT';
}

async function main() {
  const meter = await prisma.energyMeter.findUnique({
    where: { id: ENERGY_METER_ID },
  });
  if (!meter) {
    console.error(`EnergyMeter ID ${ENERGY_METER_ID} not found. Run db:seed first.`);
    process.exit(1);
  }

  let written = 0;

  for (let i = 0; i < INTERVAL_COUNT; i++) {
    const totalMin = i * INTERVAL_MINUTES;
    const hour = Math.floor(totalMin / 60);
    const minute = totalMin % 60;

    const intervalStart = new Date(2026, 4, 24, hour, minute, 0, 0);

    const [minKwh, maxKwh] = getActiveEnergyRange(hour, minute);
    const activeEnergyKwh = randomInRange(minKwh, maxKwh);
    const reactiveRatio = isNightPeriod(hour, minute) ? 0.3 : 0.25;
    const reactiveEnergyKvarh = Math.round(activeEnergyKwh * reactiveRatio * 100) / 100;
    const peakPowerKw = Math.round(activeEnergyKwh * 4 * 100) / 100;
    const tariff = getTariff(hour, minute);

    const result = await prisma.energyReading.upsert({
      where: {
        energyMeterId_intervalStart: {
          energyMeterId: ENERGY_METER_ID,
          intervalStart,
        },
      },
      create: {
        energyMeterId: ENERGY_METER_ID,
        intervalStart,
        activeEnergyKwh,
        reactiveEnergyKvarh,
        peakPowerKw,
        tariff,
      },
      update: {},
    });

    if (result) written += 1;
  }

  console.log(`Upisano ${written} intervala za EnergyMeter ID ${ENERGY_METER_ID}`);
}

main()
  .catch((e) => {
    console.error('Seed energy readings failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
