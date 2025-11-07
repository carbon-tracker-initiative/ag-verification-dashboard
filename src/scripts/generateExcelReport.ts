/**
 * CLI script to generate Excel reports from AG verification data
 * Usage:
 *   npm run export:excel
 *   npm run export:excel -- --company Syngenta
 *   npm run export:excel -- --version v4
 *   npm run export:excel -- --output reports/custom-report.xlsx
 */

import { loadAllCompanyData } from '../utils/dataLoader';
import { generateExcelWorkbook, saveWorkbookToFile } from '../utils/excelGenerator';
import { basename, dirname, extname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';

// ============================================================================
// Command-line Arguments Parsing
// ============================================================================

interface CliOptions {
  company?: string;
  year?: number;
  version?: string;
  output?: string;
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
AG Verification Dashboard - Excel Export Tool

Usage:
  npm run export:excel [options]

Options:
  --company <name>     Filter by company name (e.g., Syngenta, Nutrien)
  --year <year>        Filter by fiscal year (e.g., 2024)
  --version <version>  Filter by schema version (e.g., v3, v4)
  --output <path>      Custom output file path (default: reports/AG_Verification_Summary_YYYY-MM-DD.xlsx)
  --help, -h           Show this help message

Examples:
  npm run export:excel
    Generate report for all companies

  npm run export:excel -- --company Syngenta
    Generate report for Syngenta only

  npm run export:excel -- --company Syngenta --version v4
    Generate report for Syngenta v4 data only

  npm run export:excel -- --year 2024
    Generate report for all 2024 data

  npm run export:excel -- --output reports/custom-report.xlsx
    Generate report with custom filename
`);
}

// ============================================================================
// Main Export Logic
// ============================================================================

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log('[INFO] AG Verification Dashboard - Excel Export Tool\n');

  try {
    // Load all company data
    console.log('[INFO] Loading company data from results folder...');
    let companyDataArray = await loadAllCompanyData();

    if (companyDataArray.length === 0) {
      console.error('[ERROR] No data found in results folder!');
      console.error('   Make sure there are verified JSON files in the results/ directory.');
      process.exit(1);
    }

    console.log(`[INFO] Loaded data for ${companyDataArray.length} company-year-version combinations\n`);

    // Apply filters
    if (options.company) {
      const companyLower = options.company.toLowerCase();
      companyDataArray = companyDataArray.filter(cd =>
        cd.company.toLowerCase() === companyLower
      );
      console.log(`[INFO] Filtered by company: ${options.company}`);
    }

    if (options.year) {
      companyDataArray = companyDataArray.filter(cd => cd.year === options.year);
      console.log(`[INFO] Filtered by year: ${options.year}`);
    }

    if (options.version) {
      companyDataArray = companyDataArray.filter(cd => cd.version === options.version);
      console.log(`[INFO] Filtered by version: ${options.version}`);
    }

    if (companyDataArray.length === 0) {
      console.error('[ERROR] No data matches the specified filters!');
      process.exit(1);
    }

    console.log(`[INFO] Generating report for ${companyDataArray.length} datasets...\n`);

    // Generate Excel workbook
    console.log('[INFO] Creating Excel workbook with 7 sheets...');
    const workbook = await generateExcelWorkbook(companyDataArray);

    // Create reports directory if it doesn't exist
    const reportsDir = join(process.cwd(), 'reports');
    try {
      await mkdir(reportsDir, { recursive: true });
    } catch (e) {
      // Directory might already exist, that's okay
    }

    // Determine output path
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `AG_Verification_Summary_${timestamp}.xlsx`;
    const outputPath = options.output
      ? join(process.cwd(), options.output)
      : join(reportsDir, defaultFilename);

    // Save workbook
    console.log('[INFO] Saving Excel file...');
    await saveWorkbookToFile(workbook, outputPath);

    console.log(`\n[SUCCESS] Excel report generated successfully!`);
    console.log(`[INFO] File saved to: ${outputPath}`);

    const mergedCompanyData = companyDataArray.filter(cd => cd.isMerged);
    if (mergedCompanyData.length > 0) {
      console.log('\n[INFO] Generating merged-only workbook...');
      const mergedWorkbook = await generateExcelWorkbook(mergedCompanyData);
      const mergedOutputPath = options.output
        ? appendSuffixToPath(outputPath, '.merged')
        : join(reportsDir, `AG_Verification_Merged_${timestamp}.xlsx`);
      await saveWorkbookToFile(mergedWorkbook, mergedOutputPath);
      console.log(`[INFO] Merged workbook saved to: ${mergedOutputPath}`);
    }

    console.log(`\n[INFO] Report contains:`);
    console.log(`   - Executive Summary - High-level statistics`);
    console.log(`   - Company Details - Full metrics for each company`);
    console.log(`   - Question Performance - Cross-company question rankings`);
    console.log(`   - Category Analysis - Category-level breakdown`);
    console.log(`   - Question Coverage - Sector applicability & disclosure status for every question`);
    console.log(`   - Snippet Raw Data - All snippets with full details`);
    console.log(`   - Verification Report - Quality assurance metrics`);
    console.log(`   - Column Reference - Explanation of all columns`);

    // Summary stats
    const companies = Array.from(new Set(companyDataArray.map(cd => cd.company)));
    const versions = Array.from(new Set(companyDataArray.map(cd => cd.version)));
    const totalSnippets = companyDataArray.reduce((sum, cd) => {
      return sum + cd.verified.analysis_results.reduce((qsum, q) => qsum + q.disclosures.length, 0);
    }, 0);

    console.log(`\n[INFO] Summary:`);
    console.log(`   - Companies: ${companies.join(', ')}`);
    console.log(`   - Company Count: ${companies.length}`);
    console.log(`   - Versions: ${versions.join(', ')}`);
    console.log(`   - Total Snippets: ${totalSnippets}`);
    console.log(`   - Total Questions: ${companyDataArray.reduce((sum, cd) => sum + cd.verified.analysis_results.length, 0)}`);

    console.log(`\n[INFO] Done!\n`);

  } catch (error) {
    console.error('\n[ERROR] Error generating Excel report:');
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main();
