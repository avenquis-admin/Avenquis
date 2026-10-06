import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from '../lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE =
  'ICAB List of Members & Firms 2024-2025';

type MemberRecord = {
  memberName: string;
  membershipNo: string;
  membershipType: 'ACA' | 'FCA';
  firmName: string;
  firmAddress: string | null;
  mobile: string | null;
  email: string | null;
};

function hash(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
    .slice(0, 12);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);
}

function normalizeFirmName(value: string): string {
  return value
    .toLowerCase()
    .replace(/chartered accountants?/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const commit =
    process.argv.includes('--commit');

  const inputPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-firm-normalized.json',
  );

  const raw =
    await fs.readFile(inputPath, 'utf8');

  const data = JSON.parse(raw) as {
    members: MemberRecord[];
  };

  const members =
    data.members ?? [];

  if (members.length === 0) {
    throw new Error(
      'Validated ICAB dataset is empty.',
    );
  }

  const uniqueFirmNames =
    new Set(
      members.map((member) =>
        normalizeFirmName(
          member.firmName,
        ),
      ),
    );

  console.log('');
  console.log(
    'ICAB VALIDATED IMPORT PRE-CHECK',
  );
  console.log(
    '===============================',
  );
  console.log(
    'Members:',
    members.length,
  );
  console.log(
    'Unique firms:',
    uniqueFirmNames.size,
  );
  console.log(
    'Mode:',
    commit ? 'COMMIT' : 'DRY RUN',
  );

  if (!commit) {
    console.log('');
    console.log(
      'DRY RUN ONLY Ã¢â‚¬â€ Neon was not modified.',
    );
    return;
  }

  const client =
    await db.connect();

  let firmsCreated = 0;
  let firmsMatched = 0;
  let membersCreated = 0;
  let membersUpdated = 0;
  let relationshipsCreated = 0;
  let relationshipsUpdated = 0;

  try {
    await client.query('BEGIN');

    const firmCache =
      new Map<string, string>();

    for (const member of members) {
      const firmKey =
        normalizeFirmName(
          member.firmName,
        );

      let firmId =
        firmCache.get(firmKey);

      if (!firmId) {
        const existingFirm =
          await client.query(
            `
            SELECT id
            FROM cp_firms
            WHERE
              lower(
                regexp_replace(
                  regexp_replace(
                    name,
                    'chartered accountants?',
                    '',
                    'gi'
                  ),
                  '[^a-zA-Z0-9]+',
                  ' ',
                  'g'
                )
              ) = $1
            LIMIT 1
            `,
            [firmKey],
          );

        if (existingFirm.rows[0]) {
          firmId =
            existingFirm.rows[0].id;

          firmsMatched++;
        } else {
          firmId =
            `icab-firm-${hash(
              member.firmName,
            )}`;

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

              address,
              mobile,
              directory_source,
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
              now(),
              true,

              now(),
              now()
            )
            `,
            [
              firmId,
              member.firmName,
              `${slug(
                member.firmName,
              )}-${hash(
                member.firmName,
              ).slice(0, 6)}`,
              member.email ??
                `${firmId}@directory.invalid`,
              member.firmAddress,
              member.mobile,
              SOURCE,
            ],
          );

          firmsCreated++;
        }

        if (!firmId) {
          throw new Error(
            `Unable to resolve firm ID for: ${member.firmName}`,
          );
        }

        firmCache.set(
          firmKey,
          firmId,
        );
      }

      if (!firmId) {
        throw new Error(
          `Unable to resolve firm ID for: ${member.firmName}`,
        );
      }

      /*
       * Preserve a good directory address
       * on matched firms without overwriting
       * existing non-empty values.
       */
      await client.query(
        `
        UPDATE cp_firms
        SET
          address =
            COALESCE(
              NULLIF(address, ''),
              $2
            ),
          directory_source =
            COALESCE(
              directory_source,
              $3
            ),
          directory_imported_at =
            COALESCE(
              directory_imported_at,
              now()
            ),
          is_directory_verified = true,
          updated_at = now()
        WHERE id = $1
        `,
        [
          firmId,
          member.firmAddress,
          SOURCE,
        ],
      );

      const existingMember =
        await client.query(
          `
          SELECT id
          FROM cp_professional_members
          WHERE
            membership_number = $1
            OR enrolment_no = $1
          LIMIT 1
          `,
          [member.membershipNo],
        );

      const memberId =
        existingMember.rows[0]?.id ??
        `icab-member-${member.membershipNo}`;

      if (existingMember.rows[0]) {
        await client.query(
          `
          UPDATE cp_professional_members
          SET
            full_name = $2,
            membership_type = $3,
            enrolment_no = $4,
            membership_number = $4,
            firm_id = $5,
            email = COALESCE($6, email),
            mobile = COALESCE($7, mobile),
            directory_source = $8,
            directory_imported_at = now(),
            is_directory_verified = true,
            updated_at = now()
          WHERE id = $1
          `,
          [
            memberId,
            member.memberName,
            member.membershipType,
            member.membershipNo,
            firmId,
            member.email,
            member.mobile,
            SOURCE,
          ],
        );

        membersUpdated++;
      } else {
        await client.query(
          `
          INSERT INTO cp_professional_members (
            id,
            full_name,
            membership_type,
            enrolment_no,
            membership_number,
            firm_id,
            source,
            source_updated_at,
            email,
            mobile,
            directory_source,
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
            now(),
            $7,
            $8,
            $6,
            now(),
            true,
            now(),
            now()
          )
          `,
          [
            memberId,
            member.memberName,
            member.membershipType,
            member.membershipNo,
            firmId,
            SOURCE,
            member.email,
            member.mobile,
          ],
        );

        membersCreated++;
      }

      const existingRelation =
        await client.query(
          `
          SELECT id
          FROM cp_firm_members
          WHERE
            firm_id = $1
            AND member_id = $2
          LIMIT 1
          `,
          [
            firmId,
            memberId,
          ],
        );

      if (
        existingRelation.rows[0]
      ) {
        await client.query(
          `
          UPDATE cp_firm_members
          SET
            is_active = true,
            directory_source = $3,
            directory_updated_at = now(),
            updated_at = now()
          WHERE
            firm_id = $1
            AND member_id = $2
          `,
          [
            firmId,
            memberId,
            SOURCE,
          ],
        );

        relationshipsUpdated++;
      } else {
        await client.query(
          `
          INSERT INTO cp_firm_members (
            id,
            firm_id,
            member_id,
            relationship_type,
            is_primary,
            is_active,
            directory_source,
            directory_updated_at,
            created_at,
            updated_at
          )
          VALUES (
            gen_random_uuid()::text,
            $1,
            $2,
            'MEMBER',
            false,
            true,
            $3,
            now(),
            now(),
            now()
          )
          `,
          [
            firmId,
            memberId,
            SOURCE,
          ],
        );

        relationshipsCreated++;
      }
    }

    const verify =
      await client.query(
        `
        SELECT
          COUNT(DISTINCT pm.id)::int
            AS members,
          COUNT(DISTINCT fm.firm_id)::int
            AS firms,
          COUNT(fm.id)::int
            AS relationships
        FROM cp_professional_members pm
        JOIN cp_firm_members fm
          ON fm.member_id = pm.id
        WHERE
          pm.directory_source = $1
          AND pm.is_directory_verified = true
          AND fm.is_active = true
        `,
        [SOURCE],
      );

    if (
      verify.rows[0].members !==
      members.length
    ) {
      throw new Error(
        `Verification failed before commit. Expected ${members.length} members, found ${verify.rows[0].members}.`,
      );
    }

    await client.query('COMMIT');

    console.log('');
    console.log(
      'ICAB IMPORT COMMITTED SUCCESSFULLY',
    );

    console.table({
      firmsCreated,
      firmsMatched,
      membersCreated,
      membersUpdated,
      relationshipsCreated,
      relationshipsUpdated,
      verifiedMembers:
        verify.rows[0].members,
      verifiedFirms:
        verify.rows[0].firms,
      verifiedRelationships:
        verify.rows[0]
          .relationships,
    });
  } catch (error) {
    await client.query(
      'ROLLBACK',
    );

    console.error('');
    console.error(
      'IMPORT ROLLED BACK.',
    );

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
    console.error(error);
    await db.end();
    process.exitCode = 1;
  });