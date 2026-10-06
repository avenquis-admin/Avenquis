import { ProvisioningCommand } from '../contracts/platform.js';
import { AppError } from '../middleware/errorHandler.js';
import { db } from './database.js';

export const phase1Repo = {
  async getPlans() {
    const result = await db.query(`
      SELECT id, name, code,
        price_per_seat_monthly AS "pricePerSeatMonthly",
        base_platform_fee_monthly AS "basePlatformFeeMonthly",
        features, active_firms_count AS "activeFirmsCount", status,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM cp_plans ORDER BY base_platform_fee_monthly ASC
    `);
    return result.rows;
  },

  async getSubscription(firmId: string) {
    const result = await db.query(`
      SELECT id, firm_id AS "firmId", plan_id AS "planId", plan_name AS "planName",
        status, seat_count AS "seatCount", monthly_amount AS "monthlyAmount",
        billing_interval AS "billingInterval", version,
        effective_from AS "effectiveFrom", effective_until AS "effectiveUntil",
        current_period_start AS "currentPeriodStart", current_period_end AS "currentPeriodEnd",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM cp_subscriptions WHERE firm_id = $1 ORDER BY created_at DESC LIMIT 1
    `, [firmId]);
    return result.rows[0] ?? null;
  },

  async updateSubscription(input: {
    firmId: string; planId?: string | null; planName: string; status: string;
    seatCount: number; monthlyAmount: number; billingInterval: string;
    effectiveFrom: Date; effectiveUntil?: Date | null; correlationId: string; actorId: string;
  }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT id FROM cp_subscriptions WHERE firm_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [input.firmId],
      );
      const values = [input.firmId, input.planId ?? null, input.planName, input.status, input.seatCount,
        input.monthlyAmount, input.billingInterval, input.effectiveFrom, input.effectiveUntil ?? null];
      const result = current.rows[0]
        ? await client.query(`
            UPDATE cp_subscriptions SET plan_id=$2, plan_name=$3, status=$4, seat_count=$5,
              monthly_amount=$6, billing_interval=$7, effective_from=$8, effective_until=$9,
              version=version+1, updated_at=now()
            WHERE id=$10 RETURNING id, firm_id AS "firmId", plan_id AS "planId",
              plan_name AS "planName", status, seat_count AS "seatCount",
              monthly_amount AS "monthlyAmount", billing_interval AS "billingInterval", version,
              effective_from AS "effectiveFrom", effective_until AS "effectiveUntil"
          `, [...values, current.rows[0].id])
        : await client.query(`
            INSERT INTO cp_subscriptions (firm_id, plan_id, plan_name, status, seat_count,
              monthly_amount, billing_interval, effective_from, effective_until, version)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1)
            RETURNING id, firm_id AS "firmId", plan_id AS "planId", plan_name AS "planName",
              status, seat_count AS "seatCount", monthly_amount AS "monthlyAmount",
              billing_interval AS "billingInterval", version,
              effective_from AS "effectiveFrom", effective_until AS "effectiveUntil"
          `, values);
      await client.query(`
        INSERT INTO cp_audit_events (id, actor, actor_id, action, target_type, target_id, details, correlation_id)
        VALUES ('aud-' || gen_random_uuid()::text, 'Control administrator', $1,
          'SUBSCRIPTION_UPDATED', 'FIRM', $2, $3::jsonb, $4)
      `, [input.actorId, input.firmId, JSON.stringify(result.rows[0]), input.correlationId]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  },

  async getEntitlements(firmId: string) {
    const result = await db.query(`
      SELECT firm_id AS "firmId", plan_code AS "planCode",
        subscription_status AS "subscriptionStatus", version, modules, limits,
        effective_from AS "effectiveFrom", effective_until AS "effectiveUntil",
        updated_at AS "updatedAt"
      FROM cp_entitlements WHERE firm_id = $1 LIMIT 1
    `, [firmId]);
    return result.rows[0] ?? null;
  },

  async replaceEntitlements(input: {
    firmId: string; planCode: string; subscriptionStatus: string; version: number;
    modules: Record<string, boolean>; limits: Record<string, number>;
    effectiveFrom: Date; effectiveUntil?: Date | null; correlationId: string; actorId: string;
  }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        INSERT INTO cp_entitlements (firm_id, plan_code, subscription_status, version, modules, limits, effective_from, effective_until)
        VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)
        ON CONFLICT (firm_id) DO UPDATE SET
          plan_code = EXCLUDED.plan_code, subscription_status = EXCLUDED.subscription_status,
          version = EXCLUDED.version, modules = EXCLUDED.modules, limits = EXCLUDED.limits,
          effective_from = EXCLUDED.effective_from, effective_until = EXCLUDED.effective_until,
          updated_at = now()
        WHERE cp_entitlements.version < EXCLUDED.version
        RETURNING firm_id AS "firmId", plan_code AS "planCode",
          subscription_status AS "subscriptionStatus", version, modules, limits,
          effective_from AS "effectiveFrom", effective_until AS "effectiveUntil"
      `, [input.firmId, input.planCode, input.subscriptionStatus, input.version,
        JSON.stringify(input.modules), JSON.stringify(input.limits), input.effectiveFrom, input.effectiveUntil ?? null]);
      if (!result.rows[0]) throw new Error('Entitlement version must be newer than the current version');
      await client.query(`
        INSERT INTO cp_audit_events (id, actor, actor_id, action, target_type, target_id, details, correlation_id)
        VALUES ('aud-' || gen_random_uuid()::text, 'Control administrator', $1,
          'ENTITLEMENTS_REPLACED', 'FIRM', $2, $3::jsonb, $4)
      `, [input.actorId, input.firmId, JSON.stringify({ version: input.version, modules: input.modules }), input.correlationId]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  },

  async queueProvisioning(command: ProvisioningCommand, actorId: string) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `avenquis:control-provisioning:${command.idempotencyKey}`,
      ]);

      const existing = await client.query(`
        SELECT id AS "provisioningOperationId", event_id AS "eventId", correlation_id AS "correlationId",
          action, firm_id AS "firmId", status, result, contract_version AS "contractVersion",
          payload = $2::jsonb AS "payloadMatches",
          attempt_count AS "attemptCount", created_at AS "createdAt", processed_at AS "processedAt"
        FROM cp_provisioning_operations WHERE idempotency_key = $1 LIMIT 1
      `, [command.idempotencyKey, JSON.stringify(command.payload)]);
      if (existing.rows[0]) {
        const operation = existing.rows[0];
        if (operation.eventId !== command.eventId || operation.action !== command.action || operation.firmId !== command.firmId || operation.contractVersion !== command.contractVersion || !operation.payloadMatches) {
          throw new AppError('The idempotency key is already associated with a different command.', 409, 'IDEMPOTENCY_KEY_REUSED');
        }
        if (operation.status === 'FAILED') {
          const retried = await client.query(`
            UPDATE cp_provisioning_operations
            SET status='QUEUED', result=NULL, error_code=NULL, error_message=NULL,
              attempt_count=attempt_count+1, last_attempt_at=now(), processed_at=NULL
            WHERE id=$1
            RETURNING id AS "provisioningOperationId", event_id AS "eventId",
              correlation_id AS "correlationId", action, firm_id AS "firmId", status,
              result, attempt_count AS "attemptCount", created_at AS "createdAt",
              processed_at AS "processedAt"
          `, [operation.provisioningOperationId]);
          await client.query('COMMIT');
          return retried.rows[0];
        }
        await client.query('COMMIT');
        return operation;
      }

      const event = await client.query(
        'SELECT id FROM cp_provisioning_operations WHERE event_id = $1 LIMIT 1',
        [command.eventId],
      );
      if (event.rows[0]) {
        throw new AppError('The event ID is already associated with another idempotency key.', 409, 'EVENT_ID_REUSED');
      }

      const result = await client.query(`
        INSERT INTO cp_provisioning_operations (
          id, event_id, idempotency_key, correlation_id, contract_version, action, firm_id, payload,
          status, attempt_count, last_attempt_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'QUEUED',1,now())
        RETURNING id AS "provisioningOperationId", event_id AS "eventId", correlation_id AS "correlationId",
          action, firm_id AS "firmId", status, result, attempt_count AS "attemptCount",
          created_at AS "createdAt", processed_at AS "processedAt"
      `, [command.provisioningOperationId, command.eventId, command.idempotencyKey, command.correlationId, command.contractVersion,
        command.action, command.firmId, JSON.stringify(command.payload)]);
      await client.query(`
        INSERT INTO cp_audit_events (id, actor, actor_id, action, target_type, target_id, details, correlation_id)
        VALUES ('aud-' || gen_random_uuid()::text, 'Control administrator', $1,
          'PROVISIONING_COMMAND_QUEUED', 'FIRM', $2, $3::jsonb, $4)
      `, [actorId, command.firmId, JSON.stringify({ eventId: command.eventId, action: command.action }), command.correlationId]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async completeProvisioning(id: string, status: 'COMPLETED' | 'FAILED', result: unknown, error?: { code: string; message: string }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(`
        UPDATE cp_provisioning_operations SET status = $2, result = $3::jsonb,
          error_code = $4, error_message = $5, processed_at = now()
        WHERE id = $1
        RETURNING id AS "provisioningOperationId", firm_id AS "firmId",
          correlation_id AS "correlationId", event_id AS "eventId", action, status,
          attempt_count AS "attemptCount", processed_at AS "processedAt"
      `, [id, status, JSON.stringify(result ?? {}), error?.code ?? null, error?.message ?? null]);
      if (!updated.rows[0]) throw new AppError('Provisioning operation was not found.', 404, 'RESOURCE_NOT_FOUND');
      const operation = updated.rows[0];
      const resultRecord = result && typeof result === 'object' ? result as Record<string, unknown> : {};
      if (status === 'COMPLETED' && typeof resultRecord.coreFirmId === 'number') {
        await client.query('UPDATE cp_firms SET core_firm_id=$2, updated_at=now() WHERE id=$1', [operation.firmId, resultRecord.coreFirmId]);
      }
      if (status === 'COMPLETED' && operation.action === 'user.provision' &&
          typeof resultRecord.platformUserId === 'string' && typeof resultRecord.coreUserId === 'number') {
        await client.query('UPDATE cp_users SET core_user_id=$2, updated_at=now() WHERE id=$1 AND firm_id=$3', [resultRecord.platformUserId, resultRecord.coreUserId, operation.firmId]);
      }
      await client.query(`
        INSERT INTO cp_audit_events (id, actor, actor_id, action, target_type, target_id, details, correlation_id)
        VALUES ('aud-' || gen_random_uuid()::text, 'Control provisioning service', 'system',
          $1, 'FIRM', $2, $3::jsonb, $4)
      `, [status === 'COMPLETED' ? 'PROVISIONING_COMMAND_COMPLETED' : 'PROVISIONING_COMMAND_FAILED',
        operation.firmId, JSON.stringify({ eventId: operation.eventId, action: operation.action, attemptCount: operation.attemptCount, errorCode: error?.code ?? null }), operation.correlationId]);
      await client.query('COMMIT');
      return operation;
    } catch (caught) {
      await client.query('ROLLBACK');
      throw caught;
    } finally {
      client.release();
    }
  },
};
