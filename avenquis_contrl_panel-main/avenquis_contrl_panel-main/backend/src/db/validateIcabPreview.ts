import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const file = path.resolve(
    __dirname,
    '../../data/icab/icab-directory-preview.json',
  );

  const raw = await fs.readFile(file, 'utf8');
  const data = JSON.parse(raw);

  const firms = data.firms ?? [];

  const suspiciousFirms = firms.filter((f: any) =>
    !f.name ||
    f.name.length < 4 ||
    f.name.length > 120
  );

  const noAddress = firms.filter(
    (f: any) => !f.address,
  );

  const noPartners = firms.filter(
    (f: any) =>
      !Array.isArray(f.partners) ||
      f.partners.length === 0,
  );

  const suspiciousMembers = firms.flatMap(
    (firm: any) =>
      (firm.partners ?? [])
        .filter((m: any) =>
          !m.fullName ||
          m.fullName.length < 3 ||
          m.fullName.length > 100
        )
        .map((m: any) => ({
          firm: firm.name,
          member: m.fullName,
        })),
  );

  const unknownMembership = firms.flatMap(
    (firm: any) =>
      (firm.partners ?? [])
        .filter(
          (m: any) =>
            !m.membershipNumber,
        )
        .map((m: any) => ({
          firm: firm.name,
          member: m.fullName,
        })),
  );

  console.log('');
  console.log('ICAB PARSER QUALITY CHECK');
  console.log('=========================');

  console.table({
    firms: firms.length,
    suspiciousFirms:
      suspiciousFirms.length,
    firmsWithoutAddress:
      noAddress.length,
    firmsWithoutPartners:
      noPartners.length,
    suspiciousMembers:
      suspiciousMembers.length,
    membersWithoutMembershipNumber:
      unknownMembership.length,
  });

  console.log('');

  if (suspiciousFirms.length) {
    console.log('Suspicious firms:');
    console.table(
      suspiciousFirms.slice(0, 20).map(
        (f: any) => ({
          name: f.name,
        }),
      ),
    );
  }

  if (noPartners.length) {
    console.log('');
    console.log(
      'First firms without parsed partners:',
    );
    console.table(
      noPartners.slice(0, 20).map(
        (f: any) => ({
          name: f.name,
          address: f.address,
        }),
      ),
    );
  }

  if (suspiciousMembers.length) {
    console.log('');
    console.log(
      'Suspicious member records:',
    );
    console.table(
      suspiciousMembers.slice(0, 20),
    );
  }

  if (unknownMembership.length) {
    console.log('');
    console.log(
      'First members without membership number:',
    );
    console.table(
      unknownMembership.slice(0, 20),
    );
  }

  console.log('');
  console.log(
    'Quality check complete. Database was not modified.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
