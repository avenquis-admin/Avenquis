import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ParsedMember = {
  id: string;
  fullName: string;
  membershipType: 'ACA' | 'FCA' | null;
  membershipNumber: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  designation: string | null;
};

type ParsedFirm = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  website: string | null;
  partners: ParsedMember[];
  source: string;
};

const SOURCE =
  'ICAB Members & Firms Directory 2025-26';

const CITY_NAMES = [
  'Dhaka',
  'Chattogram',
  'Chittagong',
  'Sylhet',
  'Khulna',
  'Rajshahi',
  'Barishal',
  'Barisal',
  'Cumilla',
  'Comilla',
  'Gazipur',
  'Narayanganj',
  'Mymensingh',
  'Rangpur',
];

const BAD_FIRM_PHRASES = [
  'institute of chartered accountants',
  'chartered accountants order',
  'chartered accountants bye-laws',
  'chartered accountants by-laws',
  'icab was established',
  'award membership',
  'qualified chartered accountants',
  'practicing certificates',
  'practising certificates',
  'professional qualifications',
  'regional offices',
  'overseas chapters',
  'membership size',
  'members & firms',
  'members and firms',
  'list of members',
  'list of firms',
  'table of contents',
];

function clean(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableId(
  prefix: string,
  value: string,
): string {
  const hash = crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
    .slice(0, 20);

  return `${prefix}-${hash}`;
}

function firstEmail(
  text: string,
): string | null {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  );

  return match?.[0]?.toLowerCase() ?? null;
}

function firstMobile(
  text: string,
): string | null {
  const normalized =
    text.replace(/[\s()\-]/g, '');

  const match = normalized.match(
    /(?:\+?88)?01[3-9]\d{8}/,
  );

  return match?.[0] ?? null;
}

function firstPhone(
  text: string,
): string | null {
  const mobile = firstMobile(text);

  const match = text.match(
    /(?:\+?88[-\s]?)?(?:02[-\s]?)?\d{6,10}/,
  );

  const value = match?.[0]
    ?.replace(/\s+/g, ' ')
    .trim();

  if (
    !value ||
    value === mobile
  ) {
    return null;
  }

  return value;
}

function firstWebsite(
  text: string,
): string | null {
  const matches = text.match(
    /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]*\.(?:com|org|net|bd|info)(?:\/[^\s,;]*)?/gi,
  );

  if (!matches) {
    return null;
  }

  for (const candidate of matches) {
    if (!candidate.includes('@')) {
      return candidate;
    }
  }

  return null;
}

function probableCity(
  text: string,
): string | null {
  for (const city of CITY_NAMES) {
    if (
      text.toLowerCase().includes(
        city.toLowerCase(),
      )
    ) {
      if (city === 'Chittagong') {
        return 'Chattogram';
      }

      if (city === 'Barisal') {
        return 'Barishal';
      }

      if (city === 'Comilla') {
        return 'Cumilla';
      }

      return city;
    }
  }

  return null;
}

function normalizeFirmName(
  line: string,
): string {
  return clean(
    line
      .replace(
        /^\d+[.)]\s*/,
        '',
      )
      .replace(
        /\s+(?:Members?|Firms?)$/i,
        '',
      ),
  );
}

function looksLikeFirmName(
  rawLine: string,
): boolean {
  const line =
    normalizeFirmName(rawLine);

  const lower =
    line.toLowerCase();

  if (
    !line ||
    line.length < 5 ||
    line.length > 110
  ) {
    return false;
  }

  if (
    BAD_FIRM_PHRASES.some(
      (phrase) =>
        lower.includes(phrase),
    )
  ) {
    return false;
  }

  if (
    /\b(?:ACA|FCA)\b/i.test(line)
  ) {
    return false;
  }

  if (
    /\(\s*\d{3,6}\s*\)/.test(line)
  ) {
    return false;
  }

  if (
    /^\(?\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\)?/.test(
      line,
    )
  ) {
    return false;
  }

  if (
    /^chartered accountants\b/i.test(
      line,
    )
  ) {
    return false;
  }

  if (
    /^members?\b/i.test(line) ||
    /^firms?\b/i.test(line)
  ) {
    return false;
  }

  const strongFirmPattern =
    /\b(?:&|and)\s+co\.?\b/i.test(
      line,
    ) ||
    /\b(?:&|and)\s+associates\b/i.test(
      line,
    ) ||
    /\bassociates(?:\s+consulting)?\b/i.test(
      line,
    );

  if (strongFirmPattern) {
    return true;
  }

  const caIndex =
    lower.indexOf(
      'chartered accountants',
    );

  if (caIndex > 2) {
    const prefix =
      clean(line.slice(0, caIndex));

    if (
      prefix.length >= 3 &&
      !/^institute\b/i.test(prefix) &&
      !/^bangladesh\b/i.test(prefix)
    ) {
      return true;
    }
  }

  return false;
}

