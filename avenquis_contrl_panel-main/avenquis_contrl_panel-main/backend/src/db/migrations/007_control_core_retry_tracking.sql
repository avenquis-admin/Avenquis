ALTER TABLE cp_provisioning_operations
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

ALTER TABLE cp_firms
  ADD COLUMN IF NOT EXISTS core_firm_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS cp_firms_core_firm_id_unique
  ON cp_firms(core_firm_id)
  WHERE core_firm_id IS NOT NULL;

ALTER TABLE cp_users
  ADD COLUMN IF NOT EXISTS core_user_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS cp_users_core_user_id_unique
  ON cp_users(core_user_id)
  WHERE core_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cp_provisioning_operations_status_idx
  ON cp_provisioning_operations(status);
