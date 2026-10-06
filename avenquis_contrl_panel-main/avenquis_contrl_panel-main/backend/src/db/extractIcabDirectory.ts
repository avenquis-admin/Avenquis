import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TextItem = {
  str: string;
  transform?: number[];
  width?: number;
};

type PositionedItem = {
  text: string;
  x: number;
  y: number;
  width: number;
};

type Row = {
  y: number;
  items: PositionedItem[];
};

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function groupIntoRows(
  items: PositionedItem[],
): Row[] {
  const rows: Row[] = [];
  const tolerance = 2.5;

  const sorted = [...items].sort((a, b) => {
    if (
      Math.abs(a.y - b.y) >
      tolerance
    ) {
      return b.y - a.y;
    }

    return a.x - b.x;
  });

  for (const item of sorted) {
    let row = rows.find(
      (candidate) =>
        Math.abs(
          candidate.y - item.y,
        ) <= tolerance,
    );

    if (!row) {
      row = {
        y: item.y,
        items: [],
      };

      rows.push(row);
    }

    row.items.push(item);
  }

  rows.sort(
    (a, b) => b.y - a.y,
  );

  for (const row of rows) {
    row.items.sort(
      (a, b) => a.x - b.x,
    );
  }

  return rows;
}

function rowToText(
  row: Row,
): string {
  const parts: string[] = [];

  let previousEnd:
    | number
    | null = null;

  for (const item of row.items) {
    if (previousEnd !== null) {
      const gap =
        item.x - previousEnd;

      if (gap > 35) {
        parts.push('    ');
      } else if (gap > 3) {
        parts.push(' ');
      }
    }

    parts.push(item.text);

    previousEnd =
      item.x +
      Math.max(
        item.width,
        item.text.length * 4,
      );
  }

  return normalizeText(
    parts.join(''),
  );
}

async function main() {
  const pdfPath = path.resolve(
    __dirname,
    '../../data/icab/icab-members-firms-2025-26.pdf',
  );

  const outputPath = path.resolve(
    __dirname,
    '../../data/icab/icab-members-firms-2025-26.txt',
  );

  const debugPath = path.resolve(
    __dirname,
    '../../data/icab/icab-layout-debug.txt',
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
    `ICAB PDF pages: ${pdf.numPages}`,
  );

  const output: string[] = [];
  const debug: string[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page =
      await pdf.getPage(
        pageNumber,
      );

    const content =
      await page.getTextContent();

    const positioned: PositionedItem[] =
      [];

    for (
      const rawItem of
        content.items as TextItem[]
    ) {
      if (
        !rawItem.str ||
        !rawItem.transform
      ) {
        continue;
      }

      const text =
        normalizeText(
          rawItem.str,
        );

      if (!text) {
        continue;
      }

      positioned.push({
        text,
        x:
          Number(
            rawItem.transform[4],
          ) || 0,
        y:
          Number(
            rawItem.transform[5],
          ) || 0,
        width:
          Number(
            rawItem.width,
          ) || 0,
      });
    }

    const rows =
      groupIntoRows(
        positioned,
      );

    output.push('');
    output.push(
      `===== PAGE ${pageNumber} =====`,
    );
    output.push('');

    debug.push('');
    debug.push(
      `===== PAGE ${pageNumber} =====`,
    );

    for (const row of rows) {
      const text =
        rowToText(row);

      if (!text) {
        continue;
      }

      output.push(text);

      debug.push(
        `${row.y
          .toFixed(2)
          .padStart(8)} | ${text}`,
      );
    }

    if (
      pageNumber === 1 ||
      pageNumber % 25 === 0 ||
      pageNumber ===
        pdf.numPages
    ) {
      console.log(
        `Extracted ${pageNumber}/${pdf.numPages}`,
      );
    }
  }

  await fs.writeFile(
    outputPath,
    output.join('\n'),
    'utf8',
  );

  await fs.writeFile(
    debugPath,
    debug.join('\n'),
    'utf8',
  );

  console.log('');
  console.log(
    'Layout-aware extraction complete.',
  );

  console.log(
    `Text: ${outputPath}`,
  );

  console.log(
    `Debug: ${debugPath}`,
  );
}

main().catch((error) => {
  console.error(
    'ICAB extraction failed:',
  );
  console.error(error);
  process.exitCode = 1;
});
