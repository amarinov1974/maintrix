import { describe, expect, it } from 'vitest';
import { ApprovalChainService } from '../src/services/approval-chain/approval-chain-service.js';
import { APPROVAL_THRESHOLDS } from '../src/config/approval-thresholds.js';
import { InternalRoles } from '../src/types/roles.js';

const service = new ApprovalChainService();

describe('ApprovalChainService.getRequiredApprovers', () => {
  it('routes amounts at or below AM_MAX to AM only', () => {
    expect(service.getRequiredApprovers(0)).toEqual([InternalRoles.AREA_MANAGER]);
    expect(service.getRequiredApprovers(APPROVAL_THRESHOLDS.AM_MAX)).toEqual([InternalRoles.AREA_MANAGER]);
  });

  it('routes amounts above AM_MAX up to DIRECTOR_MAX through AM → D → C2', () => {
    const expected = [
      InternalRoles.AREA_MANAGER,
      InternalRoles.SALES_DIRECTOR,
      InternalRoles.MAINTENANCE_DIRECTOR,
    ];
    expect(service.getRequiredApprovers(APPROVAL_THRESHOLDS.AM_MAX + 1)).toEqual(expected);
    expect(service.getRequiredApprovers(APPROVAL_THRESHOLDS.DIRECTOR_MAX)).toEqual(expected);
  });

  it('routes amounts above DIRECTOR_MAX through AM → D → C2 → BOD', () => {
    const expected = [
      InternalRoles.AREA_MANAGER,
      InternalRoles.SALES_DIRECTOR,
      InternalRoles.MAINTENANCE_DIRECTOR,
      InternalRoles.BOARD_OF_DIRECTORS,
    ];
    expect(service.getRequiredApprovers(APPROVAL_THRESHOLDS.DIRECTOR_MAX + 1)).toEqual(expected);
    expect(service.getRequiredApprovers(10000)).toEqual(expected);
  });
});

describe('APPROVAL_THRESHOLDS frontend sync', () => {
  // The frontend ships a copy of these constants in
  // packages/frontend/src/config/approval-thresholds.ts. If you change
  // a value here, update the frontend file too.
  it('AM_MAX is 1000 (frontend must match)', () => {
    expect(APPROVAL_THRESHOLDS.AM_MAX).toBe(1000);
  });
  it('DIRECTOR_MAX is 3000 (frontend must match)', () => {
    expect(APPROVAL_THRESHOLDS.DIRECTOR_MAX).toBe(3000);
  });
});
