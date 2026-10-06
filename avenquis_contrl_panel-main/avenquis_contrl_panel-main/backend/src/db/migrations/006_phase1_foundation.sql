ALTER TABLE cp_audit_events
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

ALTER TABLE cp_subscriptions
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS cp_entitlements (
  firm_id TEXT PRIMARY KEY REFERENCES cp_firms(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  modules JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_provisioning_operations (
  id TEXT PRIMARY KEY DEFAULT ('prov-' || gen_random_uuid()::text),
  event_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  correlation_id TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  action TEXT NOT NULL,
  firm_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'COMPLETED', 'FAILED')),
  result JSONB,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS cp_entitlements_subscription_status_idx
  ON cp_entitlements(subscription_status);

CREATE INDEX IF NOT EXISTS cp_provisioning_operations_correlation_id_idx
  ON cp_provisioning_operations(correlation_id);

CREATE INDEX IF NOT EXISTS cp_audit_events_correlation_id_idx
  ON cp_audit_events(correlation_id);
