/*
 * ICAB directory-ready schema.
 * Safe additive migration: existing firms/users are preserved.
 */

ALTER TABLE cp_firms
  ADD COLUMN IF NOT EXISTS official_firm_ref TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS mobile TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS directory_source TEXT,
  ADD COLUMN IF NOT EXISTS directory_source_url TEXT,
  ADD COLUMN IF NOT EXISTS directory_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS directory_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_directory_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE cp_professional_members
  ADD COLUMN IF NOT EXISTS membership_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS mobile TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS directory_source TEXT,
  ADD COLUMN IF NOT EXISTS directory_source_url TEXT,
  ADD COLUMN IF NOT EXISTS directory_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS directory_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_directory_verified BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS cp_firm_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  firm_id TEXT NOT NULL
    REFERENCES cp_firms(id)
    ON DELETE CASCADE,

  member_id TEXT NOT NULL
    REFERENCES cp_professional_members(id)
    ON DELETE CASCADE,

  relationship_type TEXT NOT NULL DEFAULT 'MEMBER'
    CHECK (
      relationship_type IN (
        'PARTNER',
        'MANAGING_PARTNER',
        'PROPRIETOR',
        'DIRECTOR',
        'MEMBER',
        'EMPLOYEE'
      )
    ),

  designation TEXT,
  branch_name TEXT,

  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  directory_source TEXT,
  directory_source_url TEXT,
  directory_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (firm_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_firm_members_firm
  ON cp_firm_members(firm_id);

CREATE INDEX IF NOT EXISTS idx_cp_firm_members_member
  ON cp_firm_members(member_id);

CREATE INDEX IF NOT EXISTS idx_cp_firm_members_relationship
  ON cp_firm_members(relationship_type);

CREATE INDEX IF NOT EXISTS idx_cp_firms_official_ref
  ON cp_firms(official_firm_ref);

CREATE INDEX IF NOT EXISTS idx_cp_firms_registration
  ON cp_firms(registration_number);

CREATE INDEX IF NOT EXISTS idx_cp_professional_members_membership_number
  ON cp_professional_members(membership_number);

CREATE INDEX IF NOT EXISTS idx_cp_professional_members_email
  ON cp_professional_members(email);

COMMENT ON TABLE cp_firm_members IS
  'Relationship between official firm records and professional members.';

COMMENT ON COLUMN cp_firms.directory_source IS
  'Reference source for imported official-directory information.';

COMMENT ON COLUMN cp_firms.is_directory_verified IS
  'True only when this record was matched against an official directory source.';

COMMENT ON COLUMN cp_professional_members.is_directory_verified IS
  'True only when this professional record was matched against an official directory source.';
