CREATE TABLE IF NOT EXISTS cp_platform_google_connections (
  id TEXT PRIMARY KEY DEFAULT ('pgc-' || gen_random_uuid()::text),
  owner_type TEXT NOT NULL DEFAULT 'PLATFORM' CHECK (owner_type = 'PLATFORM'),
  provider TEXT NOT NULL DEFAULT 'GMAIL' CHECK (provider = 'GMAIL'),
  connected_account_email TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  encrypted_token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_auth_tag TEXT NOT NULL,
  token_key_version TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED','REVOKED','ERROR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_type, provider)
);
