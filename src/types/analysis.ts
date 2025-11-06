/**
 * Type definitions for analysis results data structure
 * Based on v3.0 schema from verified JSON files
 */

// Classification types
export type Classification =
  | "FULL_DISCLOSURE"
  | "PARTIAL"
  | "UNCLEAR"
  | "NO_DISCLOSURE";

// Categorization dimension types
export type FinancialType = "Full" | "Partial" | "Non-Financial";
export type Timeframe = "Current" | "Future" | "Historical" | "Multiple or Unclear";
export type Framing = "Risk" | "Opportunity" | "Neutral" | "Both";

/**
 * Financial amount with currency and context
 */
export interface FinancialAmount {
  amount: number;
  currency: string;
  context: string;
}

/**
 * Categorization of a snippet across 3 dimensions
 */
export interface Categorization {
  framing: Framing;
  framing_justification: string;
  financial_type: FinancialType;
  financial_justification: string;
  timeframe: Timeframe;
  timeframe_justification: string;
}

/**
 * Individual disclosure snippet (evidence)
 */
export interface Snippet {
  snippet_id: string;
  quote: string;
  source: string;
  classification: Classification;
  classification_justification: string;
  categorization: Categorization;
  financial_amounts: FinancialAmount[];
  source_versions?: string[];
  merger_metadata?: Record<string, any>;
}

/**
 * Question with all its disclosure snippets
 */
export interface Question {
  question_id: string;
  question_number: number;
  category: string;
  sub_category: string;
  question_text: string;
  disclosures: Snippet[];
  summary: string;
  merger_stats?: Record<string, any>;
}

/**
 * Summary statistics included in analysis results
 */
export interface SummaryStatistics {
  total_questions_analyzed: number;
  total_disclosures_found: number;
  classification_distribution: {
    NO_DISCLOSURE: number;
    UNCLEAR: number;
    PARTIAL: number;
    FULL_DISCLOSURE: number;
  };
  categories_covered: string[];
}

/**
 * Verification metadata (only present in verified files)
 */
export interface VerificationMetadata {
  verified_at: string;
  verification_model: string;
  corrections_applied: {
    snippets_removed: number;
    snippets_corrected: number;
    questions_modified: string[];
  };
}

/**
 * Complete analysis result from a JSON file
 */
export interface AnalysisResult {
  company_name: string;
  fiscal_year: number;
  version: string; // v3, v4, etc. from filename
  model_used: string;
  analysis_date: string;
  schema_version: string;
  analysis_results: Question[];
  summary_statistics: SummaryStatistics;
  verification_metadata?: VerificationMetadata;
  completeness_summary?: Record<string, any>;
  merger_summary?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Parsed filename information
 */
export interface ParsedFilename {
  company: string;
  year: number;
  version: string;
  model: string;
  timestamp: string;
  isVerified: boolean;
  isReport: boolean;
}

/**
 * Loaded company-year data with optional original and report
 */
export interface CompanyYearData {
  company: string;
  year: number;
  version: string; // v3, v4, etc.
  model: string;
  verified: AnalysisResult;
  original?: AnalysisResult;
  verificationReport?: any; // Will be defined in verification.ts
  hasComparison: boolean;
  isMerged?: boolean;
  mergedMetadata?: {
    sourceVersions: string[];
    sourceFiles: Record<string, string>;
    mergerSummary?: Record<string, any>;
    completenessSummary?: Record<string, any>;
    schemaVersion?: string;
    mergerTimestamp?: string;
    mergedFilename?: string;
  };
}
