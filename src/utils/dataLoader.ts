/**
 * Data loader for verified analysis results
 * Loads JSON files from results folder and parses them
 */

import type {
  AnalysisResult,
  CompanyYearData,
  FinancialAmount,
  ParsedFilename,
  Question,
  SummaryStatistics,
  Snippet,
  Classification
} from '../types/analysis';
import { normalizeSectorCode } from '../types/questions';

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
      const sector = normalizeSectorCode(
        normalizedVerified.metadata?.company_sector as string | undefined
      );

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
        sector,
        verified: normalizedVerified,
        original: normalizedOriginal,
        verificationReport,
        hasComparison: !!(original && verificationReport)
      };

      dataMap.set(key, companyData);
    }

    // Convert map to array
    const standardData = Array.from(dataMap.values());

    const mergedData = await loadMergedCompanyData(resultsPath);

    const combined = [...standardData, ...mergedData];
    if (combined.length > 0) {
      return combined;
    }

    // Fallback: load team-reviewed collapsed bundle if no verified data found
    const teamReviewed = await loadTeamReviewedCombined(resultsPath);
    if (teamReviewed.length > 0) {
      console.log(`Loaded ${teamReviewed.length} team-reviewed company bundles as fallback`);
      return teamReviewed;
    }

    return combined;

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
    const weightA = getVersionSortWeight(a.version);
    const weightB = getVersionSortWeight(b.version);
    return weightB - weightA;
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
    const weightA = getVersionSortWeight(a);
    const weightB = getVersionSortWeight(b);
    return weightB - weightA;
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

      s.classification = normalizeClassification(s.classification);

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

const classificationMap: Record<string, Classification> = {
  FULL_DISCLOSURE: 'FULL_DISCLOSURE',
  FULL: 'FULL_DISCLOSURE',
  'FULL DISCLOSURE': 'FULL_DISCLOSURE',
  PARTIAL: 'PARTIAL',
  PARTIAL_DISCLOSURE: 'PARTIAL',
  'PARTIAL DISCLOSURE': 'PARTIAL',
  UNCLEAR: 'UNCLEAR',
  NO_DISCLOSURE: 'NO_DISCLOSURE',
  NONE: 'NO_DISCLOSURE'
};

function normalizeClassification(value: unknown): Classification {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized in classificationMap) {
      return classificationMap[normalized];
    }
  }
  return 'UNCLEAR';
}

function mapMergedFinancialType(value: string | undefined): "Financial" | "Partial-type" | "Non-Financial" {
  const normalized = (value || '').toLowerCase().trim();

  if (normalized.includes('non-financial')) {
    return "Non-Financial";
  }

  if (normalized.includes('partial')) {
    return "Partial-type";
  }

  if (normalized.includes('financial')) {
    return "Financial";
  }

  return "Non-Financial";
}

const currencyTokens = [
  { token: '$', label: 'USD' },
  { token: 'usd', label: 'USD' },
  { token: '€', label: 'EUR' },
  { token: 'eur', label: 'EUR' },
  { token: '£', label: 'GBP' },
  { token: 'gbp', label: 'GBP' },
  { token: '¥', label: 'CNY' },
  { token: 'cny', label: 'CNY' },
  { token: 'rmb', label: 'CNY' },
  { token: 'jpy', label: 'JPY' },
  { token: 'cad', label: 'CAD' },
  { token: 'aud', label: 'AUD' },
  { token: 'hkd', label: 'HKD' },
  { token: 'inr', label: 'INR' },
  { token: '₽', label: 'RUB' },
  { token: 'rub', label: 'RUB' }
];

function detectCurrencyFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { token, label } of currencyTokens) {
    if (lower.includes(token) || text.includes(token)) {
      return label;
    }
  }
  return null;
}

function parseNumericValue(text: string): number | null {
  const match = text.match(/[0-9]+(?:[.,][0-9]+)?/);
  if (!match) {
    return null;
  }
  const normalized = match[0].replace(/,/g, '');
  let value = parseFloat(normalized);
  if (Number.isNaN(value)) {
    return null;
  }

  const lower = text.toLowerCase();
  if (lower.includes('billion')) value *= 1_000_000_000;
  else if (lower.includes('million')) value *= 1_000_000;
  else if (lower.includes('thousand')) value *= 1_000;

  return value;
}

