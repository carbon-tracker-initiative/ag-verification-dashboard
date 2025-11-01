/**
 * Type definitions for verification reports and comparison metrics
 */

/**
 * Issue found in verification report
 */
export interface ClassificationIssue {
  issue_type: string;
  current_value: string;
  suggested_value: string;
  explanation: string;
}

export interface CategorizationIssue {
  field: string;
  current_value: string;
  suggested_value: string;
  explanation: string;
}

/**
 * Quality rating from verification
 */
export type OverallQuality = "excellent" | "good" | "needs_improvement" | "poor";

/**
 * Recommendation action
 */
export type Recommendation = "keep_as_is" | "correct" | "remove";

/**
 * Verification report for a single snippet
 */
export interface VerificationReport {
  snippet_id: string;
  is_relevant: boolean;
  relevance_explanation: string;
  classification_issues: ClassificationIssue[];
  categorization_issues: CategorizationIssue[];
  overall_quality: OverallQuality;
  recommendation: Recommendation;
}

/**
 * Type of change made during verification
 */
export type ChangeType = "removed" | "classification_corrected" | "categorization_corrected" | "unchanged";

export interface CategorizationChangeDetail {
  field: "financial_type" | "timeframe" | "framing";
  original_value: string;
  verified_value: string;
}

/**
 * Detailed information about a snippet change
 */
export interface SnippetChange {
  snippet_id: string;
  question_id: string;
  change_type: ChangeType;
  original_classification?: string;
  verified_classification?: string;
  original_score?: number;
  verified_score?: number;
  categorization_changes?: CategorizationChangeDetail[];
  verification_report?: {
    relevance_explanation: string;
    issues: string[];
    quality: OverallQuality;
    recommendation: Recommendation;
  };
}

/**
 * Verification metrics comparing original vs verified
 */
export interface VerificationMetrics {
  company_name: string;
  fiscal_year: number;

  // Overall impact
  total_snippets_original: number;
  total_snippets_verified: number;
  snippets_removed: number;
  snippets_corrected: number;
  snippets_unchanged: number;
  pass_rate: number; // percentage

  // Classification transitions
  classification_transitions: Map<string, number>;

  // Categorization changes
  financial_type_changes: number;
  timeframe_changes: number;
  framing_changes: number;

  // Question-level impact
  questions_modified: string[];
  questions_with_removals: string[];
  questions_with_corrections: string[];

  // Score changes
  score_change_original_vs_verified: number;
  category_score_changes: Record<string, number>;

  // Verification insights
  most_corrected_category: string;
  most_corrected_questions: Array<{
    question_id: string;
    corrections_count: number;
  }>;

  // Detailed snippet changes
  snippet_changes: SnippetChange[];
}

/**
 * Verification comparison view data
 */
export interface VerificationComparison {
  hasOriginal: boolean;
  hasReport: boolean;
  metrics?: VerificationMetrics;
  snippetChanges: Map<string, SnippetChange>;
}
