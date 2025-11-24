/**
 * Generate page-count summaries for each company/year folder under public/source_documents.
 * - Writes a page_summary.txt inside each leaf folder with per-file page counts and totals.
 * - Aggregates totals into public/source_documents/page_totals.json for UI consumption.
 *
 * Usage:
 *   npm run summarize:pages
 */

import { PDFDocument } from 'pdf-lib';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

type YearTotals = Record<string, { totalPages: number; files: Record<string, number> }>;
type PageTotals = Record<string, YearTotals>;

const ROOT = join(process.cwd(), 'public', 'source_documents');
const SUMMARY_FILENAME = 'page_summary.txt';
const AGGREGATE_FILENAME = 'page_totals.json';

async function getPdfPageCount(filePath: string): Promise<number | null> {
  try {
    const buffer = await readFile(filePath);
    const pdf = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false
    });
    return pdf.getPageCount();
  } catch (error) {
    console.warn(`Could not read PDF pages for ${filePath}:`, (error as Error).message);
    return null;
  }
}

async function processYearFolder(company: string, yearPath: string, year: string): Promise<YearTotals[string]> {
  const entries = await readdir(yearPath, { withFileTypes: true });
  const pdfs = entries
    .filter(entry => entry.isFile() && extname(entry.name).toLowerCase() === '.pdf')
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const files: Record<string, number> = {};
  let totalPages = 0;

  for (const pdfName of pdfs) {
    const filePath = join(yearPath, pdfName);
    const pages = await getPdfPageCount(filePath);
    if (pages !== null) {
      files[pdfName] = pages;
      totalPages += pages;
    }
  }

  const lines = [
    ...pdfs.map(name => {
      const pages = files[name];
      return pages !== undefined ? `${name}  ${pages} pages` : `${name}  pages: unknown`;
    }),
    `Total: ${totalPages} pages`
  ];

  const summaryPath = join(yearPath, SUMMARY_FILENAME);
  await writeFile(summaryPath, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${summaryPath}`);

  return { totalPages, files };
}

async function generateSummaries() {
  const aggregate: PageTotals = {};
  const companies = await readdir(ROOT, { withFileTypes: true });

  for (const companyDir of companies) {
    if (!companyDir.isDirectory()) continue;

    const company = companyDir.name;
    const companyPath = join(ROOT, company);
    const years = await readdir(companyPath, { withFileTypes: true });

    for (const yearDir of years) {
      if (!yearDir.isDirectory()) continue;

      const year = yearDir.name;
      const yearPath = join(companyPath, year);
      const totals = await processYearFolder(company, yearPath, year);

      if (!aggregate[company]) aggregate[company] = {};
      aggregate[company][year] = totals;
    }
  }

  const aggregatePath = join(ROOT, AGGREGATE_FILENAME);
  await writeFile(aggregatePath, JSON.stringify(aggregate, null, 2), 'utf-8');
  console.log(`Wrote aggregate totals to ${aggregatePath}`);
}

generateSummaries().catch(error => {
  console.error('Failed to generate page summaries:', error);
  process.exitCode = 1;
});