function extractFinancialAmount(entry: any): FinancialAmount | null {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const currency = detectCurrencyFromText(entry);
    if (!currency) return null;
    const amount = parseNumericValue(entry);
    if (amount === null) return null;
    return {
      amount,
      currency,
      context: entry
    };
  }

  if (typeof entry === 'object') {
    const rawAmount = entry.amount ?? entry.value ?? entry;
    let numericAmount: number | null = null;
    if (typeof rawAmount === 'number' && Number.isFinite(rawAmount)) {
      numericAmount = rawAmount;
    } else if (typeof rawAmount === 'string') {
      numericAmount = parseNumericValue(rawAmount);
    }

    const context = entry.context || '';
    let currency = (entry.currency || '').toString().trim();
    if (!currency && context) {
      const detected = detectCurrencyFromText(context);
      if (detected) currency = detected;
    }

    if (!currency || numericAmount === null) {
      return null;
    }

    return {
      amount: numericAmount,
      currency,
      context
    };
  }

  return null;
}

function mapMergedTimeframe(value: string | undefined): "Current" | "Future" | "Historical" | "Multiple or Unclear" {
  const normalized = (value || '').toLowerCase();

  if (normalized.includes('present')) {
    return "Current";
  }

  if (normalized.includes('forward')) {
    return "Future";
  }

  if (normalized.includes('backward') || normalized.includes('histor')) {
    return "Historical";
  }

  return "Multiple or Unclear";
}

function mapMergedFraming(value: string | undefined): "Risk" | "Opportunity" | "Neutral" | "Both" {
  const normalized = (value || '').toLowerCase();

  if (normalized.includes('both')) {
    return "Both";
  }

  if (normalized.includes('opportun')) {
    return "Opportunity";
  }

  if (normalized.includes('risk')) {
    return "Risk";
  }

  return "Neutral";
}

function safeNumber(value: any): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function convertMergedSnippet(rawSnippet: any, questionId: string, index: number): Snippet {
  const financialAmounts = Array.isArray(rawSnippet.financial_amounts)
    ? (rawSnippet.financial_amounts
        .map((entry: any) => extractFinancialAmount(entry))
        .filter(Boolean) as FinancialAmount[])
    : [];

  const sourceVersions = Array.isArray(rawSnippet.source_versions)
    ? rawSnippet.source_versions
    : [];

  const pageLabel = rawSnippet.page && rawSnippet.page !== 'N/A' ? `p. ${rawSnippet.page}` : undefined;
  const mergedSourceLabel = sourceVersions.length > 0 ? sourceVersions.join(', ') : undefined;
  const source = rawSnippet.source
    || rawSnippet.document
    || [`Merged evidence`, mergedSourceLabel ? `sources: ${mergedSourceLabel}` : null, pageLabel]
      .filter(Boolean)
      .join(' | ');

    const snippetResult: Record<string, any> = {
    snippet_id: rawSnippet.snippet_id || `${questionId}-merged-${index + 1}`,
    quote: rawSnippet.quote || rawSnippet.text || '',
    source,
    classification: rawSnippet.classification || 'UNCLEAR',
    classification_justification:
      rawSnippet.classification_justification
      || rawSnippet.merger_metadata?.classification_rationale
      || '',
    categorization: {
      framing: mapMergedFraming(rawSnippet.categorization?.framing),
      framing_justification: rawSnippet.categorization?.framing_justification || '',
      financial_type: mapMergedFinancialType(rawSnippet.categorization?.financial_type),
      financial_justification: rawSnippet.categorization?.financial_justification || '',
      timeframe: mapMergedTimeframe(rawSnippet.categorization?.timeframe),
      timeframe_justification: rawSnippet.categorization?.timeframe_justification || ''
    },
    financial_amounts: financialAmounts,
    source_versions: sourceVersions,
    merger_metadata: rawSnippet.merger_metadata
  };

  let comparisonStatus = rawSnippet.comparison_status as string | undefined;

  if (!comparisonStatus && rawSnippet.verification_corrected) {
    comparisonStatus = 'classification_corrected';
  }

  if (
    !comparisonStatus &&
    typeof rawSnippet.classification_justification === 'string' &&
    rawSnippet.classification_justification.toLowerCase().includes('corrected by verification')
  ) {
    comparisonStatus = 'classification_corrected';
  }

  if (!comparisonStatus) {
    const aiDecision = (rawSnippet.merger_metadata?.ai_decision || '').toLowerCase();
    if (rawSnippet.merger_metadata?.human_review_recommended || aiDecision.includes('correct')) {
      comparisonStatus = 'classification_corrected';
    }
  }

  snippetResult.comparison_status = comparisonStatus || 'unchanged';

  if (!snippetResult.comparison_change && snippetResult.comparison_status !== 'unchanged') {
    const originalClassification =
      rawSnippet.merger_metadata?.original_classification
      || rawSnippet.original_classification
      || rawSnippet.previous_classification
      || 'Original';

    const verifiedClassification =
      rawSnippet.merger_metadata?.merged_classification
      || snippetResult.classification;

    const correctionNote =
      rawSnippet.merger_metadata?.human_review_reason
      || rawSnippet.classification_justification
      || 'Corrected during merged verification review';

    snippetResult.comparison_change = {
      change_type: 'classification_corrected',
      original_classification: originalClassification,
      verified_classification: verifiedClassification,
      note: correctionNote
    };
  }

  return snippetResult as Snippet;
}

