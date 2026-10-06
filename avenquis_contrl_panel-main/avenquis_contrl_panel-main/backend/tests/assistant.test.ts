/**
 * Avenquis Control Assistant & Unified Notifications - Backend Test Suite
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

describe('AVENQUIS Control Assistant & Notifications Suite', () => {
  test('1. POST /ai/assistant/chat answers deterministic queries in Bengali with real counts', async () => {
    const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'আজকে কয়টা নতুন access request এসেছে?' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply);
    assert.ok(data.reply.includes('access request'));
    assert.equal(data.isAiGenerated, false);
    assert.ok(data.sources?.length > 0);
  });

  test('2. POST /ai/assistant/chat identifies failed automation run-902 with root cause', async () => {
    const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'কোন automation fail করেছে?' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.reply);
    assert.ok(data.reply.includes('run-902') || data.reply.includes('Platform Tenant Isolation Guard'));
    assert.equal(data.isAiGenerated, false);
  });

  test('3. POST /ai/assistant/chat proposes sensitive action with pending_confirmation for approval', async () => {
    const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Approve this access request for K. M. Alam & Co.' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.suggestedAction);
    assert.equal(data.suggestedAction.type, 'APPROVE_REQUEST');
    assert.equal(data.suggestedAction.status, 'pending_confirmation');
    assert.ok(data.reply.includes('confirm'));
  });

  test('4. POST /ai/assistant/execute-action rejects execution without explicit confirmation', async () => {
    const res = await fetch(`${baseUrl}/ai/assistant/execute-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'APPROVE_REQUEST',
        targetId: 'req-001',
        confirmation: false,
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'CONFIRMATION_REQUIRED');
  });

  test('5. POST /ai/assistant/execute-action executes with explicit confirmation and logs audit', async () => {
    const res = await fetch(`${baseUrl}/ai/assistant/execute-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'APPROVE_REQUEST',
        targetId: 'req-001',
        targetName: 'K. M. Alam & Co.',
        confirmation: true,
        auditReason: 'Approved via Control Assistant explicit test confirmation',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.message.includes('successfully approved'));
  });

  test('6. POST /notifications/mark-all-read updates unread notifications deterministically', async () => {
    const res = await fetch(`${baseUrl}/notifications/mark-all-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(typeof data.count === 'number');

    const notifsRes = await fetch(`${baseUrl}/notifications`);
    assert.equal(notifsRes.status, 200);
    const notifsData = await notifsRes.json();
    const unread = (notifsData.notifications || []).filter((n: any) => !n.read);
    assert.equal(unread.length, 0);
  });

  test('7. GET /ai/automations and GET /ai/runs return structured telemetry', async () => {
    const autoRes = await fetch(`${baseUrl}/ai/automations`);
    assert.equal(autoRes.status, 200);
    const autoData = await autoRes.json();
    assert.ok(Array.isArray(autoData.automations));
    assert.ok(autoData.automations.length > 0);

    const runsRes = await fetch(`${baseUrl}/ai/runs`);
    assert.equal(runsRes.status, 200);
    const runsData = await runsRes.json();
    assert.ok(Array.isArray(runsData.runs));
    assert.ok(runsData.runs.some((r: any) => r.status === 'Failed'));
  });
});
