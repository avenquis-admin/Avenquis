import { db } from './database.js';

export const neonRepo = {
  async getFirms(filters: {
    search?: string;
    status?: string;
    plan?: string;
    subscriptionStatus?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const result = await db.query(`
      SELECT
        id,
        name,
        subdomain,
        status,
        plan,
        subscription_status AS "subscriptionStatus",
        contact_email AS "contactEmail",
        contact_name AS "contactName",
        user_count AS "userCount",
        mrr,
        tier,
        storage_used_gb AS "storageUsedGb",
        compliance_score AS "complianceScore",
        suspended_reason AS "suspendedReason",
        suspended_at AS "suspendedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cp_firms
      ORDER BY created_at DESC
    `);

    let list = result.rows;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((firm) =>
        String(firm.name ?? '').toLowerCase().includes(q) ||
        String(firm.subdomain ?? '').toLowerCase().includes(q) ||
        String(firm.contactName ?? '').toLowerCase().includes(q) ||
        String(firm.contactEmail ?? '').toLowerCase().includes(q)
      );
    }

    if (filters.status && filters.status !== 'all') {
      list = list.filter((firm) => firm.status === filters.status);
    }

    if (filters.plan && filters.plan !== 'all') {
      list = list.filter(
        (firm) =>
          String(firm.plan ?? '').toLowerCase() ===
          filters.plan!.toLowerCase()
      );
    }

    if (
      filters.subscriptionStatus &&
      filters.subscriptionStatus !== 'all'
    ) {
      list = list.filter(
        (firm) =>
          String(firm.subscriptionStatus ?? '').toLowerCase() ===
          filters.subscriptionStatus!.toLowerCase()
      );
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      firms: paginated,
      data: paginated,
      total: list.length,
      page,
      limit,
    };
  },

  async getFirmById(id: string) {
    const result = await db.query(
      `
      SELECT
        id,
        name,
        subdomain,
        status,
        plan,
        subscription_status AS "subscriptionStatus",
        contact_email AS "contactEmail",
        contact_name AS "contactName",
        user_count AS "userCount",
        mrr,
        tier,
        storage_used_gb AS "storageUsedGb",
        compliance_score AS "complianceScore",
        suspended_reason AS "suspendedReason",
        suspended_at AS "suspendedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cp_firms
      WHERE id = $1 OR subdomain = $1
      LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async suspendFirm(id: string, reason: string) {
    const result = await db.query(
      `
      UPDATE cp_firms
      SET
        status = 'suspended',
        suspended_reason = $2,
        suspended_at = now(),
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        name,
        subdomain,
        status,
        plan,
        subscription_status AS "subscriptionStatus",
        contact_email AS "contactEmail",
        contact_name AS "contactName",
        user_count AS "userCount",
        mrr,
        tier,
        storage_used_gb AS "storageUsedGb",
        compliance_score AS "complianceScore",
        suspended_reason AS "suspendedReason",
        suspended_at AS "suspendedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [id, reason],
    );

    return result.rows[0] ?? null;
  },

  async activateFirm(id: string) {
    const result = await db.query(
      `
      UPDATE cp_firms
      SET
        status = 'active',
        suspended_reason = NULL,
        suspended_at = NULL,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        name,
        subdomain,
        status,
        plan,
        subscription_status AS "subscriptionStatus",
        contact_email AS "contactEmail",
        contact_name AS "contactName",
        user_count AS "userCount",
        mrr,
        tier,
        storage_used_gb AS "storageUsedGb",
        compliance_score AS "complianceScore",
        suspended_reason AS "suspendedReason",
        suspended_at AS "suspendedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async getUsers(filters: {
    search?: string;
    role?: string;
    status?: string;
    firmId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const result = await db.query(`
      SELECT
        id,
        firm_id AS "firmId",
        firm_name AS "firmName",
        full_name AS "fullName",
        email,
        role,
        status,
        last_active AS "lastActive",
        mfa_enabled AS "mfaEnabled",
        department,
        phone,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cp_users
      ORDER BY created_at DESC
    `);

    let list = result.rows;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((user) =>
        String(user.fullName ?? '').toLowerCase().includes(q) ||
        String(user.email ?? '').toLowerCase().includes(q) ||
        String(user.department ?? '').toLowerCase().includes(q)
      );
    }

    if (filters.role && filters.role !== 'all') {
      list = list.filter((user) => user.role === filters.role);
    }

    if (filters.status && filters.status !== 'all') {
      list = list.filter((user) => user.status === filters.status);
    }

    if (filters.firmId && filters.firmId !== 'all') {
      list = list.filter((user) => user.firmId === filters.firmId);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      data: paginated,
      total: list.length,
      page,
      limit,
    };
  },

  async getUserById(id: string) {
    const result = await db.query(
      `
      SELECT
        id,
        firm_id AS "firmId",
        firm_name AS "firmName",
        full_name AS "fullName",
        email,
        role,
        status,
        last_active AS "lastActive",
        mfa_enabled AS "mfaEnabled",
        department,
        phone,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cp_users
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async disableUser(id: string) {
    const result = await db.query(
      `
      UPDATE cp_users
      SET
        status = 'suspended',
        disabled_reason = 'Disabled from Control Panel',
        disabled_at = now(),
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        firm_id AS "firmId",
        firm_name AS "firmName",
        full_name AS "fullName",
        email,
        role,
        status,
        last_active AS "lastActive",
        mfa_enabled AS "mfaEnabled",
        department,
        phone,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async enableUser(id: string) {
    const result = await db.query(
      `
      UPDATE cp_users
      SET
        status = 'active',
        disabled_reason = NULL,
        disabled_at = NULL,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        firm_id AS "firmId",
        firm_name AS "firmName",
        full_name AS "fullName",
        email,
        role,
        status,
        last_active AS "lastActive",
        mfa_enabled AS "mfaEnabled",
        department,
        phone,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [id],
    );

    return result.rows[0] ?? null;
  },

  async getProfessionalMembers(filters: {
    search?: string;
    membershipType?: string;
    firmId?: string;
  } = {}) {
    const result = await db.query(`
      SELECT
        id,
        full_name AS "fullName",
        membership_type AS "membershipType",
        enrolment_no AS "enrolmentNo",
        firm_id AS "firmId",
        city,
        source,
        source_updated_at AS "sourceUpdatedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM cp_professional_members
      ORDER BY full_name ASC
    `);

    let list = result.rows;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((member) =>
        String(member.fullName ?? '').toLowerCase().includes(q) ||
        String(member.enrolmentNo ?? '').toLowerCase().includes(q) ||
        String(member.city ?? '').toLowerCase().includes(q)
      );
    }

    if (filters.membershipType && filters.membershipType !== 'all') {
      list = list.filter(
        (member) => member.membershipType === filters.membershipType
      );
    }

    if (filters.firmId && filters.firmId !== 'all') {
      list = list.filter(
        (member) => member.firmId === filters.firmId
      );
    }

    return {
      data: list,
      total: list.length,
    };
  },
};
