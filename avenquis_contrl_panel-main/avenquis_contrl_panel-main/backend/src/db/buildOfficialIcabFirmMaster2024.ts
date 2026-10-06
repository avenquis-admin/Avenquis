import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Firm = {
  name: string;
  address: string | null;
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

function canonical(value: string): string {
  return clean(value)
    .replace(/\s*,?\s*Chartered Accountants?\s*$/i, '')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s+\./g, '.')
    .trim();
}

function key(value: string): string {
  return canonical(value)
    .toLowerCase()
    .replace(/\band\b/g, '&')
    .replace(/[^a-z0-9&]+/g, '')
    .replace(/&/g, 'and');
}

function getMobile(text: string): string | null {
  const match = text.match(
    /(?:\+?88[\s-]*)?01[3-9](?:[\s-]*\d){8}/,
  );

  return match
    ? match[0].replace(/[\s-]/g, '')
    : null;
}

function getEmail(text: string): string | null {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  );

  return match?.[0]?.toLowerCase() ?? null;
}

async function getPageLines(page: any): Promise<string[]> {
  const content = await page.getTextContent();

  const rows = new Map<
    number,
    { x: number; text: string }[]
  >();

  for (const item of content.items as any[]) {
    if (
      typeof item.str !== 'string' ||
      !item.transform
    ) {
      continue;
    }

    const text = clean(item.str);

    if (!text) continue;

    const x = Number(item.transform[4]) || 0;
    const y = Math.round(
      (Number(item.transform[5]) || 0) * 2,
    ) / 2;

    const row = rows.get(y) ?? [];

    row.push({
      x,
      text,
    });

    rows.set(y, row);
  }

  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) =>
      items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(' ')
        .trim(),
    )
    .filter(Boolean);
}

function isFirmHeading(
  line: string,
  next: string | undefined,
): boolean {
  if (!next) return false;

  if (
    !/^chartered accountants?$/i.test(
      clean(next),
    )
  ) {
    return false;
  }

  const value = clean(line);

  if (
    !value ||
    value.length < 2 ||
    value.length > 120
  ) {
    return false;
  }

  if (
    /^(?:partner|proprietor|senior partner|managing partner|director|member)$/i.test(
      value,
    )
  ) {
    return false;
  }

  if (
    /\b(?:ACA|FCA)\b/i.test(value)
  ) {
    return false;
  }

  return true;
}