function convertMergedQuestion(rawQuestion: any, index: number): Question {
  const questionId = (rawQuestion.question_id || `Q${index + 1}`).toString();
  const disclosures = Array.isArray(rawQuestion.disclosures)
    ? rawQuestion.disclosures.map((snippet: any, snippetIndex: number) =>
        convertMergedSnippet(snippet, questionId, snippetIndex)
      )
    : [];

  return {
    question_id: questionId,
    question_number: rawQuestion.question_number ?? index + 1,
    category: rawQuestion.category || 'Other',
    sub_category: rawQuestion.sub_category || '',
    question_text: rawQuestion.question_text || '',
    disclosures,
    summary: rawQuestion.summary || '',
    merger_stats: rawQuestion.merger_stats,
    cross_question_review: rawQuestion.cross_question_review
  };
}

function buildSummaryStatisticsFromQuestions(questions: Question[]): SummaryStatistics {
  const classification_distribution = {
    NO_DISCLOSURE: 0,
    UNCLEAR: 0,
    PARTIAL: 0,
    FULL_DISCLOSURE: 0
  };

  let total_disclosures_found = 0;
  const categories = new Set<string>();

  questions.forEach(question => {
    categories.add(question.category || 'Other');
    if (question.disclosures.length === 0) {
      classification_distribution.NO_DISCLOSURE += 1;
    }
    question.disclosures.forEach(snippet => {
      total_disclosures_found += 1;
      const key = snippet.classification as keyof typeof classification_distribution;
      if (classification_distribution[key] !== undefined) {
        classification_distribution[key] += 1;
      }
    });
  });

  return {
    total_questions_analyzed: questions.length,
    total_disclosures_found,
    classification_distribution,
    categories_covered: Array.from(categories)
  };
}