function cleanMemberName(
  value: string,
): string {
  let name = clean(value);

  name = name.replace(
    /^chartered accountants?\s+/i,
    '',
  );

  name = name.replace(
    /^(?:Mr|Mrs|Ms|Dr)\.?\s+/i,
    '',
  );

  name = name.replace(
    /\b(?:Partner|Managing Partner|Proprietor)\b/gi,
    '',
  );

  for (const city of CITY_NAMES) {
    name = name.replace(
      new RegExp(
        `\\s+${city}\\s*$`,
        'i',
      ),
      '',
    );
  }

  return clean(name)
    .replace(/^[,;|:-]+/, '')
    .replace(/[,;|:-]+$/, '')
    .trim();
}

function validMemberName(
  name: string,
): boolean {
  if (
    name.length < 3 ||
    name.length > 80
  ) {
    return false;
  }

  if (
    /\d{2,}/.test(name)
  ) {
    return false;
  }

  const lower =
    name.toLowerCase();

  const banned = [
    'chartered accountants',
    'members',
    'firms',
    'date in bracket',
    'designatory letters',
    'became an',
    'house',
    'road',
    'floor',
    'avenue',
    'building',
    'office',
    'suite',
  ];

  if (
    banned.some((word) =>
      lower.includes(word),
    )
  ) {
    return false;
  }

  return /[a-z]{2}/i.test(name);
}

