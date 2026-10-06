CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cp_firms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'suspended', 'provisioning')),
  plan TEXT NOT NULL DEFAULT 'Professional',
  subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'suspended', 'canceled')),
  contact_email TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  user_count INTEGER NOT NULL DEFAULT 1,
  mrr NUMERIC NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'Standard Firm',
  storage_used_gb NUMERIC NOT NULL DEFAULT 0,
  compliance_score NUMERIC NOT NULL DEFAULT 100,
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT REFERENCES cp_firms(id) ON DELETE SET NULL,
  firm_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,

  role TEXT NOT NULL DEFAULT 'MEMBER'
    CHECK (
      role IN (
        'PLATFORM_SUPER_ADMIN',
        'OWNER',
        'ADMIN',
        'FIRM_ADMIN',
        'MANAGING_PARTNER',
        'AUDIT_PARTNER',
        'MANAGER',
        'SENIOR',
        'ASSOCIATE',
        'PARALEGAL',
        'STUDENT',
        'MEMBER'
      )
    ),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),

  password_hash TEXT,
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  department TEXT NOT NULL DEFAULT 'Legal Operations',
  phone TEXT,
  disabled_reason TEXT,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_access_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_name TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  request_type TEXT NOT NULL,
  requested_role TEXT NOT NULL,
  assigned_role TEXT,
  assigned_firm_id TEXT,
  jurisdiction TEXT NOT NULL,
  firm_size TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  risk_score TEXT NOT NULL DEFAULT 'Low'
    CHECK (risk_score IN ('Low', 'Medium', 'High', 'Critical')),
  request_notes TEXT,
  internal_note TEXT,
  reviewer TEXT,
  reviewer_id TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  price_per_seat_monthly NUMERIC NOT NULL DEFAULT 0,
  base_platform_fee_monthly NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_firms_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'legacy', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES cp_firms(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES cp_plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  seat_count INTEGER NOT NULL DEFAULT 1,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES cp_firms(id) ON DELETE CASCADE,
  firm_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'current'
    CHECK (status IN ('current', 'overdue', 'paid', 'uncollectible')),
  due_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  overdue_days INTEGER NOT NULL DEFAULT 0,
  contact_email TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'Professional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_support_tickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_number TEXT NOT NULL UNIQUE,
  firm_id TEXT REFERENCES cp_firms(id) ON DELETE SET NULL,
  firm_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  assigned_to TEXT NOT NULL DEFAULT 'Support Team',
  category TEXT NOT NULL DEFAULT 'Technical',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  type TEXT NOT NULL DEFAULT 'system',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  target_role TEXT NOT NULL DEFAULT 'PLATFORM_SUPER_ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_ai_approvals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  firm_id TEXT REFERENCES cp_firms(id) ON DELETE SET NULL,
  risk_level TEXT NOT NULL DEFAULT 'Low'
    CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_audit_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES cp_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_firms_status
ON cp_firms(status);

CREATE INDEX IF NOT EXISTS idx_cp_users_firm
ON cp_users(firm_id);

CREATE INDEX IF NOT EXISTS idx_cp_users_email
ON cp_users(email);

CREATE INDEX IF NOT EXISTS idx_cp_access_requests_status
ON cp_access_requests(status);

CREATE INDEX IF NOT EXISTS idx_cp_invoices_status
ON cp_invoices(status);

CREATE INDEX IF NOT EXISTS idx_cp_support_tickets_status
ON cp_support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_cp_notifications_read
ON cp_notifications(read);

CREATE INDEX IF NOT EXISTS idx_cp_ai_approvals_status
ON cp_ai_approvals(status);

CREATE INDEX IF NOT EXISTS idx_cp_audit_events_timestamp
ON cp_audit_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_cp_sessions_user
ON cp_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_cp_sessions_expiry
ON cp_sessions(expires_at);