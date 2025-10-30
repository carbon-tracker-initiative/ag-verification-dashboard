/**
 * Data loader for verified analysis results
 * Loads JSON files from results folder and parses them
 */

import type { AnalysisResult, CompanyYearData, ParsedFilename } from '../types/analysis';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Parse filename to extract metadata
 * Format: CompanyName_YYYY_v3_model-name_DD-MM-YYYY_HH-MM-SS[_verified].json
 */
export function parseFilename(filename: string): ParsedFilename | null {
  // Remove .json extension
  const nameWithoutExt = filename.replace('.json', '');

  // Check if it's a verification report
  const isReport = nameWithoutExt.includes('_verification_report');

  // Check if it's verified
  const isVerified = nameWithoutExt.includes('_verified');

  // Remove suffixes to parse base info
  const baseName = nameWithoutExt
    .replace('_verification_report', '')
    .replace('_verified', '');

  // Split by underscore
  const parts = baseName.split('_');

  if (parts.length < 5) {
    console.warn(`Could not parse filename: ${filename}`);
    return null;
  }

  // Extract components
  // Format: CompanyName_YYYY_v3_model-name_DD-MM-YYYY_HH-MM-SS
  const company = parts[0];
  const year = parseInt(parts[1]);
  const version = parts[2]; // v3
  const model = parts[3]; // gemini-2-5-flash
  const datePart = parts[4]; // DD-MM-YYYY
  const timePart = parts[5] || '00-00-00'; // HH-MM-SS
  const timestamp = `${datePart}_${timePart}`;

  if (isNaN(year)) {
    console.warn(`Could not parse year from filename: ${filename}`);
    return null;
  }

  return {
    company,
    year,
    version,
    model,
    timestamp,
    isVerified,
    isReport
  };
}

/**
 * Load and parse a single JSON file
 */
export async function loadJsonFile(filePath: string): Promise<AnalysisResult | any> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Load all company data from results folder
 */
export async function loadAllCompanyData(): Promise<CompanyYearData[]> {
  const resultsPath = join(process.cwd(), '../../results');

  try {
    const files = await readdir(resultsPath);

    // Filter for verified JSON files
    const verifiedFiles = files.filter(f =>
      f.endsWith('_verified.json') && !f.includes('_verification_report')
    );

    console.log(`Found ${verifiedFiles.length} verified files`);

    // Group files by company-year-model
    const dataMap = new Map<string, CompanyYearData>();

    for (const verifiedFile of verifiedFiles) {
      const parsed = parseFilename(verifiedFile);
      if (!parsed) continue;

      const key = `${parsed.company}_${parsed.year}_${parsed.model}`;

      // Load verified file
      const verifiedPath = join(resultsPath, verifiedFile);
      const verified = await loadJsonFile(verifiedPath);

      // Try to load original file (without _verified suffix)
      const originalFile = verifiedFile.replace('_verified.json', '.json');
      let original: AnalysisResult | undefined;
      try {
        const originalPath = join(resultsPath, originalFile);
        original = await loadJsonFile(originalPath);
      } catch {
        console.log(`No original file found for ${verifiedFile}`);
      }

      // Try to load verification report
      const reportFile = verifiedFile.replace('_verified.json', '_verification_report.json');
      let verificationReport: any | undefined;
      try {
        const reportPath = join(resultsPath, reportFile);
        verificationReport = await loadJsonFile(reportPath);
      } catch {
        console.log(`No verification report found for ${verifiedFile}`);
      }

      // Create CompanyYearData
      const companyData: CompanyYearData = {
        company: parsed.company,
        year: parsed.year,
        model: parsed.model,
        verified: normalizeAnalysisResult(verified),
        original: original ? normalizeAnalysisResult(original) : undefined,
        verificationReport,
        hasComparison: !!(original && verificationReport)
      };

      dataMap.set(key, companyData);
    }

    // Convert map to array
    return Array.from(dataMap.values());

  } catch (error) {
    console.error('Error loading company data:', error);
    return [];
  }
}

/**
 * Load data for a specific company and year
 */
export async function loadCompanyYear(
  company: string,
  year: number
): Promise<CompanyYearData | null> {
  const allData = await loadAllCompanyData();

  // Find matching company-year (case-insensitive company name)
  const companyLower = company.toLowerCase();
  const found = allData.find(d =>
    d.company.toLowerCase() === companyLower && d.year === year
  );

  return found || null;
}

/**
 * Get list of all companies
 */
export async function getCompanies(): Promise<string[]> {
  const allData = await loadAllCompanyData();
  const companies = new Set(allData.map(d => d.company));
  return Array.from(companies).sort();
}

/**
 * Get list of years for a company
 */
export async function getYearsForCompany(company: string): Promise<number[]> {
  const allData = await loadAllCompanyData();
  const companyLower = company.toLowerCase();

  const years = allData
    .filter(d => d.company.toLowerCase() === companyLower)
    .map(d => d.year);

  return Array.from(new Set(years)).sort((a, b) => b - a); // Descending
}

/**
 * Normalize analysis result (ensure all required fields exist)
 */
export function normalizeAnalysisResult(result: any): AnalysisResult {
  // Ensure analysis_results field exists
  if (!result.analysis_results) {
    result.analysis_results = [];
  }

  // Normalize each question
  result.analysis_results = result.analysis_results.map((q: any) => {
    // Ensure disclosures field exists
    if (!q.disclosures) {
      q.disclosures = [];
    }

    // Normalize each snippet
    q.disclosures = q.disclosures.map((s: any) => {
      // Ensure financial_amounts exists
      if (!s.financial_amounts) {
        s.financial_amounts = [];
      }

      // Ensure categorization exists with defaults
      if (!s.categorization) {
        s.categorization = {
          framing: "Neutral",
          framing_justification: "",
          financial_type: "Non-Financial",
          financial_justification: "",
          timeframe: "Multiple or Unclear",
          timeframe_justification: ""
        };
      }

      return s;
    });

    return q;
  });

  return result as AnalysisResult;
}
