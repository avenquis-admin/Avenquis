CREATE TABLE IF NOT EXISTS cp_professional_members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  membership_type TEXT NOT NULL,
  enrolment_no TEXT NOT NULL,
  firm_id TEXT REFERENCES cp_firms(id) ON DELETE SET NULL,
  city TEXT,
  source TEXT,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_professional_members_firm
ON cp_professional_members(firm_id);

CREATE INDEX IF NOT EXISTS idx_cp_professional_members_enrolment
ON cp_professional_members(enrolment_no);