/**
 * Type definitions for calculated metrics and aggregations
 */

import type { Classification } from './analysis';

// Grade type
export type Grade = "A" | "B" | "C" | "D" | "F";

/**
 * Question-level metrics calculated from snippets
 */
export interface QuestionMetrics {
  question_id: string;
  question_text: string;
  category: string;

  // Snippet counts
  total_snippets: number;
  snippets_by_classification: Record<Classification, number>;

  // Quality scores (0-100)
  average_snippet_score: number;
  best_snippet_score: number;
  best_snippet_id: string;

  // Financial metrics
  snippets_with_financial_data: number;
  financial_quantification_rate: number; // percentage
  total_financial_amount: number; // USD

  // Temporal metrics
  snippets_current: number;
  snippets_future: number;
  snippets_historical: number;
  snippets_unclear_time: number;
  forward_looking_rate: number; // percentage

  // Narrative metrics
  snippets_balanced: number;
  snippets_risk: number;
  snippets_opportunity: number;
  snippets_neutral: number;
  narrative_balance_rate: number; // percentage

  // Evidence depth
  evidence_depth: number; // same as total_snippets

  // Overall quality
  disclosure_quality_grade: Grade;
}

/**
 * Category-level metrics aggregated from questions
 */
export interface CategoryMetrics {
  category_name: string;

  // Question counts
  total_questions: number;
  questions_answered: number;

  // Average scores
  average_question_score: number;
  average_evidence_depth: number;
  average_financial_rate: number;
  average_forward_looking_rate: number;
  average_narrative_balance_rate: number;

  // Total snippet counts
  total_snippets: number;
  snippets_by_classification: Record<Classification, number>;

  // Financial metrics
  total_financial_amount: number;
  snippets_with_financial_full: number;
  snippets_with_financial_partial: number;
  snippets_with_financial_none: number;

  // Best/worst questions
  top_questions: Array<{
    question_id: string;
    question_text: string;
    score: number;
  }>;
  bottom_questions: Array<{
    question_id: string;
    question_text: string;
    score: number;
  }>;

  // Overall grade
  category_grade: Grade;
}

/**
 * Radar chart dimensions for company comparison
 */
export interface RadarMetrics {
  disclosure_quality: number; // 0-100
  evidence_depth: number; // 0-100
  financial_transparency: number; // 0-100
  forward_looking_maturity: number; // 0-100
  narrative_balance: number; // 0-100
}

/**
 * Company-level metrics for a specific year
 */
export interface CompanyMetrics {
  company_name: string;
  fiscal_year: number;
  model_used: string;

  // Overall scores
  overall_disclosure_score: number; // 0-100
  overall_grade: Grade;

  // Category breakdown
  category_scores: Record<string, number>;

  // Totals
  total_questions_analyzed: number;
  total_questions_answered: number;
  total_snippets: number;
  average_snippets_per_question: number;

  // Classification distribution
  snippets_by_classification: Record<Classification, number>;
  classification_percentages: Record<Classification, number>;

  // Financial metrics
  financial_quantification_rate: number;
  snippets_with_financial_full: number;
  snippets_with_financial_partial: number;
  snippets_with_financial_none: number;
  total_financial_amount_usd: number;

  // Temporal metrics
  forward_looking_rate: number;
  snippets_current: number;
  snippets_future: number;
  snippets_historical: number;
  snippets_unclear_time: number;

  // Narrative metrics
  narrative_balance_rate: number;
  snippets_balanced: number;
  snippets_risk: number;
  snippets_opportunity: number;
  snippets_neutral: number;

  // Radar chart dimensions
  radar_metrics: RadarMetrics;

  // Top/bottom questions
  top_questions: Array<{
    question_id: string;
    question_text: string;
    category: string;
    score: number;
  }>;
  bottom_questions: Array<{
    question_id: string;
    question_text: string;
    category: string;
    score: number;
  }>;

  // Verification metadata (if available)
  verification_metadata?: {
    verified_at: string;
    verification_model: string;
    pass_rate: number;
    snippets_removed: number;
    snippets_corrected: number;
    questions_modified: string[];
  };
}

/**
 * Cross-company metrics for analytics
 */
export interface CrossCompanyMetrics {
  // Question performance across companies
  question_rankings: Array<{
    question_id: string;
    question_text: string;
    category: string;
    average_score_across_companies: number;
    companies_with_full_disclosure: number;
    companies_analyzed: number;
    total_snippets_across_companies: number;
    average_financial_rate: number;
    ranking: number;
  }>;

  // Company rankings
  company_rankings: Array<{
    company_name: string;
    overall_score: number;
    grade: Grade;
    ranking: number;
  }>;

  // Category performance
  category_rankings: Array<{
    category_name: string;
    average_score_across_companies: number;
    total_snippets: number;
    average_evidence_depth: number;
    ranking: number;
  }>;

  // Global statistics
  global_stats: {
    total_companies: number;
    total_questions: number;
    total_snippets: number;
    average_disclosure_score_all: number;
    average_financial_rate_all: number;
    average_forward_looking_rate_all: number;
    full_disclosure_count: number;
    partial_disclosure_count: number;
    unclear_count: number;
    no_disclosure_count: number;
    grade_distribution: Record<Grade, number>;
    best_company?: {
      company_name: string;
      score: number;
    };
  };
}

/**
 * Score components for a snippet
 */
export interface SnippetScoreComponents {
  financial_score: number; // 1-3
  temporal_score: number; // 0-3
  narrative_score: number; // 1-3
  total_score: number; // 0-100 percentage
}
