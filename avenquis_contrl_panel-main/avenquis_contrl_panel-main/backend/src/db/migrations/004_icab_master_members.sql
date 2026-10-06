CREATE TABLE IF NOT EXISTS cp_icab_members_master (
  id TEXT PRIMARY KEY,
  enrollment_no TEXT NOT NULL UNIQUE,
  member_name TEXT NOT NULL,
  membership_type TEXT,
  membership_date TEXT,
  admission_year TEXT,
  education_qualifications TEXT,
  designation TEXT,
  organization_firm TEXT,
  address_professional_details TEXT,
  office_phone TEXT,
  residence_phone TEXT,
  mobile TEXT,
  fax TEXT,
  email TEXT,
  website TEXT,
  other_phone TEXT,
  source_pdf_page INTEGER,
  directory_source TEXT NOT NULL DEFAULT 'ICAB Members & Firms 2024-2025',
  directory_imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_icab_members_master_name
  ON cp_icab_members_master (lower(member_name));

CREATE INDEX IF NOT EXISTS idx_cp_icab_members_master_firm
  ON cp_icab_members_master (lower(organization_firm));
