import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readStore() {
  const storePath = path.resolve(__dirname, '../../data/store.json');
  const raw = await fs.readFile(storePath, 'utf8');
  return JSON.parse(raw);
}

async function importData() {
  const store = await readStore();

  console.log('Source data found:');
  console.log({
    firms: store.firms?.length ?? 0,
    users: store.users?.length ?? 0,
    professionalMembers: store.professionalMembers?.length ?? 0,
    accessRequests: store.accessRequests?.length ?? 0,
    plans: store.plans?.length ?? 0,
    subscriptions: store.subscriptions?.length ?? 0,
    invoices: store.invoices?.length ?? 0,
    supportTickets: store.supportTickets?.length ?? 0,
    notifications: store.notifications?.length ?? 0,
    aiApprovals: store.aiApprovals?.length ?? 0,
    auditEvents: store.auditEvents?.length ?? 0,
  });

  await db.query('BEGIN');

  try {
    for (const item of store.firms ?? []) {
      await db.query(
        `
        INSERT INTO cp_firms (
          id, name, subdomain, status, plan, subscription_status,
          contact_email, contact_name, user_count, mrr, tier,
          storage_used_gb, compliance_score, suspended_reason,
          suspended_at, created_at, updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          subdomain = EXCLUDED.subdomain,
          status = EXCLUDED.status,
          plan = EXCLUDED.plan,
          subscription_status = EXCLUDED.subscription_status,
          contact_email = EXCLUDED.contact_email,
          contact_name = EXCLUDED.contact_name,
          user_count = EXCLUDED.user_count,
          mrr = EXCLUDED.mrr,
          tier = EXCLUDED.tier,
          storage_used_gb = EXCLUDED.storage_used_gb,
          compliance_score = EXCLUDED.compliance_score,
          suspended_reason = EXCLUDED.suspended_reason,
          suspended_at = EXCLUDED.suspended_at,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          item.name,
          item.subdomain,
          item.status ?? 'active',
          item.plan ?? 'Professional',
          item.subscription_status ?? item.subscriptionStatus ?? 'active',
          item.contact_email ?? item.contactEmail ?? `${item.id}@example.invalid`,
          item.contact_name ?? item.contactName ?? item.name ?? 'Unknown',
          item.user_count ?? item.userCount ?? 0,
          item.mrr ?? 0,
          item.tier ?? item.plan ?? 'Standard Firm',
          item.storage_used_gb ?? item.storageUsedGb ?? 0,
          item.compliance_score ?? item.complianceScore ?? 100,
          item.suspended_reason ?? item.suspendedReason ?? null,
          item.suspended_at ?? item.suspendedAt ?? null,
          item.created_at ?? item.createdAt ?? new Date(),
          item.updated_at ?? item.updatedAt ?? new Date(),
        ],
      );
    }

    const firmResult = await db.query(
      `SELECT id, name, contact_email FROM cp_firms`,
    );

    const firmsById = new Map();

    for (const firm of firmResult.rows) {
      firmsById.set(firm.id, {
        name: firm.name,
        contact_email: firm.contact_email,
      });
    }

    for (const item of store.users ?? []) {
      const firmId = item.firmId ?? item.firm_id ?? null;
      const firm = firmId ? firmsById.get(firmId) : undefined;

      await db.query(
        `
        INSERT INTO cp_users (
          id, firm_id, firm_name, full_name, email, role,
          status, last_active, mfa_enabled, department, phone,
          created_at, updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )
        ON CONFLICT (id) DO UPDATE SET
          firm_id = EXCLUDED.firm_id,
          firm_name = EXCLUDED.firm_name,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          last_active = EXCLUDED.last_active,
          mfa_enabled = EXCLUDED.mfa_enabled,
          department = EXCLUDED.department,
          phone = EXCLUDED.phone,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          firmId,
          firm?.name ?? 'Platform Administration',
          item.fullName ?? item.full_name,
          item.email,
          item.role ?? 'MEMBER',
          item.status ?? 'active',
          item.lastActive ?? item.last_active ?? new Date(),
          item.mfaEnabled ?? item.mfa_enabled ?? false,
          item.department ?? item.designation ?? 'Legal Operations',
          item.phone ?? null,
          item.createdAt ?? item.created_at ?? new Date(),
          item.updatedAt ?? item.updated_at ?? new Date(),
        ],
      );
    }

    for (const item of store.professionalMembers ?? []) {
      await db.query(
        `
        INSERT INTO cp_professional_members (
          id, full_name, membership_type, enrolment_no,
          firm_id, city, source, source_updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          membership_type = EXCLUDED.membership_type,
          enrolment_no = EXCLUDED.enrolment_no,
          firm_id = EXCLUDED.firm_id,
          city = EXCLUDED.city,
          source = EXCLUDED.source,
          source_updated_at = EXCLUDED.source_updated_at,
          updated_at = now()
        `,
        [
          item.id,
          item.fullName ?? item.full_name,
          item.membershipType ?? item.membership_type,
          item.enrolmentNo ?? item.enrolment_no,
          item.firmId ?? item.firm_id ?? null,
          item.city ?? null,
          item.source ?? null,
          item.sourceUpdatedAt ?? item.source_updated_at ?? null,
        ],
      );
    }

    for (const item of store.accessRequests ?? []) {
      await db.query(
        `
        INSERT INTO cp_access_requests (
          id, firm_name, requester_name, requester_email,
          request_type, requested_role, assigned_role,
          assigned_firm_id, jurisdiction, firm_size,
          submitted_at, status, risk_score, request_notes,
          internal_note, reviewer, reviewer_id,
          reviewed_at, rejection_reason, created_at, updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          assigned_role = EXCLUDED.assigned_role,
          assigned_firm_id = EXCLUDED.assigned_firm_id,
          internal_note = EXCLUDED.internal_note,
          reviewer = EXCLUDED.reviewer,
          reviewer_id = EXCLUDED.reviewer_id,
          reviewed_at = EXCLUDED.reviewed_at,
          rejection_reason = EXCLUDED.rejection_reason,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          item.firm_name,
          item.requester_name,
          item.requester_email,
          item.request_type,
          item.requested_role,
          item.assigned_role ?? null,
          item.assigned_firm_id ?? item.assignedFirmId ?? null,
          item.jurisdiction,
          item.firm_size,
          item.submitted_at,
          item.status,
          item.risk_score,
          item.request_notes ?? null,
          item.internal_note ?? item.internalNote ?? null,
          item.reviewer ?? null,
          item.reviewer_id ?? null,
          item.reviewed_at ?? item.reviewedAt ?? null,
          item.rejection_reason ?? null,
          item.created_at ?? item.submitted_at ?? new Date(),
          item.updated_at ?? item.submitted_at ?? new Date(),
        ],
      );
    }

    for (const item of store.plans ?? []) {
      await db.query(
        `
        INSERT INTO cp_plans (
          id, name, code, price_per_seat_monthly,
          base_platform_fee_monthly, features,
          active_firms_count, status, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          price_per_seat_monthly = EXCLUDED.price_per_seat_monthly,
          base_platform_fee_monthly = EXCLUDED.base_platform_fee_monthly,
          features = EXCLUDED.features,
          active_firms_count = EXCLUDED.active_firms_count,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          item.name,
          item.code,
          item.price_per_seat_monthly ?? 0,
          item.base_platform_fee_monthly ?? 0,
          JSON.stringify(item.features ?? []),
          item.active_firms_count ?? 0,
          item.status ?? 'active',
          item.created_at ?? new Date(),
          item.updated_at ?? new Date(),
        ],
      );
    }

    for (const item of store.subscriptions ?? []) {
      await db.query(
        `
        INSERT INTO cp_subscriptions (
          id, firm_id, plan_id, plan_name, status,
          seat_count, monthly_amount, billing_interval,
          created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO UPDATE SET
          firm_id = EXCLUDED.firm_id,
          plan_id = EXCLUDED.plan_id,
          plan_name = EXCLUDED.plan_name,
          status = EXCLUDED.status,
          seat_count = EXCLUDED.seat_count,
          monthly_amount = EXCLUDED.monthly_amount,
          billing_interval = EXCLUDED.billing_interval,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          item.firm_id,
          item.plan_id ?? null,
          item.plan_name,
          item.status ?? 'active',
          item.seat_count ?? 1,
          item.monthly_amount ?? 0,
          item.billing_interval ?? 'monthly',
          item.created_at ?? new Date(),
          item.updated_at ?? new Date(),
        ],
      );
    }

    for (const item of store.invoices ?? []) {
      const firm = firmsById.get(item.firm_id);

      await db.query(
        `
        INSERT INTO cp_invoices (
          id, firm_id, firm_name, amount, status,
          due_date, overdue_days, contact_email,
          plan_tier, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          firm_name = EXCLUDED.firm_name,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          due_date = EXCLUDED.due_date,
          overdue_days = EXCLUDED.overdue_days,
          contact_email = EXCLUDED.contact_email,
          plan_tier = EXCLUDED.plan_tier,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          item.firm_id,
          item.firm_name,
          item.amount ?? 0,
          item.status ?? 'current',
          item.due_date ?? new Date(),
          item.overdue_days ?? 0,
          item.contact_email ??
            firm?.contact_email ??
            `${item.firm_id}@example.invalid`,
          item.plan_tier ?? 'Professional',
          item.created_at ?? new Date(),
          item.updated_at ?? new Date(),
        ],
      );
    }

    for (const item of store.supportTickets ?? []) {
      await db.query(
        `
        INSERT INTO cp_support_tickets (
          id, ticket_number, firm_id, firm_name, subject,
          status, priority, assigned_to, category,
          created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          assigned_to = EXCLUDED.assigned_to,
          category = EXCLUDED.category,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          item.ticket_number,
          item.firm_id ?? null,
          item.firm_name,
          item.subject,
          item.status ?? 'open',
          item.priority ?? 'Medium',
          item.assigned_to ?? 'Support Team',
          item.category ?? 'Technical',
          item.created_at ?? new Date(),
          item.updated_at ?? new Date(),
        ],
      );
    }

    for (const item of store.notifications ?? []) {
      await db.query(
        `
        INSERT INTO cp_notifications (
          id, title, message, severity, type,
          read, link, target_role, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          severity = EXCLUDED.severity,
          type = EXCLUDED.type,
          read = EXCLUDED.read,
          link = EXCLUDED.link,
          target_role = EXCLUDED.target_role,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          item.title,
          item.message,
          item.severity ?? 'info',
          item.type ?? 'system',
          item.read ?? false,
          item.link ?? null,
          item.target_role ?? 'PLATFORM_SUPER_ADMIN',
          item.created_at ?? new Date(),
          item.updated_at ?? new Date(),
        ],
      );
    }

    for (const item of store.aiApprovals ?? []) {
      await db.query(
        `
        INSERT INTO cp_ai_approvals (
          id, type, title, firm_name, firm_id,
          risk_level, status, requested_by,
          details, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          risk_level = EXCLUDED.risk_level,
          status = EXCLUDED.status,
          details = EXCLUDED.details,
          updated_at = EXCLUDED.updated_at
        `,
        [
          item.id,
          item.type,
          item.title,
          item.firm_name,
          item.firm_id ?? null,
          item.risk_level ?? 'Low',
          item.status ?? 'pending',
          item.requested_by,
          JSON.stringify(item.details ?? {}),
          item.created_at ?? new Date(),
          item.updated_at ?? new Date(),
        ],
      );
    }

    for (const item of store.auditEvents ?? []) {
      await db.query(
        `
        INSERT INTO cp_audit_events (
          id, actor, actor_id, action, target_type,
          target_id, target_name, details,
          ip_address, timestamp, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          item.id,
          item.actor ?? 'Unknown',
          item.actor_id ?? 'unknown',
          item.action,
          item.target_type,
          item.target_id,
          item.target_name ?? null,
          JSON.stringify(item.details ?? {}),
          item.ip_address ?? null,
          item.timestamp ?? item.created_at ?? new Date(),
          item.created_at ?? item.timestamp ?? new Date(),
        ],
      );
    }

    await db.query('COMMIT');
    console.log('Store data migrated to Neon successfully.');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

importData()
  .then(async () => {
    await db.end();
  })
  .catch(async (error) => {
    console.error('Store migration failed:');
    console.error(error);
    await db.end();
    process.exitCode = 1;
  });
