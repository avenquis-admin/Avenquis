import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

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

function clean(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function csvEscape(value: string | null): string {
  const text = value ?? '';

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function getEmail(text: string): string | null {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  );

  return match?.[0]?.toLowerCase() ?? null;
}

function getMobile(text: string): string | null {
  const candidates = text.match(
    /(?:\+?88[\s-]*)?01[3-9](?:[\s-]*\d){8}/g,
  );

  if (!candidates?.length) {
    return null;
  }

  return candidates[0]
    .replace(/[\s-]/g, '')
    .trim();
}

function isHeaderNoise(line: string): boolean {
  const value = line.toLowerCase();

  return (
    value === 'list of' ||
    value === 'members' ||
    value === '& firms' ||
    value === 'members & firms' ||
    value === '2024-2025' ||
    /^[a-z]{10,}$/i.test(line) ||
    /^\d{1,3}$/.test(line)
  );
}

function isContactLine(line: string): boolean {
  return /^\s*\((?:M|O|E|F|W|R|Ph)\)/i.test(line);
}

function findMemberName(
  block: string[],
  membershipIndex: number,
): string | null {
  for (
    let i = membershipIndex - 1;
    i >= Math.max(0, membershipIndex - 5);
    i--
  ) {
    const line = clean(block[i]);

    if (!line) continue;

    if (
      /^\(?\d{4}\)?(?:,|\s|$)/.test(line)
    ) {
      continue;
    }

    if (
      isContactLine(line) ||
      line.includes('@') ||
      /chartered accountants/i.test(line)
    ) {
      continue;
    }

    if (
      /^[A-Za-z .'-]+,\s*[A-Za-z .'-]+$/.test(line) ||
      /^[A-Za-z][A-Za-z .'-]{3,80}$/.test(line)
    ) {
      return line;
    }
  }

  return null;
}

function extractFirm(
  block: string[],
): {
  firmName: string | null;
  firmAddress: string | null;
} {
  const caIndex = block.findIndex(
    (line) =>
      /^chartered accountants?$/i.test(
        clean(line),
      ),
  );

  if (caIndex < 1) {
    return {
      firmName: null,
      firmAddress: null,
    };
  }

  let firmName: string | null = null;

  for (
    let i = caIndex - 1;
    i >= Math.max(0, caIndex - 4);
    i--
  ) {
    const candidate = clean(block[i]);

    if (
      !candidate ||
      /^(?:partner|senior partner|managing partner|proprietor|director|c\/o)$/i.test(
        candidate,
      )
    ) {
      continue;
    }

    firmName = candidate;
    break;
  }

  const addressLines: string[] = [];

  for (
    let i = caIndex + 1;
    i < block.length;
    i++
  ) {
    const line = clean(block[i]);

    if (!line) continue;

    if (
      isContactLine(line) ||
      line.includes('@') ||
      /\b(?:ACA|FCA)\b/i.test(line)
    ) {
      break;
    }

    if (
      /^\(?\d{4}\)?(?:,|\s|$)/.test(line)
    ) {
      break;
    }

    addressLines.push(line);

    if (addressLines.length >= 6) {
      break;
    }
  }

  return {
    firmName,
    firmAddress:
      addressLines.length > 0
        ? addressLines.join(', ')
        : null,
  };
}

async function extractPageLines(
  page: any,
): Promise<string[]> {
  const content =
    await page.getTextContent();

  const lines: string[] = [];
  let current = '';

  for (const raw of content.items as any[]) {
    if (
      typeof raw.str !== 'string'
    ) {
      continue;
    }

    const text = clean(raw.str);

    if (text) {
      current = current
        ? `${current} ${text}`
        : text;
    }

    if (raw.hasEOL) {
      if (current.trim()) {
        lines.push(clean(current));
      }

      current = '';
    }
  }

  if (current.trim()) {
    lines.push(clean(current));
  }

  return lines;
}

async function main() {
  const pdfPath = path.resolve(
    __dirname,
    '../../data/icab/icab-members-firms-2024-25.pdf',
  );

  const jsonPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25.json',
  );

  const csvPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25.csv',
  );

  const reportPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-report.txt',
  );

  const buffer =
    await fs.readFile(pdfPath);

  const loadingTask =
    pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });

  const pdf =
    await loadingTask.promise;

  console.log(
    `PDF pages: ${pdf.numPages}`,
  );

  const allLines: string[] = [];

  /*
   * PDF page 13 is where the alphabetical
   * member records begin in this edition.
   */
  for (
    let pageNumber = 13;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page =
      await pdf.getPage(pageNumber);

    const pageLines =
      await extractPageLines(page);

    const pageText =
      pageLines.join(' ');

    if (
      /GEOGRAPHICAL\s+LIST\s+OF\s+MEMBERS/i.test(
        pageText,
      )
    ) {
      console.log(
        `Reached geographical section at PDF page ${pageNumber}.`,
      );
      break;
    }

    allLines.push(
      ...pageLines.filter(
        (line) =>
          !isHeaderNoise(line),
      ),
    );

    if (
      pageNumber === 13 ||
      pageNumber % 25 === 0
    ) {
      console.log(
        `Read through PDF page ${pageNumber}`,
      );
    }
  }

  const records: MemberRecord[] = [];
  const seenMembershipNos =
    new Set<string>();

  let blockStart = 0;

  const membershipPattern =
    /\b(ACA|FCA)\s*\(\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*\)\s*\(\s*(\d{1,4})\s*\)/i;

  for (
    let i = 0;
    i < allLines.length;
    i++
  ) {
    const match =
      allLines[i].match(
        membershipPattern,
      );

    if (!match) {
      continue;
    }

    const membershipType =
      match[1].toUpperCase() as
        | 'ACA'
        | 'FCA';

    const membershipNo =
      match[2];

    /*
     * Each alphabetical member entry ends
     * at its ACA/FCA + enrolment-number line.
     */
    const block = allLines.slice(
      blockStart,
      i + 1,
    );

    blockStart = i + 1;

    if (
      seenMembershipNos.has(
        membershipNo,
      )
    ) {
      continue;
    }

    const membershipIndex =
      block.length - 1;

    const memberName =
      findMemberName(
        block,
        membershipIndex,
      );

    if (!memberName) {
      continue;
    }

    const {
      firmName,
      firmAddress,
    } = extractFirm(block);

    /*
     * Today's target is members connected
     * to an accountancy firm.
     */
    if (!firmName) {
      continue;
    }

    const contactText =
      block.join(' | ');

    const mobile =
      getMobile(contactText);

    const emails =
      block
        .map(getEmail)
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        );

    const email =
      emails.length > 0
        ? emails[0]
        : null;

    seenMembershipNos.add(
      membershipNo,
    );

    records.push({
      memberName,
      membershipNo,
      membershipType,
      firmName,
      firmAddress,
      mobile,
      email,
    });
  }

  records.sort((a, b) =>
    Number(a.membershipNo) -
    Number(b.membershipNo),
  );

  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        source:
          'ICAB List of Members & Firms 2024-2025',
        generatedAt:
          new Date().toISOString(),
        total: records.length,
        members: records,
      },
      null,
      2,
    ),
    'utf8',
  );

  const csvHeader = [
    'Member Name',
    'Membership No',
    'Membership Type',
    'Firm Name',
    'Firm Address',
    'Mobile',
    'Email',
  ];

  const csvRows = [
    csvHeader.join(','),
    ...records.map((record) =>
      [
        record.memberName,
        record.membershipNo,
        record.membershipType,
        record.firmName,
        record.firmAddress,
        record.mobile,
        record.email,
      ]
        .map(csvEscape)
        .join(','),
    ),
  ];

  await fs.writeFile(
    csvPath,
    csvRows.join('\r\n'),
    'utf8',
  );

  const withAddress =
    records.filter(
      (r) => r.firmAddress,
    ).length;

  const withMobile =
    records.filter(
      (r) => r.mobile,
    ).length;

  const withEmail =
    records.filter(
      (r) => r.email,
    ).length;

  const sample1842 =
    records.find(
      (r) =>
        r.membershipNo === '1842',
    );

  const sample527 =
    records.find(
      (r) =>
        r.membershipNo === '527',
    );

  const report = [
    'ICAB PRACTICE MEMBER EXTRACTION',
    '===============================',
    '',
    `Total firm-linked members: ${records.length}`,
    `With firm address: ${withAddress}`,
    `With mobile: ${withMobile}`,
    `With email: ${withEmail}`,
    '',
    'KNOWN SAMPLE CHECKS',
    '===================',
    '',
    `1842: ${
      sample1842
        ? JSON.stringify(sample1842)
        : 'NOT FOUND'
    }`,
    '',
    `527: ${
      sample527
        ? JSON.stringify(sample527)
        : 'NOT FOUND'
    }`,
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
    'ICAB practice-member extraction complete.',
  );

  console.table({
    totalFirmLinkedMembers:
      records.length,
    withFirmAddress:
      withAddress,
    withMobile,
    withEmail,
  });

  console.log('');
  console.log('Known checks:');
  console.log(
    '1842:',
    sample1842 ?? 'NOT FOUND',
  );
  console.log(
    '527:',
    sample527 ?? 'NOT FOUND',
  );

  console.log('');
  console.log(
    'DATABASE WAS NOT MODIFIED.',
  );

  console.log('');
  console.log(`CSV: ${csvPath}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(
    `Report: ${reportPath}`,
  );
}

main().catch((error) => {
  console.error(
    'ICAB member extraction failed:',
  );
  console.error(error);
  process.exitCode = 1;
});