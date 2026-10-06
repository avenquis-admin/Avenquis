import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from '../lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_NAME =
  'ICAB Members & Firms Directory 2025-26';

const SOURCE_URL =
  'https://www.icab.org.bd/icabadmin/uploads/ckeditor/7869List%20of%20Members%20%26%20Firms%202025-26_Update28aug.pdf';

type Member = {
  id: string;
  fullName: string;
  membershipType: 'ACA' | 'FCA' | null;
  membershipNumber: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  designation: string | null;
};

type Firm = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  website: string | null;
  partners: Member[];
  source: string;
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);
}

function hash(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
    .slice(0, 10);
}

function cleanEmail(value: string | null) {
  return value?.trim().toLowerCase() || null;
}

async function main() {
  const commit =
    process.argv.includes('--commit');

  const jsonPath = path.resolve(
    __dirname,
    '../../data/icab/icab-directory-preview.json',
  );

  const raw = await fs.readFile(
    jsonPath,
    'utf8',
  );

  const parsed = JSON.parse(raw) as {
    firms: Firm[];
  };

  const firms = parsed.firms ?? [];

  if (firms.length === 0) {
    throw new Error(
      'No firms found in ICAB preview JSON.',
    );
  }

  const validFirms = firms.filter(
    (firm) =>
      firm.name &&
      firm.name.length >= 3,
  );

  const uniqueNames =
    new Set(
      validFirms.map((firm) =>
        firm.name.toLowerCase(),
      ),
    );

  if (
    uniqueNames.size !== validFirms.length
  ) {
    throw new Error(
      'Duplicate firm names still exist in parsed preview.',
    );
  }

  const totalMembers =
    validFirms.reduce(
      (sum, firm) =>
        sum + firm.partners.length,
      0,
    );

  console.log('');
  console.log('ICAB IMPORT PRE-CHECK');
  console.log('=====================');
  console.log(
    'Firms:',
    validFirms.length,
  );
  console.log(
    'Firm/member relationships:',
    totalMembers,
  );
  console.log(
    'Mode:',
    commit ? 'COMMIT' : 'DRY RUN',
  );

  if (!commit) {
    console.log('');
    console.log(
      'DRY RUN ONLY — Neon was not modified.',
    );
    console.log('');
    console.log(
      'Run with --commit only after this summary looks reasonable.',
    );
    return;
  }

  const client = await db.connect();

  let firmCount = 0;
  let memberCount = 0;
  let relationCount = 0;

  try {
    await client.query('BEGIN');

    for (const firm of validFirms) {
      const existingFirm =
        await client.query(
          `
          SELECT id
          FROM cp_firms
          WHERE
            lower(name) = lower($1)
            OR official_firm_ref = $2
          LIMIT 1
          `,
          [
            firm.name,
            firm.id,
          ],
        );

      const firmId =
        existingFirm.rows[0]?.id ??
        `icab-firm-${hash(firm.name)}`;

      const subdomainBase =
        slug(firm.name) ||
        `icab-${hash(firm.name)}`;

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

          official_firm_ref,
          address,
          city,
          phone,
          mobile,
          website,

          directory_source,
          directory_source_url,
          directory_updated_at,
          directory_imported_at,
          is_directory_verified,

          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'active',
          'Professional',
          'active',
          $4,
          $2,
          0,
          0,
          'ICAB Directory Firm',
          0,
          100,

          $5,
          $6,
          $7,
          $8,
          $9,
          $10,

          $11,
          $12,
          now(),
          now(),
          true,

          now(),
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          contact_email =
            COALESCE(
              EXCLUDED.contact_email,
              cp_firms.contact_email
            ),
          official_firm_ref =
            EXCLUDED.official_firm_ref,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          phone = EXCLUDED.phone,
          mobile = EXCLUDED.mobile,
          website = EXCLUDED.website,
          directory_source =
            EXCLUDED.directory_source,
          directory_source_url =
            EXCLUDED.directory_source_url,
          directory_updated_at = now(),
          directory_imported_at = now(),
          is_directory_verified = true,
          updated_at = now()
        `,
        [
          firmId,
          firm.name,
          `${subdomainBase}-${hash(firm.name).slice(0, 6)}`,
          cleanEmail(firm.email) ??
            `${firmId}@directory.invalid`,
          firm.id,
          firm.address,
          firm.city,
          firm.phone,
          firm.mobile,
          firm.website,
          SOURCE_NAME,
          SOURCE_URL,
        ],
      );

      firmCount++;

      for (const member of firm.partners) {
        if (!member.fullName) {
          continue;
        }

        const memberLookup =
          await client.query(
            `
            SELECT id
            FROM cp_professional_members
            WHERE
              (
                $1::text IS NOT NULL
                AND membership_number = $1
              )
              OR lower(full_name) = lower($2)
            LIMIT 1
            `,
            [
              member.membershipNumber,
              member.fullName,
            ],
          );

        const memberId =
          memberLookup.rows[0]?.id ??
          `icab-member-${hash(
            member.membershipNumber ||
              member.fullName,
          )}`;

        await client.query(
          `
          INSERT INTO cp_professional_members (
            id,
            full_name,
            membership_type,
            enrolment_no,
            membership_number,

            firm_id,
            city,
            source,
            source_updated_at,

            email,
            mobile,
            phone,
            designation,

            directory_source,
            directory_source_url,
            directory_updated_at,
            directory_imported_at,
            is_directory_verified,

            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $4,

            $5,
            $6,
            $7,
            now(),

            $8,
            $9,
            $10,
            $11,

            $7,
            $12,
            now(),
            now(),
            true,

            now(),
            now()
          )
          ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            membership_type =
              COALESCE(
                EXCLUDED.membership_type,
                cp_professional_members.membership_type
              ),
            membership_number =
              COALESCE(
                EXCLUDED.membership_number,
                cp_professional_members.membership_number
              ),
            firm_id = EXCLUDED.firm_id,
            city =
              COALESCE(
                EXCLUDED.city,
                cp_professional_members.city
              ),
            email =
              COALESCE(
                EXCLUDED.email,
                cp_professional_members.email
              ),
            mobile =
              COALESCE(
                EXCLUDED.mobile,
                cp_professional_members.mobile
              ),
            phone =
              COALESCE(
                EXCLUDED.phone,
                cp_professional_members.phone
              ),
            designation =
              COALESCE(
                EXCLUDED.designation,
                cp_professional_members.designation
              ),
            directory_source =
              EXCLUDED.directory_source,
            directory_source_url =
              EXCLUDED.directory_source_url,
            directory_updated_at = now(),
            directory_imported_at = now(),
            is_directory_verified = true,
            updated_at = now()
          `,
          [
            memberId,
            member.fullName,
            member.membershipType ??
              'ACA',
            member.membershipNumber ??
              `UNKNOWN-${hash(
                member.fullName,
              )}`,
            firmId,
            firm.city,
            SOURCE_NAME,
            cleanEmail(member.email),
            member.mobile,
            member.phone,
            member.designation,
            SOURCE_URL,
          ],
        );

        memberCount++;

        let relationshipType =
          'PARTNER';

        if (
          member.designation
            ?.toLowerCase()
            .includes(
              'managing partner',
            )
        ) {
          relationshipType =
            'MANAGING_PARTNER';
        }

        await client.query(
          `
          INSERT INTO cp_firm_members (
            id,
            firm_id,
            member_id,
            relationship_type,
            designation,
            is_primary,
            is_active,
            directory_source,
            directory_source_url,
            directory_updated_at,
            created_at,
            updated_at
          )
          VALUES (
            gen_random_uuid()::text,
            $1,
            $2,
            $3,
            $4,
            $5,
            true,
            $6,
            $7,
            now(),
            now(),
            now()
          )
          ON CONFLICT (
            firm_id,
            member_id
          )
          DO UPDATE SET
            relationship_type =
              EXCLUDED.relationship_type,
            designation =
              EXCLUDED.designation,
            is_active = true,
            directory_source =
              EXCLUDED.directory_source,
            directory_source_url =
              EXCLUDED.directory_source_url,
            directory_updated_at = now(),
            updated_at = now()
          `,
          [
            firmId,
            memberId,
            relationshipType,
            member.designation,
            relationshipType ===
              'MANAGING_PARTNER',
            SOURCE_NAME,
            SOURCE_URL,
          ],
        );

        relationCount++;
      }
    }

    await client.query('COMMIT');

    console.log('');
    console.log(
      'ICAB directory import completed.',
    );

    console.table({
      firmsProcessed: firmCount,
      membersProcessed:
        memberCount,
      relationshipsProcessed:
        relationCount,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .then(async () => {
    await db.end();
  })
  .catch(async (error) => {
    console.error(
      'ICAB import failed:',
    );
    console.error(error);

    await db.end();
    process.exitCode = 1;
  });