async function main() {
  const pdfPath = path.resolve(
    __dirname,
    '../../data/icab/icab-members-firms-2024-25.pdf',
  );

  const normalizedPath = path.resolve(
    __dirname,
    '../../data/icab/icab-practice-members-2024-25-firm-normalized.json',
  );

  const outputPath = path.resolve(
    __dirname,
    '../../data/icab/icab-official-firm-master-2024-25.json',
  );

  const comparePath = path.resolve(
    __dirname,
    '../../data/icab/icab-firm-master-compare-report.txt',
  );

  const buffer = await fs.readFile(pdfPath);

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  const allLines: string[] = [];
  let collecting = false;

  for (
    let pageNo = 1;
    pageNo <= pdf.numPages;
    pageNo++
  ) {
    const page = await pdf.getPage(pageNo);
    const lines = await getPageLines(page);

    const joined = lines.join(' ');

    if (
      !collecting &&
      /ALPHABETICAL\s+LIST\s+OF\s+FIRMS/i.test(
        joined,
      )
    ) {
      collecting = true;

      console.log(
        `Firm section found at PDF page ${pageNo}`,
      );
    }

    if (!collecting) {
      continue;
    }

    if (
      /CHRONOLOGICAL\s+LIST\s+OF\s+MEMBERS/i.test(
        joined,
      )
    ) {
      console.log(
        `Firm section ended before PDF page ${pageNo}`,
      );
      break;
    }

    allLines.push(...lines);
  }

  if (!collecting) {
    throw new Error(
      'Alphabetical List of Firms section not found.',
    );
  }

  const firms = new Map<string, Firm>();

  for (
    let i = 0;
    i < allLines.length - 1;
    i++
  ) {
    if (
      !isFirmHeading(
        allLines[i],
        allLines[i + 1],
      )
    ) {
      continue;
    }

    const name =
      canonical(allLines[i]);

    const firmKey =
      key(name);

    if (
      !firmKey ||
      firms.has(firmKey)
    ) {
      continue;
    }

    const block: string[] = [];

    for (
      let j = i + 2;
      j < Math.min(
        allLines.length,
        i + 30,
      );
      j++
    ) {
      if (
        isFirmHeading(
          allLines[j],
          allLines[j + 1],
        )
      ) {
        break;
      }

      block.push(allLines[j]);
    }

    const addressLines: string[] = [];

    for (const line of block) {
      if (
        /^\((?:M|O|F|R|E|W|Ph)\)/i.test(
          line,
        )
      ) {
        break;
      }

      if (
        /\b(?:ACA|FCA)\s*\(\d+\)/i.test(
          line,
        )
      ) {
        break;
      }

      if (
        /@/.test(line)
      ) {
        break;
      }

      if (
        /^LIST OF$/i.test(line) ||
        /^MEMBERS/i.test(line) ||
        /^2024-2025$/i.test(line)
      ) {
        continue;
      }

      addressLines.push(line);

      if (
        addressLines.length >= 6
      ) {
        break;
      }
    }

    const contactText =
      block.join(' | ');

    firms.set(firmKey, {
      name,
      address:
        addressLines.length
          ? addressLines.join(', ')
          : null,
      mobile:
        getMobile(contactText),
      email:
        getEmail(contactText),
    });
  }

  const officialFirms =
    [...firms.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name),
    );

  const memberData = JSON.parse(
    await fs.readFile(
      normalizedPath,
      'utf8',
    ),
  );

  const memberMap =
    new Map<string, string>();

  for (
    const member of
      memberData.members ?? []
  ) {
    memberMap.set(
      key(member.firmName),
      member.firmName,
    );
  }

  const officialKeys =
    new Set(firms.keys());

  const memberOnly =
    [...memberMap.entries()]
      .filter(
        ([firmKey]) =>
          !officialKeys.has(
            firmKey,
          ),
      )
      .map(([, name]) => name)
      .sort();

  const memberKeys =
    new Set(memberMap.keys());

  const officialOnly =
    [...firms.entries()]
      .filter(
        ([firmKey]) =>
          !memberKeys.has(
            firmKey,
          ),
      )
      .map(
        ([, firm]) =>
          firm.name,
      )
      .sort();

  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        source:
          'ICAB Alphabetical List of Firms 2024-2025',
        total:
          officialFirms.length,
        firms:
          officialFirms,
      },
      null,
      2,
    ),
    'utf8',
  );

  const report = [
    'ICAB OFFICIAL FIRM MASTER COMPARISON',
    '====================================',
    '',
    `Official firm master count: ${officialFirms.length}`,
    `Member-derived normalized firms: ${memberMap.size}`,
    `Member-derived names not matched to master: ${memberOnly.length}`,
    `Official firms without matched practice member: ${officialOnly.length}`,
    '',
    'MEMBER-DERIVED ONLY',
    '===================',
    '',
    ...memberOnly.map(
      (name) => `- ${name}`,
    ),
    '',
    'OFFICIAL MASTER ONLY',
    '====================',
    '',
    ...officialOnly.map(
      (name) => `- ${name}`,
    ),
    '',
    'DATABASE WAS NOT MODIFIED.',
  ].join('\n');

  await fs.writeFile(
    comparePath,
    report,
    'utf8',
  );

  console.log('');
  console.log(
    'ICAB OFFICIAL FIRM MASTER',
  );

  console.table({
    officialFirmMaster:
      officialFirms.length,
    normalizedMemberFirms:
      memberMap.size,
    memberOnly:
      memberOnly.length,
    officialOnly:
      officialOnly.length,
  });

  console.log('');
  console.log(
    'DATABASE WAS NOT MODIFIED.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});