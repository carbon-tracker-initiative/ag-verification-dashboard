/**
 * CLI script to generate Excel reports for merged-reviewed datasets
 * Usage:
 *   npm run export:excel-merged-reviewed-v1
 *   npm run export:excel-merged-reviewed-v1 -- --company Syngenta
 */

import { mkdir } from 'node:fs/promises';
import { dirname, join, basename, extname, isAbsolute } from 'node:path';
import { loadAllCompanyData, loadMergedReviewedCompanyData } from '../utils/dataLoader';
import { generateExcelWorkbook, saveWorkbookToFile } from '../utils/excelGenerator';
import {
  buildMergedReviewedComparisonData,
  createMergedReviewedComparisonWorkbook,
  loadReviewDecisionLookup
} from '../utils/mergedReviewComparison';
import type { CompanyYearData } from '../types/analysis';

interface CliOptions {
  company?: string;
  year?: number;
  version?: string;
  output?: string;
  reviewFile?: string;
  help?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--company' && i + 1 < args.length) {
      options.company = args[++i];
    } else if (arg === '--year' && i + 1 < args.length) {
      options.year = parseInt(args[++i]);
    } else if (arg === '--version' && i + 1 < args.length) {
      options.version = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[++i];
    } else if (arg === '--review' && i + 1 < args.length) {
      options.reviewFile = args[++i];
    }
  }

  return options;
}

function appendSuffixToPath(filePath: string, suffix: string): string {
  const extension = extname(filePath) || '.xlsx';
  const baseName = basename(filePath, extension);
  const directory = dirname(filePath);
  return join(directory, `${baseName}${suffix}${extension}`);
}

function printHelp() {
  console.log(`
AG Verification Dashboard - Merged Reviewed Export Tool

Usage:
  npm run export:excel-merged-reviewed-v1 [options]

Options:
  --company <name>     Filter by company name (e.g., Syngenta, Nutrien)
  --year <year>        Filter by fiscal year (e.g., 2024)
  --version <version>  Filter by schema version (merged or merged-reviewed)
  --output <path>      Custom reviewed workbook output path
  --review <path>      Path to review JSONL file (default: results/files_for_dedudped_and_reviewed/review_latest.jsonl)
  --help, -h           Show this help message
`);
}

function applyFilters(data: CompanyYearData[], options: CliOptions): CompanyYearData[] {
  let filtered = data;

  if (options.company) {
    const companyLower = options.company.toLowerCase();
    filtered = filtered.filter(entry => entry.company.toLowerCase() === companyLower);
  }

  if (options.year) {
    filtered = filtered.filter(entry => entry.year === options.year);
  }

  if (options.version) {
    const versionLower = options.version.toLowerCase();
    filtered = filtered.filter(entry => entry.version.toLowerCase() === versionLower);
  }

  return filtered;
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log('[INFO] AG Verification Dashboard - Merged Reviewed Export Tool\n');

  const reportsDir = join(process.cwd(), 'reports');
  await mkdir(reportsDir, { recursive: true });

  try {
    const allData = await loadAllCompanyData();
    const mergedData = allData.filter(entry => entry.isMerged);
    let reviewedData = await loadMergedReviewedCompanyData();

    if (reviewedData.length === 0) {
      console.error('[ERROR] No deduped + reviewed files found in results/deduped_and_reviewed/');
      process.exit(1);
    }

    const filteredMerged = applyFilters(mergedData, options);
    reviewedData = applyFilters(reviewedData, options);

    if (reviewedData.length === 0) {
      console.error('[ERROR] Filters produced zero reviewed datasets.');
      process.exit(1);
    }

    console.log(`[INFO] Found ${reviewedData.length} reviewed datasets after filters`);

    // === Workbook 1: Reviewed datasets (standard 7-sheet format) ===
    console.log('[INFO] Creating reviewed-only Excel workbook...');
    const reviewedWorkbook = await generateExcelWorkbook(reviewedData, {
      includeMergedOverview: true
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const reviewedOutputPath = options.output
      ? (isAbsolute(options.output) ? options.output : join(process.cwd(), options.output))
      : join(reportsDir, `AG_Verification_Deduped_Reviewed_${timestamp}.xlsx`);

    await saveWorkbookToFile(reviewedWorkbook, reviewedOutputPath);
    console.log(`[SUCCESS] Reviewed workbook saved to: ${reviewedOutputPath}`);

    // === Workbook 2: Merged vs Reviewed summary ===
    const reviewFilePath = options.reviewFile
      ? (isAbsolute(options.reviewFile) ? options.reviewFile : join(process.cwd(), options.reviewFile))
      : join(process.cwd(), 'results', 'files_for_dedudped_and_reviewed', 'review_latest.jsonl');

    console.log('[INFO] Loading review decisions...');
    const decisionLookup = await loadReviewDecisionLookup(reviewFilePath);

    const comparisonData = buildMergedReviewedComparisonData(filteredMerged, reviewedData, decisionLookup);
    if (comparisonData.summaries.length === 0) {
      console.warn('[WARN] No overlapping merged datasets found for comparison. Comparison workbook will still include the review log.');
    } else {
      console.log(`[INFO] Comparison includes ${comparisonData.summaries.length} company datasets`);
      console.log(`[INFO] Total removed snippets captured: ${comparisonData.removedSnippets.length}`);
    }

    const comparisonWorkbook = createMergedReviewedComparisonWorkbook(comparisonData);
    const comparisonOutputPath = options.output
      ? appendSuffixToPath(reviewedOutputPath, '.comparison')
      : join(reportsDir, `AG_Verification_Merged_vs_Reviewed_${timestamp}.xlsx`);

    await saveWorkbookToFile(comparisonWorkbook, comparisonOutputPath);
    console.log(`[SUCCESS] Comparison workbook saved to: ${comparisonOutputPath}`);

    console.log('\n[INFO] Export complete!');
  } catch (error) {
    console.error('\n[ERROR] Failed to generate merged-reviewed exports:');
    console.error(error);
    process.exit(1);
  }
}

main();
