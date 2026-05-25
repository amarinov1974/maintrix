-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('OWNED', 'LEASED');

-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('STANDALONE', 'SHOPPING_MALL', 'ROW');

-- CreateEnum
CREATE TYPE "HeatingType" AS ENUM ('GAS', 'HEAT_PUMP', 'DISTRICT', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "CoolingType" AS ENUM ('VRF', 'SPLIT', 'CHILLER', 'OTHER');

-- CreateEnum
CREATE TYPE "MeterPurpose" AS ENUM ('GENERAL', 'HVAC', 'REFRIGERATION', 'EV_CHARGING', 'LIGHTING', 'OTHER');

-- CreateEnum
CREATE TYPE "VoltageLevel" AS ENUM ('LV', 'MV');

-- CreateEnum
CREATE TYPE "TariffModel" AS ENUM ('SINGLE', 'DUAL', 'MULTI');

-- CreateEnum
CREATE TYPE "MeterPhases" AS ENUM ('SINGLE_PHASE', 'THREE_PHASE');

-- CreateEnum
CREATE TYPE "EnergyTariff" AS ENUM ('VT', 'NT', 'SINGLE');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "internal_code" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "ownership_type" "OwnershipType",
ADD COLUMN     "owner_name" TEXT,
ADD COLUMN     "lease_start_date" TIMESTAMP(3),
ADD COLUMN     "lease_end_date" TIMESTAMP(3),
ADD COLUMN     "gross_area" DOUBLE PRECISION,
ADD COLUMN     "sales_area" DOUBLE PRECISION,
ADD COLUMN     "storage_area" DOUBLE PRECISION,
ADD COLUMN     "floors" INTEGER,
ADD COLUMN     "build_year" INTEGER,
ADD COLUMN     "renovation_year" INTEGER,
ADD COLUMN     "building_type" "BuildingType",
ADD COLUMN     "working_hours" JSONB,
ADD COLUMN     "facility_contact_name" TEXT,
ADD COLUMN     "facility_contact_phone" TEXT,
ADD COLUMN     "owner_contact_name" TEXT,
ADD COLUMN     "owner_contact_phone" TEXT,
ADD COLUMN     "has_solar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "solar_capacity_kwp" DOUBLE PRECISION,
ADD COLUMN     "has_ev_chargers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ev_charger_count" INTEGER,
ADD COLUMN     "ev_charger_power_kw" DOUBLE PRECISION,
ADD COLUMN     "heating_type" "HeatingType",
ADD COLUMN     "cooling_type" "CoolingType";

-- CreateTable
CREATE TABLE "energy_meters" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "omm_id" TEXT NOT NULL,
    "ean_number" TEXT,
    "meter_name" TEXT NOT NULL,
    "meter_purpose" "MeterPurpose" NOT NULL DEFAULT 'GENERAL',
    "is_main_meter" BOOLEAN NOT NULL DEFAULT false,
    "distributor" TEXT,
    "supplier" TEXT,
    "contracted_power" DOUBLE PRECISION,
    "voltage_level" "VoltageLevel",
    "tariff_model" "TariffModel",
    "meter_phases" "MeterPhases",
    "meter_serial_number" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_readings" (
    "id" SERIAL NOT NULL,
    "energy_meter_id" INTEGER NOT NULL,
    "interval_start" TIMESTAMP(3) NOT NULL,
    "active_energy_kwh" DOUBLE PRECISION NOT NULL,
    "reactive_energy_kvarh" DOUBLE PRECISION,
    "peak_power_kw" DOUBLE PRECISION,
    "tariff" "EnergyTariff",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "energy_meters_store_id_idx" ON "energy_meters"("store_id");

-- CreateIndex
CREATE INDEX "energy_readings_energy_meter_id_interval_start_idx" ON "energy_readings"("energy_meter_id", "interval_start");

-- CreateIndex
CREATE UNIQUE INDEX "energy_readings_energy_meter_id_interval_start_key" ON "energy_readings"("energy_meter_id", "interval_start");

-- AddForeignKey
ALTER TABLE "energy_meters" ADD CONSTRAINT "energy_meters_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_energy_meter_id_fkey" FOREIGN KEY ("energy_meter_id") REFERENCES "energy_meters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
