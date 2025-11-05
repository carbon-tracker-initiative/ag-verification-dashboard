/**
 * Data loader for verified analysis results
 * Loads JSON files from results folder and parses them
 */

import type { AnalysisResult, CompanyYearData, ParsedFilename, Question } from '../types/analysis';

// Re-export Question type for backward compatibility
export type { Question };
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
  const resultsPath = join(process.cwd(), 'results');

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

      const key = `${parsed.company}_${parsed.year}_${parsed.version}_${parsed.model}`;

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

      // Normalize and add metadata from filename
      const normalizedVerified = normalizeAnalysisResult(verified);
      normalizedVerified.company_name = parsed.company;
      normalizedVerified.fiscal_year = parsed.year;
      normalizedVerified.version = parsed.version;
      normalizedVerified.model_used = parsed.model;

      const normalizedOriginal = original ? normalizeAnalysisResult(original) : undefined;
      if (normalizedOriginal) {
        normalizedOriginal.company_name = parsed.company;
        normalizedOriginal.fiscal_year = parsed.year;
        normalizedOriginal.version = parsed.version;
        normalizedOriginal.model_used = parsed.model;
      }

      // Create CompanyYearData
      const companyData: CompanyYearData = {
        company: parsed.company,
        year: parsed.year,
        version: parsed.version,
        model: parsed.model,
        verified: normalizedVerified,
        original: normalizedOriginal,
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
 * Load data for a specific company, year, and optionally version
 * If version is not specified, returns the latest version available
 */
export async function loadCompanyYear(
  company: string,
  year: number,
  version?: string
): Promise<CompanyYearData | null> {
  const allData = await loadAllCompanyData();

  // Find matching company-year (case-insensitive company name)
  const companyLower = company.toLowerCase();
  const matches = allData.filter(d =>
    d.company.toLowerCase() === companyLower && d.year === year
  );

  if (matches.length === 0) return null;

  // If version is specified, find exact match
  if (version) {
    return matches.find(d => d.version === version) || null;
  }

  // Otherwise, return the latest version (v4 > v3, etc.)
  matches.sort((a, b) => {
    const versionA = parseInt(a.version.replace('v', ''));
    const versionB = parseInt(b.version.replace('v', ''));
    return versionB - versionA; // Descending order
  });

  return matches[0];
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
 * Get list of versions for a company and year
 */
export async function getVersionsForCompanyYear(
  company: string,
  year: number
): Promise<string[]> {
  const allData = await loadAllCompanyData();
  const companyLower = company.toLowerCase();

  const versions = allData
    .filter(d => d.company.toLowerCase() === companyLower && d.year === year)
    .map(d => d.version);

  // Sort versions (v4, v3, v2, v1, etc.)
  return Array.from(new Set(versions)).sort((a, b) => {
    const versionA = parseInt(a.replace('v', ''));
    const versionB = parseInt(b.replace('v', ''));
    return versionB - versionA; // Descending order
  });
}

/**
 * Get all unique company-year-version combinations
 */
export async function getAllCompanyYearVersions(): Promise<Array<{
  company: string;
  year: number;
  version: string;
}>> {
  const allData = await loadAllCompanyData();
  return allData.map(d => ({
    company: d.company,
    year: d.year,
    version: d.version
  }));
}

/**
 * Get base question ID (remove variant suffixes like -A, -B)
 * This is for backward compatibility with dark-doppler components
 */
export function getBaseQuestionId(questionId: string): string {
  return questionId.replace(/-[A-Z]$/, '');
}

/**
 * Normalize analysis result (ensure all required fields exist)
 */
export function normalizeAnalysisResult(result: any): AnalysisResult {
  // Add default top-level fields if missing
  if (!result.company_name) result.company_name = '';
  if (!result.fiscal_year) result.fiscal_year = 0;
  if (!result.version) result.version = '';
  if (!result.analysis_date) result.analysis_date = new Date().toISOString().split('T')[0];
  if (!result.model_used) result.model_used = '';
  if (!result.documents_analyzed) result.documents_analyzed = [];

  // Ensure analysis_results field exists
  if (!result.analysis_results) {
    result.analysis_results = [];
  }

  // Set total_questions to match analysis_results length
  result.total_questions = result.analysis_results.length;

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

      // Fix financial_type values (remove "-type" suffix if present)
      if (s.categorization.financial_type) {
        s.categorization.financial_type = s.categorization.financial_type.replace('-type', '');
      }

      return s;
    });

    return q;
  });

  return result as AnalysisResult;
}