function extractMembersFromLine(
  line: string,
): ParsedMember[] {
  const output: ParsedMember[] = [];

  if (
    /@|www\.|https?:\/\//i.test(line)
  ) {
    return output;
  }

  const memberWithType =
    /([A-Za-z][A-Za-z .,'’`-]{2,80}?)\s+\b(FCA|ACA)\b\s*\(\s*(\d{3,6})\s*\)/gi;

  for (
    const match of line.matchAll(
      memberWithType,
    )
  ) {
    const fullName =
      cleanMemberName(match[1]);

    if (!validMemberName(fullName)) {
      continue;
    }

    const membershipType =
      match[2].toUpperCase() as
        | 'ACA'
        | 'FCA';

    const membershipNumber =
      match[3];

    output.push({
      id: stableId(
        'icab-member',
        membershipNumber,
      ),
      fullName,
      membershipType,
      membershipNumber,
      email: firstEmail(line),
      mobile: firstMobile(line),
      phone: null,
      designation:
        /managing\s+partner/i.test(
          line,
        )
          ? 'Managing Partner'
          : /proprietor/i.test(line)
            ? 'Proprietor'
            : /partner/i.test(line)
              ? 'Partner'
              : null,
    });
  }

  if (output.length > 0) {
    return output;
  }

  /*
   * Some directory rows lose the FCA/ACA
   * marker during PDF text extraction.
   * We still accept "Person Name (1234)"
   * but never dates such as (19.09.22).
   */
  const memberWithoutType =
    /([A-Za-z][A-Za-z .,'’`-]{2,70}?)\s*\(\s*(\d{3,6})\s*\)/g;

  for (
    const match of line.matchAll(
      memberWithoutType,
    )
  ) {
    const fullName =
      cleanMemberName(match[1]);

    if (!validMemberName(fullName)) {
      continue;
    }

    const membershipNumber =
      match[2];

    output.push({
      id: stableId(
        'icab-member',
        membershipNumber,
      ),
      fullName,
      membershipType: null,
      membershipNumber,
      email: firstEmail(line),
      mobile: firstMobile(line),
      phone: null,
      designation:
        /managing\s+partner/i.test(
          line,
        )
          ? 'Managing Partner'
          : /proprietor/i.test(line)
            ? 'Proprietor'
            : /partner/i.test(line)
              ? 'Partner'
              : null,
    });
  }

  return output;
}

function parseFirmBlock(
  block: string[],
): ParsedFirm | null {
  const name =
    normalizeFirmName(block[0]);

  if (!looksLikeFirmName(name)) {
    return null;
  }

  const partners: ParsedMember[] = [];
  const seenMembershipNumbers =
    new Set<string>();

  let firstMemberLineIndex =
    block.length;

  for (
    let i = 1;
    i < block.length;
    i++
  ) {
    const members =
      extractMembersFromLine(
        block[i],
      );

    if (
      members.length > 0 &&
      firstMemberLineIndex ===
        block.length
    ) {
      firstMemberLineIndex = i;
    }

    for (const member of members) {
      if (
        !member.membershipNumber ||
        seenMembershipNumbers.has(
          member.membershipNumber,
        )
      ) {
        continue;
      }

      seenMembershipNumbers.add(
        member.membershipNumber,
      );

      partners.push(member);
    }
  }

  /*
   * Firm contact information should normally
   * appear before member/partner rows.
   */
  const contactBlock =
    block.slice(
      1,
      Math.min(
        firstMemberLineIndex,
        18,
      ),
    );

  const contactText =
    contactBlock.join(' | ');

  const addressLines =
    contactBlock
      .filter((line) => {
        if (
          firstEmail(line) ||
          firstMobile(line) ||
          firstWebsite(line)
        ) {
          return false;
        }

        if (
          /\b(?:Tel|Phone|Mobile|Fax|Email|Web|Website)\b/i.test(
            line,
          )
        ) {
          return false;
        }

        if (
          extractMembersFromLine(
            line,
          ).length > 0
        ) {
          return false;
        }

        if (
          /^members?$|^firms?$/i.test(
            line,
          )
        ) {
          return false;
        }

        return line.length >= 4;
      })
      .slice(0, 6);

  const address =
    addressLines.length > 0
      ? clean(
          addressLines.join(', '),
        )
      : null;

  return {
    id: stableId(
      'icab-firm',
      name,
    ),
    name,
    address,
    city: probableCity(
      `${address ?? ''} ${contactText}`,
    ),
    email: firstEmail(contactText),
    mobile: firstMobile(contactText),
    phone: firstPhone(contactText),
    website: firstWebsite(
      contactText,
    ),
    partners,
    source: SOURCE,
  };
}

async function main() {
  const sourcePath = path.resolve(
    __dirname,
    '../../data/icab/icab-members-firms-2025-26.txt',
  );

  const outputPath = path.resolve(
    __dirname,
    '../../data/icab/icab-directory-preview.json',
  );

  const reportPath = path.resolve(
    __dirname,
    '../../data/icab/icab-parser-report.txt',
  );

  const raw = await fs.readFile(
    sourcePath,
    'utf8',
  );

  const lines = raw
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean)
    .filter(
      (line) =>
        !/^===== PAGE \d+ =====$/i.test(
          line,
        ),
    );

  const headingIndexes: number[] = [];

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    if (
      looksLikeFirmName(lines[i])
    ) {
      headingIndexes.push(i);
    }
  }

  const firms: ParsedFirm[] = [];
  const seenFirmNames =
    new Set<string>();

  for (
    let i = 0;
    i < headingIndexes.length;
    i++
  ) {
    const start =
      headingIndexes[i];

    const next =
      headingIndexes[i + 1];

    const end =
      next !== undefined
        ? Math.min(
            next,
            start + 70,
          )
        : Math.min(
            lines.length,
            start + 70,
          );

    const firm =
      parseFirmBlock(
        lines.slice(start, end),
      );

    if (!firm) {
      continue;
    }

    const key =
      firm.name
        .toLowerCase()
        .replace(
          /[^a-z0-9]/g,
          '',
        );

    if (
      !key ||
      seenFirmNames.has(key)
    ) {
      continue;
    }

    seenFirmNames.add(key);
    firms.push(firm);
  }

  firms.sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const totalPartners =
    firms.reduce(
      (sum, firm) =>
        sum +
        firm.partners.length,
      0,
    );

  const membersWithoutNumber =
    firms.reduce(
      (sum, firm) =>
        sum +
        firm.partners.filter(
          (member) =>
            !member.membershipNumber,
        ).length,
      0,
    );

  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        metadata: {
          source: SOURCE,
          generatedAt:
            new Date().toISOString(),
          totalFirms:
            firms.length,
          totalPartners,
        },
        firms,
      },
      null,
      2,
    ),
    'utf8',
  );

  const report: string[] = [
    'ICAB PARSER REPORT',
    '==================',
    '',
    `Parsed firms: ${firms.length}`,
    `Parsed members: ${totalPartners}`,
    `Members without membership number: ${membersWithoutNumber}`,
    '',
    'FIRST 30 FIRMS',
    '==============',
    '',
  ];

  for (
    let index = 0;
    index <
    Math.min(30, firms.length);
    index++
  ) {
    const firm =
      firms[index];

    report.push(
      `${index + 1}. ${firm.name}`,
    );

    report.push(
      `   Address: ${firm.address ?? '-'}`,
    );

    report.push(
      `   City: ${firm.city ?? '-'}`,
    );

    report.push(
      `   Email: ${firm.email ?? '-'}`,
    );

    report.push(
      `   Mobile: ${firm.mobile ?? '-'}`,
    );

    report.push(
      `   Members: ${firm.partners.length}`,
    );

    for (
      const member of
        firm.partners.slice(0, 10)
    ) {
      report.push(
        `      - ${member.fullName} | ${member.membershipType ?? '-'} | ${member.membershipNumber ?? '-'}`,
      );
    }

    report.push('');
  }

  await fs.writeFile(
    reportPath,
    report.join('\n'),
    'utf8',
  );

  console.log('');
  console.log(
    'ICAB parser completed.',
  );

  console.table({
    firms: firms.length,
    members: totalPartners,
    membersWithoutMembershipNumber:
      membersWithoutNumber,
    firmsWithoutMembers:
      firms.filter(
        (firm) =>
          firm.partners.length === 0,
      ).length,
    firmsWithoutAddress:
      firms.filter(
        (firm) =>
          !firm.address,
      ).length,
  });

  console.log('');
  console.log(
    'Database was NOT modified.',
  );

  console.log('');
  console.log(
    `Preview: ${outputPath}`,
  );

  console.log(
    `Report: ${reportPath}`,
  );
}

main().catch((error) => {
  console.error(
    'ICAB parser failed:',
  );
  console.error(error);
  process.exitCode = 1;
});
