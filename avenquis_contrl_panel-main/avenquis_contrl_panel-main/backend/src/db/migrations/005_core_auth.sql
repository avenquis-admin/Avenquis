CREATE TABLE IF NOT EXISTS core_users (
  id TEXT PRIMARY KEY,
  access_request_id TEXT UNIQUE,
  firm_id TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  user_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_password',
  password_hash TEXT,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_users_firm
  ON core_users (firm_id);

CREATE INDEX IF NOT EXISTS idx_core_users_email
  ON core_users (lower(email));

CREATE TABLE IF NOT EXISTS core_password_setup_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_password_setup_user
  ON core_password_setup_tokens (user_id);

CREATE TABLE IF NOT EXISTS core_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_core_sessions_user
  ON core_sessions (user_id);
