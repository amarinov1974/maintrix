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
    BOARD_OF_DIRECTORS: 'BOD',
};
export const VendorRoles = {
    SERVICE_ADMIN: 'S1',
    TECHNICIAN: 'S2',
    FINANCE_BACKOFFICE: 'S3',
};
export const AllRoles = {
    ...InternalRoles,
    ...VendorRoles,
};
