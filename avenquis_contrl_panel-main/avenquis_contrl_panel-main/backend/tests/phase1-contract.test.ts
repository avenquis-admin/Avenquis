import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { entitlementSnapshotSchema, provisioningCommandSchema, provisioningResultSchema } from '../src/contracts/platform.js';

const base = {
  contractVersion: '1',
  eventId: '0d4478f1-2999-4e1b-8f7f-90b703d5fc36',
  provisioningOperationId: 'prov-task10-operation',
  correlationId: 'task10-correlation',
  occurredAt: '2026-10-02T00:00:00.000Z',
  firmId: 'firm-fames-r',
  idempotencyKey: 'firm-fames-r:task10:1',
};

describe('Phase-1 platform contracts', () => {
  test('accepts every supported provisioning action', () => {
    const commands = [
      { ...base, action: 'firm.provision', payload: { firmName: 'FAMES & R', subdomain: 'fames-r', status: 'pending' } },
      { ...base, action: 'firm.activate', payload: { reason: 'Provisioning completed' } },
      { ...base, action: 'firm.suspend', payload: { reason: 'Subscription suspended' } },
      { ...base, action: 'user.provision', payload: { platformUserId: 'platform-user-1', email: 'tenant@example.test', fullName: 'Tenant Admin', role: 'FIRM_OWNER', status: 'active' } },
      { ...base, action: 'user.disable', payload: { platformUserId: 'platform-user-1', reason: 'Access removed' } },
      { ...base, action: 'entitlements.replace', payload: { subscriptionId: 'subscription-1', planCode: 'professional', subscriptionStatus: 'active', entitlementVersion: 2, effectiveFrom: '2026-10-02T00:00:00.000Z', effectiveUntil: null, modules: { dashboard: true }, limits: {} } },
      { ...base, action: 'subscription.status_changed', payload: { subscriptionId: 'subscription-1', subscriptionStatus: 'suspended', entitlementVersion: 3 } },
    ];
    for (const command of commands) assert.equal(provisioningCommandSchema.safeParse(command).success, true, command.action);
  });

  test('rejects an invalid entitlement version', () => {
    const result = entitlementSnapshotSchema.safeParse({
      firmId: 'firm-control-1', subscriptionId: 'subscription-1', planCode: 'professional',
      subscriptionStatus: 'active', effectiveFrom: '2026-10-02T00:00:00.000Z',
      effectiveUntil: null, entitlementVersion: 0, modules: { dashboard: true }, limits: {},
    });
    assert.equal(result.success, false);
  });

  test('does not permit a tenant identity to become a platform super admin', () => {
    const result = provisioningCommandSchema.safeParse({
      ...base, action: 'user.provision',
      payload: { platformUserId: 'platform-fames-r', email: 'fames@example.test', fullName: 'FAMES & R', role: 'PLATFORM_SUPER_ADMIN', status: 'active' },
    });
    assert.equal(result.success, false);
  });

  test('preserves shared identity and provisioning IDs in results', () => {
    const result = provisioningResultSchema.safeParse({
      contractVersion: '1', provisioningOperationId: 'prov-task10-operation',
      correlationId: 'task10-correlation', firmId: 'firm-fames-r', coreFirmId: 10,
      platformUserId: 'platform-user-1', coreUserId: 20, subscriptionId: 'subscription-1',
      entitlementVersion: 3, status: 'COMPLETED', processedAt: '2026-10-02T00:00:00.000Z',
    });
    assert.equal(result.success, true);
  });
});