function createAnalysisResultFromMerged(raw: any, filename: string): AnalysisResult {
  const metadata = raw?.metadata ?? {};
  const companyName = metadata.company || raw.company_name || 'Unknown Company';
  const year = safeNumber(metadata.year ?? raw.fiscal_year);
  const analysisDate = metadata.analysis_date
    ? new Date(metadata.analysis_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const modelUsed = metadata.merger_model || metadata.model || 'merged-model';
  const schemaVersion = metadata.schema_version || 'merged';

  const questions = Array.isArray(raw.analysis_results)
    ? raw.analysis_results.map((question: any, index: number) => convertMergedQuestion(question, index))
    : [];

  const summaryStatistics = buildSummaryStatisticsFromQuestions(questions);

  const analysisResult: AnalysisResult = {
    company_name: companyName,
    fiscal_year: year,
    version: 'merged',
    model_used: modelUsed,
    analysis_date: analysisDate,
    schema_version: schemaVersion,
    analysis_results: questions,
    summary_statistics: summaryStatistics,
    completeness_summary: raw.completeness_summary,
    merger_summary: raw.merger_summary,
    metadata: {
      ...metadata,
      merged_filename: filename
    }
  };

  return normalizeAnalysisResult(analysisResult);
}

async function loadMergedCompanyData(resultsPath: string): Promise<CompanyYearData[]> {
  const mergedDir = join(resultsPath, 'merged');

  let files: string[];
  try {
    files = await readdir(mergedDir);
  } catch {
    console.log('No merged results directory found');
    return [];
  }

  const mergedData: CompanyYearData[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    try {
      const raw = await loadJsonFile(join(mergedDir, file));
      const metadata = raw?.metadata;
      if (!metadata || !metadata.company || metadata.year === undefined) {
        console.warn(`Merged file missing metadata: ${file}`);
        continue;
      }

      const company = metadata.company;
      const year = safeNumber(metadata.year);
      if (!Number.isFinite(year) || Number.isNaN(year)) {
        console.warn(`Merged file has invalid year: ${file}`);
        continue;
      }

      const analysisResult = createAnalysisResultFromMerged(raw, file);
      const sourceFiles = metadata.source_files || {};
      const sourceVersions = Object.keys(sourceFiles);

      mergedData.push({
        company,
        year,
        version: 'merged',
        model: metadata.merger_model || 'merged-model',
        sector: normalizeSectorCode(
          analysisResult.metadata?.company_sector as string | undefined
        ),
        verified: analysisResult,
        hasComparison: false,
        isMerged: true,
        mergedMetadata: {
          sourceVersions,
          sourceFiles,
          mergerSummary: raw.merger_summary,
          completenessSummary: raw.completeness_summary,
          schemaVersion: metadata.schema_version,
          mergerTimestamp: raw.merger_summary?.merger_timestamp || metadata.analysis_date,
          mergedFilename: file
        }
      });
    } catch (error) {
      console.error(`Failed to load merged file ${file}:`, error);
    }
  }

  return mergedData;
}

async function loadMergedReviewedData(resultsPath: string): Promise<CompanyYearData[]> {
  const reviewedDir = join(resultsPath, 'deduped_and_reviewed');

  let files: string[];
  try {
    files = await readdir(reviewedDir);
  } catch {
    console.log('No deduped_and_reviewed results directory found');
    return [];
  }

  const reviewedData: CompanyYearData[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    try {
      const raw = await loadJsonFile(join(reviewedDir, file));
      const metadata = raw?.metadata;
      if (!metadata || !metadata.company || metadata.year === undefined) {
        console.warn(`Reviewed file missing metadata: ${file}`);
        continue;
      }

      const company = metadata.company;
      const year = safeNumber(metadata.year);
      if (!Number.isFinite(year) || Number.isNaN(year)) {
        console.warn(`Reviewed file has invalid year: ${file}`);
        continue;
      }

      const analysisResult = createAnalysisResultFromMerged(raw, file);
      analysisResult.version = 'merged-reviewed';
      analysisResult.metadata = {
        ...analysisResult.metadata,
        reviewed_filename: file
      };

      const sourceMergedFilename = file.replace('_deduped_and_reviewed.json', '.json');

      reviewedData.push({
        company,
        year,
        version: 'merged-reviewed',
        model: metadata.merger_model || 'merged-model',
        sector: normalizeSectorCode(
          analysisResult.metadata?.company_sector as string | undefined
        ),
        verified: analysisResult,
        hasComparison: false,
        isMergedReviewed: true,
        reviewMetadata: {
          reviewedFilename: file,
          sourceMergedFilename,
          reviewAppliedAt: metadata.analysis_date
        }
      });
    } catch (error) {
      console.error(`Failed to load reviewed file ${file}:`, error);
    }
  }

  return reviewedData;
}

function getVersionSortWeight(version: string): number {
  const lower = (version || '').toLowerCase();
  if (lower.startsWith('merged')) {
    return 1000;
  }

  const numeric = parseInt(version.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(numeric) ? 0 : numeric;
}

export async function loadMergedReviewedCompanyData(): Promise<CompanyYearData[]> {
  const resultsPath = join(process.cwd(), 'results');
  return loadMergedReviewedData(resultsPath);
}

async function loadTeamReviewedCombined(resultsPath: string): Promise<CompanyYearData[]> {
  const combinedPath = join(resultsPath, 'team_reviewed_json', 'team_reviewed_combined_collapsed.json');
  try {
    const raw = await loadJsonFile(combinedPath);
    if (!Array.isArray(raw)) return [];

    return raw.map((entry: any) => {
      const verified = normalizeAnalysisResult(entry.verified);
      verified.company_name = entry.company;
      verified.fiscal_year = entry.year;
      verified.version = entry.version || 'team-reviewed';
      verified.model_used = entry.verified?.model_used || 'team-reviewed';

      const sector = normalizeSectorCode(
        verified.metadata?.company_sector as string | undefined
      );

      return {
        company: entry.company,
        year: entry.year,
        version: verified.version,
        model: verified.model_used,
        sector,
        verified,
        hasComparison: false,
        isTeamReviewed: true
      } as CompanyYearData;
    });
  } catch (error) {
    console.log('No team-reviewed combined data found');
    return [];
  }
}



