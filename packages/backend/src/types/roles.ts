/**
 * LOCKED ROLE DEFINITIONS
 * DO NOT RENAME OR MODIFY
 * These match the functional specification exactly
 */

export const InternalRoles = {
  STORE_MANAGER: 'SM',
  AREA_MANAGER: 'AM',
  AREA_MAINTENANCE_MANAGER: 'AMM',
  SALES_DIRECTOR: 'D',
  MAINTENANCE_DIRECTOR: 'C2',
  MAINTENANCE_ADMIN: 'ADMIN',
  BOARD_OF_DIRECTORS: 'BOD',
} as const;

export const VendorRoles = {
  SERVICE_ADMIN: 'S1',
  TECHNICIAN: 'S2',
  FINANCE_BACKOFFICE: 'S3',
} as const;

export type InternalRole = (typeof InternalRoles)[keyof typeof InternalRoles];
export type VendorRole = (typeof VendorRoles)[keyof typeof VendorRoles];
export type Role = InternalRole | VendorRole;

export const AllRoles = {
  ...InternalRoles,
  ...VendorRoles,
} as const;
