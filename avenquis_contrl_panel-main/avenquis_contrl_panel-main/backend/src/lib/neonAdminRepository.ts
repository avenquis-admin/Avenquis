import { db } from './database.js';

export const neonAdminRepo = {
  async getCollections() {
    const result = await db.query(`
      SELECT
        id,
        firm_id,
        firm_name,
        amount,
        status,
        due_date,
        overdue_days,
        contact_email,
        plan_tier,
        created_at,
        updated_at
      FROM cp_invoices
      ORDER BY due_date ASC
    `);

    const collections = result.rows.map((inv) => ({
      ...inv,
      firm: inv.firm_name || 'Firm',
      plan: inv.plan_tier || 'Enterprise',
      outstandingAmount:
        '৳' + Number(inv.amount || 0).toLocaleString('en-US'),
      dueDate: inv.due_date,
      age: `${inv.overdue_days ?? 0}d`,
      status:
        inv.status === 'overdue'
          ? 'Overdue'
          : inv.status === 'paid'
            ? 'Current'
            : 'Due Soon',
    }));

    return {
      collections,
      data: collections,
      total: collections.length,
    };
  },

  async getInvoices() {
    const result = await db.query(`
      SELECT
        id,
        firm_id,
        firm_name,
        amount,
        status,
        due_date,
        overdue_days,
        contact_email,
        plan_tier,
        created_at,
        updated_at
      FROM cp_invoices
      ORDER BY created_at DESC
    `);

    const invoices = result.rows.map((inv) => {
      const amount = Number(inv.amount || 0);

      return {
        ...inv,
        invoiceNumber: String(inv.id || 'INV-000').toUpperCase(),
        firm: inv.firm_name || 'Firm',
        plan: inv.plan_tier || 'Enterprise',
        seats: 25,
        amount,
        tax: Math.round(amount * 0.15),
        total: Math.round(amount * 1.15),
        status:
          inv.status === 'paid'
            ? 'Paid'
            : inv.status === 'overdue'
              ? 'Overdue'
              : 'Pending',
        issueDate: inv.created_at,
        dueDate: inv.due_date,
      };
    });

    return {
      invoices,
      data: invoices,
      total: invoices.length,
    };
  },

  async getGateways() {
    const gateways = [
      {
        id: 'gw-01',
        provider: 'Standard Chartered Direct Wire',
        status: 'Operational',
        environment: 'Production',
        currency: 'BDT',
        webhookHealth: '99.98%',
        lastPing: '2s ago',
      },
      {
        id: 'gw-02',
        provider: 'City Bank Institutional RTGS',
        status: 'Operational',
        environment: 'Production',
        currency: 'BDT',
        webhookHealth: '99.95%',
        lastPing: '14s ago',
      },
      {
        id: 'gw-03',
        provider: 'Stripe International (Cross-Border)',
        status: 'Operational',
        environment: 'Production',
        currency: 'USD',
        webhookHealth: '100%',
        lastPing: '1s ago',
      },
    ];

    return {
      gateways,
      data: gateways,
      total: gateways.length,
    };
  },

  async getNotifications() {
    const result = await db.query(`
      SELECT
        id,
        title,
        message,
        severity,
        type,
        read,
        link,
        target_role AS "targetRole",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cp_notifications
      ORDER BY created_at DESC
    `);

    return {
      notifications: result.rows,
      data: result.rows,
      total: result.rows.length,
    };
  },

  async markNotificationRead(id: string) {
    const result = await db.query(
      `
      UPDATE cp_notifications
      SET
        read = true,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        title,
        message,
        severity,
        type,
        read,
        link,
        target_role AS "targetRole",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async markAllNotificationsRead() {
    const result = await db.query(`
      UPDATE cp_notifications
      SET
        read = true,
        updated_at = now()
      WHERE read = false
      RETURNING id
    `);

    return result.rowCount ?? 0;
  },

  async getAuditEvents() {
    const result = await db.query(`
      SELECT
        id,
        actor,
        actor_id AS "actorId",
        action,
        target_type AS "targetType",
        target_id AS "targetId",
        target_name AS "targetName",
        details,
        ip_address AS "ipAddress",
        user_agent AS "userAgent",
        timestamp,
        created_at AS "createdAt"
      FROM cp_audit_events
      ORDER BY timestamp DESC
    `);

    return {
      events: result.rows,
      data: result.rows,
      total: result.rows.length,
    };
  },
};
