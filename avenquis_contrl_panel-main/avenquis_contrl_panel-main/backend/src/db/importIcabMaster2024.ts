import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { db } from '../lib/database.js';

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function normalizeEnrollment(value: unknown) {
  let text = String(value ?? '')
    .trim()
    .replace(/\.0$/, '');

  text = text.replace(/^0+/, '');

  return text || '0';
}

async function main() {
  const csvPath = path.resolve(
    process.cwd(),
    'data/icab/icab_members_2024_2025_clean.csv',
  );

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const rows = parse(
    fs.readFileSync(csvPath, 'utf8'),
    {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
      trim: true,
    },
  ) as Record<string, string>[];

  console.log(`CSV rows: ${rows.length}`);

  const seen = new Set<string>();

  for (const row of rows) {
    const enrollmentNo =
      normalizeEnrollment(row['Enrollment No']);

    if (seen.has(enrollmentNo)) {
      throw new Error(
        `Duplicate enrollment number: ${enrollmentNo}`,
      );
    }

    seen.add(enrollmentNo);
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    for (const row of rows) {
      const enrollmentNo =
        normalizeEnrollment(row['Enrollment No']);

      await client.query(
        `
        INSERT INTO cp_icab_members_master (
          id,
          enrollment_no,
          member_name,
          membership_type,
          membership_date,
          admission_year,
          education_qualifications,
          designation,
          organization_firm,
          address_professional_details,
          office_phone,
          residence_phone,
          mobile,
          fax,
          email,
          website,
          other_phone,
          source_pdf_page,
          directory_source,
          directory_imported_at,
          created_at,
          updated_at
        )
        VALUES (
          'icab-' || $1,
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          'ICAB Members & Firms 2024-2025',
          now(),
          now(),
          now()
        )
        ON CONFLICT (enrollment_no)
        DO UPDATE SET
          member_name = EXCLUDED.member_name,
          membership_type = EXCLUDED.membership_type,
          membership_date = EXCLUDED.membership_date,
          admission_year = EXCLUDED.admission_year,
          education_qualifications =
            EXCLUDED.education_qualifications,
          designation = EXCLUDED.designation,
          organization_firm =
            EXCLUDED.organization_firm,
          address_professional_details =
            EXCLUDED.address_professional_details,
          office_phone = EXCLUDED.office_phone,
          residence_phone = EXCLUDED.residence_phone,
          mobile = EXCLUDED.mobile,
          fax = EXCLUDED.fax,
          email = EXCLUDED.email,
          website = EXCLUDED.website,
          other_phone = EXCLUDED.other_phone,
          source_pdf_page = EXCLUDED.source_pdf_page,
          directory_imported_at = now(),
          updated_at = now()
        `,
        [
          enrollmentNo,
          clean(row['Member Name']),
          clean(row['Membership Type']),
          clean(row['Membership Date']),
          clean(row['Admission Year']),
          clean(row['Education / Qualifications']),
          clean(row['Designation']),
          clean(row['Organization / Firm']),
          clean(row['Address / Professional Details']),
          clean(row['Office Phone']),
          clean(row['Residence Phone']),
          clean(row['Mobile']),
          clean(row['Fax']),
          clean(row['Email']),
          clean(row['Website']),
          clean(row['Other Phone']),
          row['Source PDF Page']
            ? Number(row['Source PDF Page'])
            : null,
        ],
      );
    }

    await client.query('COMMIT');

    const verify = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM cp_icab_members_master
    `);

    console.log('');
    console.log('ICAB MASTER IMPORT COMPLETE');
    console.log({
      importedRows: rows.length,
      databaseRows: verify.rows[0].total,
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
    console.error(error);
    await db.end();
    process.exitCode = 1;
  });
