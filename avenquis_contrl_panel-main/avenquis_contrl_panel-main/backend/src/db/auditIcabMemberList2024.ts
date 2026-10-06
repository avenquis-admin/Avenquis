import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MemberRecord = {
  memberName: string;
  membershipNo: string;
  membershipType: 'ACA' | 'FCA';
  firmName: string | null;
  firmAddress: string | null;
  mobile: string | null;
  email: string | null;
};

type Dataset = {
  source: string;
  generatedAt: string;
  total: number;
  members: MemberRecord[];
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validEmail(value: string | null): boolean {
  if (!value) return false;

  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(
    value.trim(),
  );
}

function normalizeMobile(
  value: string | null,
): string | null {
  if (!value) return null;

  return value
    .replace(/[^\d+]/g, '')
    .trim();
}

function validMobile(value: string | null): boolean {
  if (!value) return false;

  const mobile = normalizeMobile(value);

  if (!mobile) return false;

  return (
    /^01[3-9]\d{8}$/.test(mobile) ||
    /^8801[3-9]\d{8}$/.test(mobile) ||
    /^\+8801[3-9]\d{8}$/.test(mobile)
  );
}

function suspiciousFirmName(
  value: string | null,
): boolean {
  if (!value) return true;

  const name = value.trim();

  if (
    name.length < 3 ||
    name.length > 120
  ) {
    return true;
  }

  const lower = name.toLowerCase();

  const bad = [
    'chartered accountants order',
    'list of members',
    'list of firms',
    'members & firms',
    'institute of chartered accountants',
    'alphabetical list',
    'explanatory notes',
  ];

  return bad.some((item) =>
    lower.includes(item),
  );
}

function suspiciousMemberName(
  value: string,
): boolean {
  const name = value.trim();

  if (
    name.length < 3 ||
    name.length > 100
  ) {
    return true;
  }

  if (
    /\b(?:chartered accountants|members & firms|alphabetical list)\b/i.test(
      name,
    )
  ) {
    return true;
  }

  return !/[A-Za-z]{2}/.test(name);
}

async function main() {
  const inputPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25.json',
  );

  const reportPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-quality-report.txt',
  );

  const issuesJsonPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-issues.json',
  );

  const cleanJsonPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-validated.json',
  );

  const cleanCsvPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-validated.csv',
  );

  const raw = await fs.readFile(
    inputPath,
    'utf8',
  );

  const data =
    JSON.parse(raw) as Dataset;

  const members =
    data.members ?? [];

  const issues: {
    duplicateMembershipNo: MemberRecord[];
    duplicateIdentity: MemberRecord[];
    invalidMembershipType: MemberRecord[];
    suspiciousMembershipNo: MemberRecord[];
    suspiciousMemberName: MemberRecord[];
    suspiciousFirmName: MemberRecord[];
    missingFirmAddress: MemberRecord[];
    invalidMobile: MemberRecord[];
    missingMobile: MemberRecord[];
    invalidEmail: MemberRecord[];
    missingEmail: MemberRecord[];
  } = {
    duplicateMembershipNo: [],
    duplicateIdentity: [],
    invalidMembershipType: [],
    suspiciousMembershipNo: [],
    suspiciousMemberName: [],
    suspiciousFirmName: [],
    missingFirmAddress: [],
    invalidMobile: [],
    missingMobile: [],
    invalidEmail: [],
    missingEmail: [],
  };

  const membershipMap =
    new Map<string, MemberRecord[]>();

  const identityMap =
    new Map<string, MemberRecord[]>();

  for (const member of members) {
    const membershipNo =
      member.membershipNo?.trim();

    if (
      !membershipNo ||
      !/^\d{1,4}$/.test(
        membershipNo,
      )
    ) {
      issues.suspiciousMembershipNo.push(
        member,
      );
    }

    if (
      member.membershipType !== 'ACA' &&
      member.membershipType !== 'FCA'
    ) {
      issues.invalidMembershipType.push(
        member,
      );
    }

    if (
      suspiciousMemberName(
        member.memberName,
      )
    ) {
      issues.suspiciousMemberName.push(
        member,
      );
    }

    if (
      suspiciousFirmName(
        member.firmName,
      )
    ) {
      issues.suspiciousFirmName.push(
        member,
      );
    }

    if (!member.firmAddress) {
      issues.missingFirmAddress.push(
        member,
      );
    }

    if (!member.mobile) {
      issues.missingMobile.push(
        member,
      );
    } else if (
      !validMobile(member.mobile)
    ) {
      issues.invalidMobile.push(
        member,
      );
    }

    if (!member.email) {
      issues.missingEmail.push(
        member,
      );
    } else if (
      !validEmail(member.email)
    ) {
      issues.invalidEmail.push(
        member,
      );
    }

    if (membershipNo) {
      const list =
        membershipMap.get(
          membershipNo,
        ) ?? [];

      list.push(member);

      membershipMap.set(
        membershipNo,
        list,
      );
    }

    const identityKey = [
      normalizeName(
        member.memberName,
      ),
      normalizeName(
        member.firmName ?? '',
      ),
    ].join('|');

    const identities =
      identityMap.get(
        identityKey,
      ) ?? [];

    identities.push(member);

    identityMap.set(
      identityKey,
      identities,
    );
  }

  for (
    const records of
      membershipMap.values()
  ) {
    if (records.length > 1) {
      issues.duplicateMembershipNo.push(
        ...records,
      );
    }
  }

  for (
    const records of
      identityMap.values()
  ) {
    if (records.length > 1) {
      issues.duplicateIdentity.push(
        ...records,
      );
    }
  }

  const hardFailMembershipNos =
    new Set(
      issues.duplicateMembershipNo.map(
        (item) =>
          item.membershipNo,
      ),
    );

  const validated =
    members.filter(
      (member) =>
        !hardFailMembershipNos.has(
          member.membershipNo,
        ) &&
        !suspiciousMemberName(
          member.memberName,
        ) &&
        !suspiciousFirmName(
          member.firmName,
        ) &&
        (member.membershipType ===
          'ACA' ||
          member.membershipType ===
            'FCA') &&
        /^\d{1,4}$/.test(
          member.membershipNo,
        ),
    );

  const csvEscape = (
    value: string | null,
  ) => {
    const text = value ?? '';

    if (
      text.includes(',') ||
      text.includes('"') ||
      text.includes('\n')
    ) {
      return `"${text.replace(
        /"/g,
        '""',
      )}"`;
    }

    return text;
  };

  const csvRows = [
    [
      'Member Name',
      'Membership No',
      'Membership Type',
      'Firm Name',
      'Firm Address',
      'Mobile',
      'Email',
    ].join(','),
    ...validated.map(
      (member) =>
        [
          member.memberName,
          member.membershipNo,
          member.membershipType,
          member.firmName,
          member.firmAddress,
          member.mobile,
          member.email,
        ]
          .map(csvEscape)
          .join(','),
    ),
  ];

  await fs.writeFile(
    cleanJsonPath,
    JSON.stringify(
      {
        source: data.source,
        validatedAt:
          new Date().toISOString(),
        total:
          validated.length,
        members: validated,
      },
      null,
      2,
    ),
    'utf8',
  );

  await fs.writeFile(
    cleanCsvPath,
    csvRows.join('\r\n'),
    'utf8',
  );

  await fs.writeFile(
    issuesJsonPath,
    JSON.stringify(
      issues,
      null,
      2,
    ),
    'utf8',
  );

  const report = [
    'ICAB DATA QUALITY AUDIT',
    '=======================',
    '',
    `Input records: ${members.length}`,
    `Validated records: ${validated.length}`,
    '',
    `Duplicate membership no: ${issues.duplicateMembershipNo.length}`,
    `Duplicate identity: ${issues.duplicateIdentity.length}`,
    `Invalid membership type: ${issues.invalidMembershipType.length}`,
    `Suspicious membership no: ${issues.suspiciousMembershipNo.length}`,
    `Suspicious member name: ${issues.suspiciousMemberName.length}`,
    `Suspicious firm name: ${issues.suspiciousFirmName.length}`,
    `Missing firm address: ${issues.missingFirmAddress.length}`,
    `Missing mobile: ${issues.missingMobile.length}`,
    `Invalid mobile: ${issues.invalidMobile.length}`,
    `Missing email: ${issues.missingEmail.length}`,
    `Invalid email: ${issues.invalidEmail.length}`,
    '',
    'IMPORTANT',
    '=========',
    '',
    'Missing mobile/email/address is not automatically treated as bad data.',
    'Only duplicate IDs and structurally suspicious records are excluded from validated output.',
    '',
    'DATABASE WAS NOT MODIFIED.',
  ].join('\n');

  await fs.writeFile(
    reportPath,
    report,
    'utf8',
  );

  console.log('');
  console.log(
    'ICAB DATA QUALITY AUDIT',
  );

  console.table({
    inputRecords:
      members.length,
    validatedRecords:
      validated.length,
    duplicateMembershipNo:
      issues
        .duplicateMembershipNo
        .length,
    duplicateIdentity:
      issues
        .duplicateIdentity
        .length,
    invalidMembershipType:
      issues
        .invalidMembershipType
        .length,
    suspiciousMembershipNo:
      issues
        .suspiciousMembershipNo
        .length,
    suspiciousMemberName:
      issues
        .suspiciousMemberName
        .length,
    suspiciousFirmName:
      issues
        .suspiciousFirmName
        .length,
    missingFirmAddress:
      issues
        .missingFirmAddress
        .length,
    missingMobile:
      issues
        .missingMobile
        .length,
    invalidMobile:
      issues
        .invalidMobile
        .length,
    missingEmail:
      issues
        .missingEmail
        .length,
    invalidEmail:
      issues
        .invalidEmail
        .length,
  });

  console.log('');
  console.log(
    'DATABASE WAS NOT MODIFIED.',
  );

  console.log('');
  console.log(
    `Report: ${reportPath}`,
  );

  console.log(
    `Issues: ${issuesJsonPath}`,
  );

  console.log(
    `Validated JSON: ${cleanJsonPath}`,
  );

  console.log(
    `Validated CSV: ${cleanCsvPath}`,
  );
}

main().catch((error) => {
  console.error(
    'ICAB quality audit failed:',
  );
  console.error(error);
  process.exitCode = 1;
});