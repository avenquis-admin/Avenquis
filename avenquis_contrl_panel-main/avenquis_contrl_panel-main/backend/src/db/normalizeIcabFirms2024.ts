import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Member = {
  memberName: string;
  membershipNo: string;
  membershipType: 'ACA' | 'FCA';
  firmName: string;
  firmAddress: string | null;
  mobile: string | null;
  email: string | null;
};

function canonicalFirmName(value: string): string {
  let v = value
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  v = v
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s*&\s*/g, ' & ');

  v = v.replace(
    /\s*,?\s*Chartered Accountants?\s*$/i,
    '',
  );

  return v.trim();
}

function normalizedKey(value: string): string {
  return canonicalFirmName(value)
    .toLowerCase()
    .replace(/\band\b/g, '&')
    .replace(/[^a-z0-9&]+/g, '')
    .replace(/&/g, 'and');
}

async function main() {
  const inputPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-validated.json',
  );

  const outputPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-firm-normalized.json',
  );

  const reportPath = path.resolve(
    __dirname,
    '../../data/icab/icab-firm-normalization-report.txt',
  );

  const raw = await fs.readFile(inputPath, 'utf8');
  const data = JSON.parse(raw) as {
    members: Member[];
  };

  const members = data.members ?? [];

  const groups = new Map<
    string,
    {
      names: Set<string>;
      members: Member[];
    }
  >();

  for (const member of members) {
    const key = normalizedKey(member.firmName);

    if (!groups.has(key)) {
      groups.set(key, {
        names: new Set(),
        members: [],
      });
    }

    const group = groups.get(key)!;
    group.names.add(member.firmName);
    group.members.push(member);
  }

  const variantGroups = [...groups.entries()]
    .filter(([, group]) => group.names.size > 1);

  const normalizedMembers: Member[] = [];

  for (const [, group] of groups) {
    const allNames = [...group.names];

    const preferredName = allNames
      .map(canonicalFirmName)
      .sort((a, b) => {
        if (a.length !== b.length) {
          return b.length - a.length;
        }
        return a.localeCompare(b);
      })[0];

    for (const member of group.members) {
      normalizedMembers.push({
        ...member,
        firmName: preferredName,
      });
    }
  }

  const uniqueBefore = new Set(
    members.map((m) => m.firmName),
  ).size;

  const uniqueAfter = new Set(
    normalizedMembers.map((m) => normalizedKey(m.firmName)),
  ).size;

  const report: string[] = [
    'ICAB FIRM NORMALIZATION REPORT',
    '==============================',
    '',
    `Members: ${members.length}`,
    `Unique firm names before: ${uniqueBefore}`,
    `Unique firms after normalization: ${uniqueAfter}`,
    `Variant groups found: ${variantGroups.length}`,
    '',
    'VARIANT GROUPS',
    '==============',
    '',
  ];

  for (const [key, group] of variantGroups) {
    report.push(`KEY: ${key}`);

    for (const name of [...group.names].sort()) {
      report.push(`  - ${name}`);
    }

    report.push('');
  }

  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        source: 'ICAB List of Members & Firms 2024-2025',
        normalizedAt: new Date().toISOString(),
        total: normalizedMembers.length,
        uniqueFirms: uniqueAfter,
        members: normalizedMembers,
      },
      null,
      2,
    ),
    'utf8',
  );

  await fs.writeFile(
    reportPath,
    report.join('\n'),
    'utf8',
  );

  console.log('');
  console.log('ICAB FIRM NORMALIZATION');
  console.table({
    members: members.length,
    uniqueBefore,
    uniqueAfter,
    variantGroups: variantGroups.length,
  });

  console.log('');
  console.log('DATABASE WAS NOT MODIFIED.');
  console.log('');
  console.log(`Output: ${outputPath}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});