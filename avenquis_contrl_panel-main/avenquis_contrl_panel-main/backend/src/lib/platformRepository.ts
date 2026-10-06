import { accessRequestRepo } from './accessRequestRepository.js';
import { db, checkDatabaseConnection } from './database.js';
import { neonAdminRepo } from './neonAdminRepository.js';
import { neonRepo } from './neonRepository.js';
import { phase1Repo } from './phase1Repository.js';
import { store } from './store.js';

export const platformRepo = {
  getFirms: neonRepo.getFirms,
  getUsers: neonRepo.getUsers,
  getAccessRequests: accessRequestRepo.getAccessRequests,
  approveAccessRequest: accessRequestRepo.approveAccessRequest,
  rejectAccessRequest: accessRequestRepo.rejectAccessRequest,
  getAuditEvents: neonAdminRepo.getAuditEvents,
  getNotifications: neonAdminRepo.getNotifications,
  markAllNotificationsRead: neonAdminRepo.markAllNotificationsRead,
  getPlans: phase1Repo.getPlans,

  async suspendFirm(id: string, reason?: string) {
    return neonRepo.suspendFirm(id, reason ?? 'Administrative suspension');
  },

  async getRecentAccessRequests(limit = 5) {
    return accessRequestRepo.getAccessRequests({ page: 1, limit });
  },

  async getSupportTickets() {
    const result = await db.query(`
      SELECT id, ticket_number AS "ticketNumber", firm_id AS "firmId", firm_name AS "firmName",
        subject, status, priority, assigned_to AS "assignedTo", category,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM cp_support_tickets ORDER BY updated_at DESC
    `);
    return { tickets: result.rows, data: result.rows, total: result.rows.length };
  },

  async getSupportTicketById(id: string) {
    const result = await db.query(`SELECT * FROM cp_support_tickets WHERE id = $1 OR ticket_number = $1 LIMIT 1`, [id]);
    return result.rows[0] ?? null;
  },

  async getAiApprovals() {
    const result = await db.query(`SELECT * FROM cp_ai_approvals ORDER BY created_at DESC`);
    return { approvals: result.rows, data: result.rows, total: result.rows.length };
  },

  async getAiAutomations() {
    const data = store.getAiAutomations();
    return { automations: data, data, total: data.length };
  },

  async getAiRuns() {
    const data = store.getAiRuns();
    return { runs: data, data, total: data.length };
  },

  async getMetrics(range = '30d') {
    const result = await db.query(`
      SELECT
        (SELECT count(*)::int FROM cp_firms) AS total_firms,
        (SELECT count(*)::int FROM cp_firms WHERE status = 'active') AS active_firms,
        (SELECT count(*)::int FROM cp_users) AS total_users,
        (SELECT count(*)::int FROM cp_access_requests WHERE status = 'pending') AS pending_access_requests,
        (SELECT count(*)::int FROM cp_ai_approvals WHERE status = 'pending') AS pending_approvals,
        (SELECT coalesce(sum(monthly_amount), 0)::numeric FROM cp_subscriptions WHERE status IN ('active','trialing')) AS monthly_value,
        (SELECT coalesce(sum(amount), 0)::numeric FROM cp_invoices WHERE status = 'overdue') AS overdue_value,
        (SELECT count(*)::int FROM cp_support_tickets WHERE status IN ('open','in_progress')) AS open_support
    `);
    const row = result.rows[0];
    const metrics = [
      { id: 'm1', label: 'Total Firms', value: row.total_firms, targetPath: '/firms' },
      { id: 'm2', label: 'Active Firms', value: row.active_firms, targetPath: '/firms' },
      { id: 'm3', label: 'Total Users', value: row.total_users, targetPath: '/users' },
      { id: 'm4', label: 'Pending Access Requests', value: row.pending_access_requests, targetPath: '/access-requests' },
      { id: 'm5', label: 'Pending Approvals', value: row.pending_approvals, targetPath: '/ai/approvals' },
      { id: 'm6', label: 'Monthly Subscription Value', value: `৳${Number(row.monthly_value).toLocaleString('en-US')}`, targetPath: '/billing' },
      { id: 'm7', label: 'Overdue Collections', value: `৳${Number(row.overdue_value).toLocaleString('en-US')}`, targetPath: '/billing' },
      { id: 'm8', label: 'Open Support Issues', value: row.open_support, targetPath: '/support' },
    ];
    return {
      totalFirms: row.total_firms, activeFirms: row.active_firms, totalUsers: row.total_users,
      pendingAccessRequests: row.pending_access_requests, pendingApprovals: row.pending_approvals,
      monthlySubscriptionValue: metrics[5].value, overdueCollections: metrics[6].value,
      openSupportIssues: row.open_support, range, metrics,
    };
  },

  async getSystemStatus() {
    const started = Date.now();
    try {
      await checkDatabaseConnection();
      return [
        { name: 'Backend API', status: 'Healthy', latency: '0ms', region: 'application' },
        { name: 'Neon PostgreSQL', status: 'Healthy', latency: `${Date.now() - started}ms`, region: 'configured' },
        { name: 'Authentication foundation', status: 'Healthy', latency: '0ms', region: 'application' },
      ];
    } catch {
      return [
        { name: 'Backend API', status: 'Healthy', latency: '0ms', region: 'application' },
        { name: 'Neon PostgreSQL', status: 'Degraded', latency: `${Date.now() - started}ms`, region: 'configured' },
        { name: 'Authentication foundation', status: 'Degraded', latency: '0ms', region: 'application' },
      ];
    }
  },

  async logAuditEvent(input: {
    actor: string; actorId?: string; action: string; targetType: string;
    targetId: string; targetName?: string; details?: unknown; correlationId?: string;
  }) {
    const result = await db.query(`
      INSERT INTO cp_audit_events (
        id, actor, actor_id, action, target_type, target_id, target_name, details, correlation_id
      ) VALUES ('aud-' || gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING *
    `, [input.actor, input.actorId ?? 'system', input.action, input.targetType, input.targetId,
      input.targetName ?? null, JSON.stringify(input.details ?? {}), input.correlationId ?? null]);
    return result.rows[0];
  },
};
