import { db } from './database.js';

function normalizeRequest(row: any) {
  return {
    ...row,
    firmName: row.firm_name,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requestType: row.request_type,
    requestedRole: row.requested_role,
    assignedRole: row.assigned_role,
    assignedFirmId: row.assigned_firm_id,
    firmSize: row.firm_size,
    submittedAt: row.submitted_at,
    riskScore: row.risk_score,
    requestNotes: row.request_notes,
    internalNote: row.internal_note,
    reviewerId: row.reviewer_id,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const accessRequestRepo = {
  async createAccessRequest(input: {
    firmName: string;
    requesterName: string;
    requesterEmail: string;
    requestType?: string;
    requestedRole?: string;
    jurisdiction?: string;
    firmSize?: string;
    requestNotes?: string;
  }) {
    const result = await db.query(
      `
      INSERT INTO cp_access_requests (
        id,
        firm_name,
        requester_name,
        requester_email,
        request_type,
        requested_role,
        jurisdiction,
        firm_size,
        submitted_at,
        status,
        risk_score,
        request_notes,
        created_at,
        updated_at
      )
      VALUES (
        'req-' || gen_random_uuid()::text,
        $1,
        $2,
        lower($3),
        $4,
        $5,
        $6,
        $7,
        now(),
        'pending',
        'Low',
        $8,
        now(),
        now()
      )
      RETURNING *
      `,
      [
        input.firmName.trim(),
        input.requesterName.trim(),
        input.requesterEmail.trim(),
        input.requestType ?? 'New Firm Accreditation',
        input.requestedRole ?? 'FIRM_ADMIN',
        input.jurisdiction ?? 'Bangladesh',
        input.firmSize ?? '1-5',
        input.requestNotes ?? null,
      ],
    );

    return normalizeRequest(result.rows[0]);
  },

  async getAccessRequests(filters: {
    search?: string;
    status?: string;
    requestType?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const result = await db.query(`
      SELECT *
      FROM cp_access_requests
      ORDER BY submitted_at DESC
    `);

    let list = result.rows.map(normalizeRequest);

    if (filters.search) {
      const q = filters.search.toLowerCase();

      list = list.filter((r) =>
        String(r.firmName ?? '').toLowerCase().includes(q) ||
        String(r.requesterName ?? '').toLowerCase().includes(q) ||
        String(r.requesterEmail ?? '').toLowerCase().includes(q)
      );
    }

    if (filters.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status);
    }

    if (filters.requestType && filters.requestType !== 'all') {
      list = list.filter(
        (r) =>
          String(r.requestType ?? '').toLowerCase() ===
          filters.requestType!.toLowerCase()
      );
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const start = (page - 1) * limit;
    const data = list.slice(start, start + limit);

    return {
      requests: data,
      data,
      accessRequests: data,
      total: list.length,
      page,
      limit,
    };
  },

  async getAccessRequestById(id: string) {
    const result = await db.query(
      `
      SELECT *
      FROM cp_access_requests
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    return result.rows[0]
      ? normalizeRequest(result.rows[0])
      : null;
  },

  async approveAccessRequest(
    id: string,
    reviewer: string,
    note?: string,
    assignedRole?: string,
  ) {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const requestResult = await client.query(
        `
        SELECT *
        FROM cp_access_requests
        WHERE id = $1
        FOR UPDATE
        `,
        [id],
      );

      const request = requestResult.rows[0];

      if (!request) {
        await client.query('ROLLBACK');
        return null;
      }

      let assignedFirmId =
        request.assigned_firm_id ?? null;

      const requestType =
        String(request.request_type ?? '');

      if (
        requestType
          .toLowerCase()
          .includes('accreditation') &&
        !assignedFirmId
      ) {
        const existingFirm = await client.query(
          `
          SELECT id
          FROM cp_firms
          WHERE lower(name) = lower($1)
          LIMIT 1
          `,
          [request.firm_name],
        );

        if (existingFirm.rows[0]) {
          assignedFirmId =
            existingFirm.rows[0].id;
        } else {
          const newFirmResult =
            await client.query(
              `
              INSERT INTO cp_firms (
                id,
                name,
                subdomain,
                status,
                plan,
                subscription_status,
                contact_email,
                contact_name,
                user_count,
                mrr,
                tier,
                storage_used_gb,
                compliance_score,
                created_at,
                updated_at
              )
              VALUES (
                'firm-' || gen_random_uuid()::text,
                $1,
                LEFT(
                  regexp_replace(
                    lower($1),
                    '[^a-z0-9]',
                    '',
                    'g'
                  ),
                  12
                )
                || '-'
                || LEFT(
                  replace(
                    gen_random_uuid()::text,
                    '-',
                    ''
                  ),
                  6
                ),
                'active',
                'Enterprise',
                'trialing',
                $2,
                $3,
                1,
                145000,
                'Newly Accredited Chamber',
                1,
                100,
                now(),
                now()
              )
              RETURNING id
              `,
              [
                request.firm_name,
                request.requester_email,
                request.requester_name,
              ],
            );

          assignedFirmId =
            newFirmResult.rows[0].id;
        }
      }

      const updatedResult =
        await client.query(
          `
          UPDATE cp_access_requests
          SET
            status = 'approved',
            reviewer = $2,
            reviewed_at = now(),
            internal_note =
              COALESCE($3, internal_note),
            assigned_role =
              COALESCE($4, assigned_role),
            assigned_firm_id = $5,
            rejection_reason = NULL,
            updated_at = now()
          WHERE id = $1
          RETURNING *
          `,
          [
            id,
            reviewer,
            note ?? null,
            assignedRole ?? null,
            assignedFirmId,
          ],
        );

      await client.query(
        `
        INSERT INTO cp_audit_events (
          id,
          actor,
          actor_id,
          action,
          target_type,
          target_id,
          target_name,
          details,
          timestamp,
          created_at
        )
        VALUES (
          'aud-' || gen_random_uuid()::text,
          $1,
          'usr-002',
          'ACCESS_REQUEST_APPROVED',
          'ACCESS_REQUEST',
          $2,
          $3,
          $4::jsonb,
          now(),
          now()
        )
        `,
        [
          reviewer,
          id,
          request.firm_name,
          JSON.stringify({
            note: note ?? null,
            assignedRole:
              assignedRole ?? null,
            assignedFirmId,
          }),
        ],
      );

      await client.query('COMMIT');

      return normalizeRequest(
        updatedResult.rows[0],
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async rejectAccessRequest(
    id: string,
    reason: string,
    reviewer: string,
  ) {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const requestResult = await client.query(
        `
        SELECT *
        FROM cp_access_requests
        WHERE id = $1
        FOR UPDATE
        `,
        [id],
      );

      const request = requestResult.rows[0];

      if (!request) {
        await client.query('ROLLBACK');
        return null;
      }

      const updatedResult =
        await client.query(
          `
          UPDATE cp_access_requests
          SET
            status = 'rejected',
            reviewer = $2,
            reviewed_at = now(),
            rejection_reason = $3,
            updated_at = now()
          WHERE id = $1
          RETURNING *
          `,
          [id, reviewer, reason],
        );

      await client.query(
        `
        INSERT INTO cp_audit_events (
          id,
          actor,
          actor_id,
          action,
          target_type,
          target_id,
          target_name,
          details,
          timestamp,
          created_at
        )
        VALUES (
          'aud-' || gen_random_uuid()::text,
          $1,
          'usr-002',
          'ACCESS_REQUEST_REJECTED',
          'ACCESS_REQUEST',
          $2,
          $3,
          $4::jsonb,
          now(),
          now()
        )
        `,
        [
          reviewer,
          id,
          request.firm_name,
          JSON.stringify({ reason }),
        ],
      );

      await client.query('COMMIT');

      return normalizeRequest(
        updatedResult.rows[0],
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};


