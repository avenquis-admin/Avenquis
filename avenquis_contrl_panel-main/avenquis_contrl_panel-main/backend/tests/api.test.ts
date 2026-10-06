/**
 * Avenquis Control Panel Backend - Test Suite
 * 
 * Tests:
 * 1. GET /health
 * 2. GET /auth/me
 * 3. GET /overview/metrics
 * 4. GET /firms (Bangladesh ICAB CA Firms verified)
 * 5. GET /users (Canonical contract: { data, total, page, limit }, normalized schema)
 * 6. GET /professional-members (ICAB Public Reference Directory separation)
 * 7. POST /access-requests/:id/approve
 * 8. POST /firms/:id/suspend
 * 9. Unknown route / error handling contract
 * 10. Invalid ID handling (404 and structured error contract)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'http';
import { createApp } from '../src/app.js';

let server: Server;
let baseUrl: string;

before(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

describe('Backend API Suite', () => {
  test('1. GET /health returns 200 with deterministic payload', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, {
      status: 'ok',
      service: 'avenquis-control-panel-backend',
    });
  });

  test('2. GET /auth/me returns 200 with development PLATFORM_SUPER_ADMIN identity', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.user);
    assert.equal(body.user.role, 'PLATFORM_SUPER_ADMIN');
    assert.equal(body.user.email, 'admin@avenquis.internal');
    assert.equal(body.user.fullName, 'Platform Super Admin');
  });

  test('3. GET /overview/metrics returns all 8 required dashboard KPIs with BDT formatting', async () => {
    const res = await fetch(`${baseUrl}/overview/metrics?range=30d`);
    assert.equal(res.status, 200);
    const body = await res.json();
    
    // Validate required KPI keys
    assert.ok(typeof body.totalFirms === 'number');
    assert.ok(typeof body.activeFirms === 'number');
    assert.ok(typeof body.totalUsers === 'number');
    assert.ok(typeof body.pendingAccessRequests === 'number');
    assert.ok(typeof body.pendingApprovals === 'number');
    assert.ok(typeof body.monthlySubscriptionValue === 'string');
    assert.ok(body.monthlySubscriptionValue.includes('৳'), 'Currency should be BDT (৳)');
    assert.ok(typeof body.overdueCollections === 'string');
    assert.ok(body.overdueCollections.includes('৳'), 'Currency should be BDT (৳)');
    assert.ok(typeof body.openSupportIssues === 'number');

    // Validate 8 MetricItems (m1 to m8) for frontend rendering
    assert.ok(Array.isArray(body.metrics));
    assert.equal(body.metrics.length, 8);
    const ids = body.metrics.map((m: { id: string }) => m.id);
    assert.deepEqual(ids, ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8']);
  });

  test('4. GET /firms returns verified Bangladesh ICAB CA firms without Indian or law-firm records', async () => {
    const res = await fetch(`${baseUrl}/firms`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.firms));
    assert.ok(body.firms.length >= 10);
    assert.ok(typeof body.total === 'number');

    // Verify all firms are Bangladesh Chartered Accountancy firms
    for (const firm of body.firms) {
      assert.equal(firm.country, 'Bangladesh', `Firm ${firm.name} must be located in Bangladesh`);
      assert.ok(
        firm.name.includes('Chartered Accountants') || firm.firmType === 'Chartered Accountants',
        `Firm ${firm.name} should be a Chartered Accountancy practice`
      );

      // Verify no Indian law firm or legal practice names
      const forbiddenTerms = [
        'Shardul',
        'Amarchand',
        'Mangaldas',
        'Cyril',
        'Khaitan',
        'AZB',
        'Law Group',
        'Legal Advisors',
        'Advocates',
        'Legal Practice Team',
      ];
      for (const term of forbiddenTerms) {
        assert.ok(
          !firm.name.includes(term),
          `Firm name "${firm.name}" should not contain forbidden term "${term}"`
        );
      }
    }

    // Verify specific recognized ICAB CA firms from official directory
    const firmNames = body.firms.map((f: { name: string }) => f.name);
    assert.ok(firmNames.some((n: string) => n.includes('A. B. Saha & Co.')));
    assert.ok(firmNames.some((n: string) => n.includes('A. Qasem & Co.')));
    assert.ok(firmNames.some((n: string) => n.includes('S. F. Ahmed & Co.')));
    assert.ok(firmNames.some((n: string) => n.includes('A. Hoque & Co.')));
  });

  test('5. GET /users adheres strictly to canonical API contract and normalized user schema', async () => {
    const res = await fetch(`${baseUrl}/users?page=1&limit=20`);
    assert.equal(res.status, 200);
    const body = await res.json();

    // Canonical API contract: { data, total, page, limit }
    assert.ok(Array.isArray(body.data), 'body.data must be an array');
    assert.ok(typeof body.total === 'number', 'body.total must be a number');
    assert.ok(typeof body.page === 'number', 'body.page must be a number');
    assert.ok(typeof body.limit === 'number', 'body.limit must be a number');

    // Crucial: No duplicate 'users' array
    assert.equal(
      body.users,
      undefined,
      'Response must NOT return duplicate "users" array; only "data"'
    );

    // Verify user records schema
    for (const user of body.data) {
      assert.ok(user.id, 'User must have id');
      assert.ok(user.fullName, 'User must have fullName');
      assert.ok(user.email, 'User must have email');
      assert.ok(user.role, 'User must have role');
      assert.ok(user.status, 'User must have status');
      assert.ok(typeof user.mfaEnabled === 'boolean', 'User must have boolean mfaEnabled');
      assert.ok(user.lastActive, 'User must have lastActive');
      assert.ok(user.createdAt, 'User must have createdAt');

      // Crucial: Forbidden duplicate/inappropriate fields
      assert.equal(user.name, undefined, 'User must NOT duplicate "name" with fullName');
      assert.equal(user.firm, undefined, 'User must NOT duplicate "firm"');
      assert.equal(user.firmName, undefined, 'User must NOT duplicate "firmName"');
      assert.equal(user.membershipStatus, undefined, 'User must NOT duplicate "membershipStatus"');
      assert.equal(user.accountStatus, undefined, 'User must NOT duplicate "accountStatus"');
      assert.equal(user.mfaStatus, undefined, 'User must NOT duplicate "mfaStatus"');
      assert.equal(user.department, undefined, 'User must NOT have unrequested department field');
      assert.equal(user.phone, undefined, 'User must NOT have fabricated phone numbers');

      // Development synthetic users must use non-deliverable example domains
      assert.ok(
        user.email.endsWith('@example.test') || user.email.endsWith('@avenquis.internal'),
        `User email ${user.email} must be a safe synthetic test email`
      );
    }
  });

  test('6. GET /professional-members provides ICAB public reference directory separated from application users', async () => {
    const res = await fetch(`${baseUrl}/professional-members`);
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.ok(Array.isArray(body.data), 'body.data must be an array');
    assert.ok(body.data.length > 0, 'Should return ICAB member reference records');

    for (const member of body.data) {
      assert.ok(member.id);
      assert.ok(member.fullName);
      assert.ok(member.enrolmentNo, 'ICAB member must have enrolmentNo');
      assert.ok(['FCA', 'ACA'].includes(member.membershipType), 'Must be FCA or ACA');
      assert.ok(member.city);
    }
  });

  test('7. POST /access-requests/:id/approve updates request state', async () => {
    const res = await fetch(`${baseUrl}/access-requests/req-001/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Accreditation verified' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.status, 'approved');
    assert.equal(body.data.reviewer, 'Platform Super Admin');
  });

  test('8. POST /firms/:id/suspend updates firm state and logs reason', async () => {
    const res = await fetch(`${baseUrl}/firms/firm-006/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Payment default notice' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.status, 'suspended');
    assert.equal(body.data.auditReason, 'Payment default notice');
  });

  test('9. Unknown route returns 404 with structured error contract', async () => {
    const res = await fetch(`${baseUrl}/unknown-route-12345`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.error);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.message.includes('not found'));
  });

  test('10. Invalid ID operations return 404 with structured error contract', async () => {
    // Non-existent firm
    const resFirm = await fetch(`${baseUrl}/firms/non-existent-id`);
    assert.equal(resFirm.status, 404);
    const bodyFirm = await resFirm.json();
    assert.ok(bodyFirm.error);
    assert.equal(bodyFirm.error.code, 'NOT_FOUND');

    // Suspend non-existent firm
    const resSuspend = await fetch(`${baseUrl}/firms/non-existent-id/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(resSuspend.status, 404);
    const bodySuspend = await resSuspend.json();
    assert.ok(bodySuspend.error);
    assert.equal(bodySuspend.error.code, 'NOT_FOUND');

    // Approve non-existent access request
    const resReq = await fetch(`${baseUrl}/access-requests/non-existent-id/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(resReq.status, 404);
    const bodyReq = await resReq.json();
    assert.ok(bodyReq.error);
    assert.equal(bodyReq.error.code, 'NOT_FOUND');
  });
});
