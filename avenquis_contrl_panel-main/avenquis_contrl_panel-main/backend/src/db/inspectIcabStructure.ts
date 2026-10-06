import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sourcePath = path.resolve(
    __dirname,
    '../../data/icab/icab-members-firms-2025-26.txt',
  );

  const raw = await fs.readFile(sourcePath, 'utf8');

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  console.log(`Total non-empty lines: ${lines.length}`);
  console.log('');

  const emailRegex =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  const phoneRegex =
    /(?:\+?88)?01[3-9]\d{8}/;

  const membershipRegex =
    /\b(?:ACA|FCA)\b/i;

  const firmKeywords = [
    'chartered accountants',
    '& co.',
    'and co.',
    'associates',
  ];

  const candidateIndexes: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();

    const looksLikeFirm =
      firmKeywords.some((keyword) =>
        lower.includes(keyword),
      );

    if (looksLikeFirm) {
      candidateIndexes.push(i);
    }
  }

  console.log(
    `Possible firm-heading lines: ${candidateIndexes.length}`,
  );
  console.log('');

  const uniqueSamples = candidateIndexes
    .filter((index, position) => {
      if (position === 0) return true;

      return (
        index - candidateIndexes[position - 1] >
        2
      );
    })
    .slice(0, 15);

  console.log(
    '===== POSSIBLE FIRM BLOCK SAMPLES =====',
  );

  for (const index of uniqueSamples) {
    console.log('');
    console.log(
      '----------------------------------------',
    );

    const start = Math.max(0, index - 2);
    const end = Math.min(
      lines.length,
      index + 12,
    );

    for (let i = start; i < end; i++) {
      const tags: string[] = [];

      if (i === index) {
        tags.push('CANDIDATE');
      }

      if (emailRegex.test(lines[i])) {
        tags.push('EMAIL');
      }

      if (phoneRegex.test(lines[i])) {
        tags.push('PHONE');
      }

      if (membershipRegex.test(lines[i])) {
        tags.push('ACA/FCA');
      }

      const prefix =
        tags.length > 0
          ? `[${tags.join(',')}] `
          : '';

      console.log(
        `${String(i + 1).padStart(6, '0')} ${prefix}${lines[i]}`,
      );
    }
  }

  console.log('');
  console.log(
    '===== CONTACT / MEMBER STATISTICS =====',
  );

  console.log(
    'Lines containing email:',
    lines.filter((line) =>
      emailRegex.test(line),
    ).length,
  );

  console.log(
    'Lines containing mobile:',
    lines.filter((line) =>
      phoneRegex.test(line),
    ).length,
  );

  console.log(
    'Lines containing ACA/FCA:',
    lines.filter((line) =>
      membershipRegex.test(line),
    ).length,
  );

  console.log('');
  console.log(
    'No database changes were made.',
  );
}

main().catch((error) => {
  console.error(
    'ICAB structure inspection failed:',
  );
  console.error(error);
  process.exitCode = 1;
});
