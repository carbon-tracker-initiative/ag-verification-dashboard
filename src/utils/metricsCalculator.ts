/**
 * Metrics calculator for disclosure quality scoring
 * Implements multi-dimensional snippet scoring and aggregation
 */

import type {
  AnalysisResult,
  Question,
  Snippet,
  Classification
} from '../types/analysis';
import type {
  QuestionMetrics,
  CategoryMetrics,
  CompanyMetrics,
  CrossCompanyMetrics,
  RadarMetrics,
  Grade,
  SnippetScoreComponents
} from '../types/metrics';

// ============================================================================
// Snippet-Level Scoring Functions
// ============================================================================

/**
 * Calculate financial transparency score (0-3 points)
 * Full = 3, Partial = 2, Non-Financial = 1
 */
export function calculateFinancialScore(snippet: Snippet): number {
  switch (snippet.categorization.financial_type) {
    case "Full":
      return 3;
    case "Partial":
      return 2;
    case "Non-Financial":
      return 1;
    default:
      return 1;
  }
}

/**
 * Calculate temporal specificity score (0-3 points)
 * Current = 3, Future = 2, Historical = 1, Unclear = 0
 */
export function calculateTemporalScore(snippet: Snippet): number {
  const timeframe = snippet.categorization.timeframe;

  if (timeframe === "Current") return 3;
  if (timeframe === "Future") return 2;
  if (timeframe === "Historical") return 1;
  if (timeframe === "Multiple or Unclear") return 0;

  return 0;
}

/**
 * Calculate narrative framing score (1-3 points)
 * Both = 3, Risk/Opportunity = 2, Neutral = 1
 */
export function calculateNarrativeScore(snippet: Snippet): number {
  switch (snippet.categorization.framing) {
    case "Both":
      return 3;
    case "Risk":
    case "Opportunity":
      return 2;
    case "Neutral":
      return 1;
    default:
      return 1;
  }
}

/**
 * Calculate composite snippet score (0-100%)
 * Combines financial, temporal, and narrative dimensions
 */
export function calculateSnippetScore(snippet: Snippet): number {
  const financial = calculateFinancialScore(snippet);
  const temporal = calculateTemporalScore(snippet);
  const narrative = calculateNarrativeScore(snippet);

  const total = financial + temporal + narrative;
  const maxPossible = 9; // 3 + 3 + 3

  return (total / maxPossible) * 100;
}

/**
 * Get all score components for a snippet
 */
export function getSnippetScoreComponents(snippet: Snippet): SnippetScoreComponents {
  const financial_score = calculateFinancialScore(snippet);
  const temporal_score = calculateTemporalScore(snippet);
  const narrative_score = calculateNarrativeScore(snippet);
  const total_score = calculateSnippetScore(snippet);

  return {
    financial_score,
    temporal_score,
    narrative_score,
    total_score
  };
}

// ============================================================================
// Grading Functions
// ============================================================================

/**
 * Convert numeric score (0-100) to letter grade (A-F)
 */
export function calculateGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ============================================================================
// Question-Level Metrics
// ============================================================================

/**
 * Calculate comprehensive metrics for a single question
 */
export function calculateQuestionMetrics(question: Question): QuestionMetrics {
  const snippets = question.disclosures;

  // Count snippets by classification
  const snippets_by_classification: Record<Classification, number> = {
    FULL_DISCLOSURE: 0,
    PARTIAL: 0,
    UNCLEAR: 0,
    NO_DISCLOSURE: 0
  };

  snippets.forEach(s => {
    snippets_by_classification[s.classification]++;
  });

  // Calculate snippet scores
  const snippetScores = snippets.map(s => calculateSnippetScore(s));
  const average_snippet_score = snippetScores.length > 0
    ? snippetScores.reduce((sum, score) => sum + score, 0) / snippetScores.length
    : 0;

  const best_snippet_score = snippetScores.length > 0
    ? Math.max(...snippetScores)
    : 0;

  const bestSnippetIndex = snippetScores.indexOf(best_snippet_score);
  const best_snippet_id = snippets[bestSnippetIndex]?.snippet_id || "";

  // Financial metrics
  const snippets_with_financial_data = snippets.filter(s =>
    s.categorization.financial_type === "Full" || s.categorization.financial_type === "Partial"
  ).length;

  const financial_quantification_rate = snippets.length > 0
    ? (snippets_with_financial_data / snippets.length) * 100
    : 0;

  const total_financial_amount = snippets.reduce((sum, s) => {
    return sum + s.financial_amounts.reduce((amtSum, amt) => {
      // Simple sum - in production, would convert currencies to USD
      return amtSum + amt.amount;
    }, 0);
  }, 0);

  // Temporal metrics
  const snippets_current = snippets.filter(s => s.categorization.timeframe === "Current").length;
  const snippets_future = snippets.filter(s => s.categorization.timeframe === "Future").length;
  const snippets_historical = snippets.filter(s => s.categorization.timeframe === "Historical").length;
  const snippets_unclear_time = snippets.filter(s => s.categorization.timeframe === "Multiple or Unclear").length;

  const forward_looking_rate = snippets.length > 0
    ? (snippets_future / snippets.length) * 100
    : 0;

  // Narrative metrics
  const snippets_balanced = snippets.filter(s => s.categorization.framing === "Both").length;
  const snippets_risk = snippets.filter(s => s.categorization.framing === "Risk").length;
  const snippets_opportunity = snippets.filter(s => s.categorization.framing === "Opportunity").length;
  const snippets_neutral = snippets.filter(s => s.categorization.framing === "Neutral").length;

  const narrative_balance_rate = snippets.length > 0
    ? (snippets_balanced / snippets.length) * 100
    : 0;

  return {
    question_id: question.question_id,
    question_text: question.question_text,
    category: question.category,
    total_snippets: snippets.length,
    snippets_by_classification,
    average_snippet_score,
    best_snippet_score,
    best_snippet_id,
    snippets_with_financial_data,
    financial_quantification_rate,
    total_financial_amount,
    snippets_current,
    snippets_future,
    snippets_historical,
    snippets_unclear_time,
    forward_looking_rate,
    snippets_balanced,
    snippets_risk,
    snippets_opportunity,
    snippets_neutral,
    narrative_balance_rate,
    evidence_depth: snippets.length,
    disclosure_quality_grade: calculateGrade(average_snippet_score)
  };
}

// ============================================================================
// Category-Level Metrics
// ============================================================================

/**
 * Calculate metrics for a category across multiple questions
 */
export function calculateCategoryMetrics(
  questions: Question[],
  categoryName: string
): CategoryMetrics {
  // Filter questions for this category
  const categoryQuestions = questions.filter(q => q.category === categoryName);

  // Calculate metrics for each question
  const questionMetrics = categoryQuestions.map(q => calculateQuestionMetrics(q));

  // Questions answered (with at least 1 snippet)
  const questions_answered = categoryQuestions.filter(q => q.disclosures.length > 0).length;

  // Average scores
  const average_question_score = questionMetrics.length > 0
    ? questionMetrics.reduce((sum, qm) => sum + qm.average_snippet_score, 0) / questionMetrics.length
    : 0;

  const average_evidence_depth = categoryQuestions.length > 0
    ? categoryQuestions.reduce((sum, q) => sum + q.disclosures.length, 0) / categoryQuestions.length
    : 0;

  const average_financial_rate = questionMetrics.length > 0
    ? questionMetrics.reduce((sum, qm) => sum + qm.financial_quantification_rate, 0) / questionMetrics.length
    : 0;

  const average_forward_looking_rate = questionMetrics.length > 0
    ? questionMetrics.reduce((sum, qm) => sum + qm.forward_looking_rate, 0) / questionMetrics.length
    : 0;

  const average_narrative_balance_rate = questionMetrics.length > 0
    ? questionMetrics.reduce((sum, qm) => sum + qm.narrative_balance_rate, 0) / questionMetrics.length
    : 0;

  // Total snippet counts
  const total_snippets = categoryQuestions.reduce((sum, q) => sum + q.disclosures.length, 0);

  const snippets_by_classification: Record<Classification, number> = {
    FULL_DISCLOSURE: 0,
    PARTIAL: 0,
    UNCLEAR: 0,
    NO_DISCLOSURE: 0
  };

  categoryQuestions.forEach(q => {
    q.disclosures.forEach(s => {
      snippets_by_classification[s.classification]++;
    });
  });

  // Financial metrics
  const total_financial_amount = questionMetrics.reduce((sum, qm) => sum + qm.total_financial_amount, 0);

  const snippets_with_financial_full = categoryQuestions.reduce((sum, q) => {
    return sum + q.disclosures.filter(s => s.categorization.financial_type === "Full").length;
  }, 0);

  const snippets_with_financial_partial = categoryQuestions.reduce((sum, q) => {
    return sum + q.disclosures.filter(s => s.categorization.financial_type === "Partial").length;
  }, 0);

  const snippets_with_financial_none = categoryQuestions.reduce((sum, q) => {
    return sum + q.disclosures.filter(s => s.categorization.financial_type === "Non-Financial").length;
  }, 0);

  // Top and bottom questions
  const sortedQuestions = questionMetrics.sort((a, b) => b.average_snippet_score - a.average_snippet_score);

  const top_questions = sortedQuestions.slice(0, 3).map(qm => ({
    question_id: qm.question_id,
    question_text: qm.question_text,
    score: qm.average_snippet_score
  }));

  const bottom_questions = sortedQuestions.slice(-3).reverse().map(qm => ({
    question_id: qm.question_id,
    question_text: qm.question_text,
    score: qm.average_snippet_score
  }));

  return {
    category_name: categoryName,
    total_questions: categoryQuestions.length,
    questions_answered,
    average_question_score,
    average_evidence_depth,
    average_financial_rate,
    average_forward_looking_rate,
    average_narrative_balance_rate,
    total_snippets,
    snippets_by_classification,
    total_financial_amount,
    snippets_with_financial_full,
    snippets_with_financial_partial,
    snippets_with_financial_none,
    top_questions,
    bottom_questions,
    category_grade: calculateGrade(average_question_score)
  };
}

// ============================================================================
// Company-Level Metrics
// ============================================================================

/**
 * Calculate comprehensive metrics for a company-year
 */
export function calculateCompanyMetrics(analysisResult: AnalysisResult): CompanyMetrics {
  const questions = analysisResult.analysis_results;

  // Calculate all snippet scores
  const allSnippets = questions.flatMap(q => q.disclosures);
  const allSnippetScores = allSnippets.map(s => calculateSnippetScore(s));

  const overall_disclosure_score = allSnippetScores.length > 0
    ? allSnippetScores.reduce((sum, score) => sum + score, 0) / allSnippetScores.length
    : 0;

  // Get unique categories
  const categories = Array.from(new Set(questions.map(q => q.category)));

  // Calculate category scores
  const category_scores: Record<string, number> = {};
  categories.forEach(cat => {
    const categoryMetrics = calculateCategoryMetrics(questions, cat);
    category_scores[cat] = categoryMetrics.average_question_score;
  });

  // Totals
  const total_questions_analyzed = questions.length;
  const total_questions_answered = questions.filter(q => q.disclosures.length > 0).length;
  const total_snippets = allSnippets.length;
  const average_snippets_per_question = total_questions_analyzed > 0
    ? total_snippets / total_questions_analyzed
    : 0;

  // Classification distribution
  const snippets_by_classification: Record<Classification, number> = {
    FULL_DISCLOSURE: 0,
    PARTIAL: 0,
    UNCLEAR: 0,
    NO_DISCLOSURE: 0
  };

  allSnippets.forEach(s => {
    snippets_by_classification[s.classification]++;
  });

  const classification_percentages: Record<Classification, number> = {
    FULL_DISCLOSURE: total_snippets > 0 ? (snippets_by_classification.FULL_DISCLOSURE / total_snippets) * 100 : 0,
    PARTIAL: total_snippets > 0 ? (snippets_by_classification.PARTIAL / total_snippets) * 100 : 0,
    UNCLEAR: total_snippets > 0 ? (snippets_by_classification.UNCLEAR / total_snippets) * 100 : 0,
    NO_DISCLOSURE: total_snippets > 0 ? (snippets_by_classification.NO_DISCLOSURE / total_snippets) * 100 : 0
  };

  // Financial metrics
  const snippets_with_financial_full = allSnippets.filter(s => s.categorization.financial_type === "Full").length;
  const snippets_with_financial_partial = allSnippets.filter(s => s.categorization.financial_type === "Partial").length;
  const snippets_with_financial_none = allSnippets.filter(s => s.categorization.financial_type === "Non-Financial").length;

  const financial_quantification_rate = total_snippets > 0
    ? ((snippets_with_financial_full + snippets_with_financial_partial) / total_snippets) * 100
    : 0;

  const total_financial_amount_usd = allSnippets.reduce((sum, s) => {
    return sum + s.financial_amounts.reduce((amtSum, amt) => amtSum + amt.amount, 0);
  }, 0);

  // Temporal metrics
  const snippets_current = allSnippets.filter(s => s.categorization.timeframe === "Current").length;
  const snippets_future = allSnippets.filter(s => s.categorization.timeframe === "Future").length;
  const snippets_historical = allSnippets.filter(s => s.categorization.timeframe === "Historical").length;
  const snippets_unclear_time = allSnippets.filter(s => s.categorization.timeframe === "Multiple or Unclear").length;

  const forward_looking_rate = total_snippets > 0
    ? (snippets_future / total_snippets) * 100
    : 0;

  // Narrative metrics
  const snippets_balanced = allSnippets.filter(s => s.categorization.framing === "Both").length;
  const snippets_risk = allSnippets.filter(s => s.categorization.framing === "Risk").length;
  const snippets_opportunity = allSnippets.filter(s => s.categorization.framing === "Opportunity").length;
  const snippets_neutral = allSnippets.filter(s => s.categorization.framing === "Neutral").length;

  const narrative_balance_rate = total_snippets > 0
    ? (snippets_balanced / total_snippets) * 100
    : 0;

  // Radar metrics (normalized to 0-100)
  const radar_metrics: RadarMetrics = {
    disclosure_quality: overall_disclosure_score,
    evidence_depth: Math.min(average_snippets_per_question, 10) * 10, // Normalize to 100
    financial_transparency: financial_quantification_rate,
    forward_looking_maturity: forward_looking_rate,
    narrative_balance: narrative_balance_rate
  };

  // Top and bottom questions
  const questionMetrics = questions.map(q => calculateQuestionMetrics(q));
  const sortedQuestions = questionMetrics.sort((a, b) => b.average_snippet_score - a.average_snippet_score);

  const top_questions = sortedQuestions.slice(0, 5).map(qm => ({
    question_id: qm.question_id,
    question_text: qm.question_text,
    category: qm.category,
    score: qm.average_snippet_score
  }));

  const bottom_questions = sortedQuestions.slice(-5).reverse().map(qm => ({
    question_id: qm.question_id,
    question_text: qm.question_text,
    category: qm.category,
    score: qm.average_snippet_score
  }));

  // Verification metadata (if present)
  let verification_metadata = undefined;
  if (analysisResult.verification_metadata) {
    const vm = analysisResult.verification_metadata;
    const total_original = total_snippets + vm.corrections_applied.snippets_removed;
    const pass_rate = total_original > 0
      ? ((total_original - vm.corrections_applied.snippets_corrected - vm.corrections_applied.snippets_removed) / total_original) * 100
      : 100;

    verification_metadata = {
      verified_at: vm.verified_at,
      verification_model: vm.verification_model,
      pass_rate,
      snippets_removed: vm.corrections_applied.snippets_removed,
      snippets_corrected: vm.corrections_applied.snippets_corrected,
      questions_modified: vm.corrections_applied.questions_modified
    };
  }

  return {
    company_name: analysisResult.company_name,
    fiscal_year: analysisResult.fiscal_year,
    model_used: analysisResult.model_used,
    overall_disclosure_score,
    overall_grade: calculateGrade(overall_disclosure_score),
    category_scores,
    total_questions_analyzed,
    total_questions_answered,
    total_snippets,
    average_snippets_per_question,
    snippets_by_classification,
    classification_percentages,
    financial_quantification_rate,
    snippets_with_financial_full,
    snippets_with_financial_partial,
    snippets_with_financial_none,
    total_financial_amount_usd,
    forward_looking_rate,
    snippets_current,
    snippets_future,
    snippets_historical,
    snippets_unclear_time,
    narrative_balance_rate,
    snippets_balanced,
    snippets_risk,
    snippets_opportunity,
    snippets_neutral,
    radar_metrics,
    top_questions,
    bottom_questions,
    verification_metadata
  };
}

// ============================================================================
// Cross-Company Metrics
// ============================================================================

/**
 * Calculate cross-company analytics for all companies
 */
export function calculateCrossCompanyMetrics(
  companyMetrics: CompanyMetrics[]
): CrossCompanyMetrics {
  // Question rankings across all companies
  const questionMap = new Map<string, {
    question_id: string;
    question_text: string;
    category: string;
    scores: number[];
    full_disclosure_count: number;
    total_snippets: number;
    financial_rates: number[];
  }>();

  // Collect question data from all companies
  companyMetrics.forEach(cm => {
    cm.top_questions.concat(cm.bottom_questions).forEach(q => {
      if (!questionMap.has(q.question_id)) {
        questionMap.set(q.question_id, {
          question_id: q.question_id,
          question_text: q.question_text,
          category: q.category,
          scores: [],
          full_disclosure_count: 0,
          total_snippets: 0,
          financial_rates: []
        });
      }

      const qData = questionMap.get(q.question_id)!;
      qData.scores.push(q.score);
    });
  });

  // Build question rankings
  const question_rankings = Array.from(questionMap.values()).map((qData, index) => {
    const average_score_across_companies = qData.scores.length > 0
      ? qData.scores.reduce((sum, s) => sum + s, 0) / qData.scores.length
      : 0;

    return {
      question_id: qData.question_id,
      question_text: qData.question_text,
      category: qData.category,
      average_score_across_companies,
      companies_with_full_disclosure: qData.full_disclosure_count,
      companies_analyzed: qData.scores.length,
      total_snippets_across_companies: qData.total_snippets,
      average_financial_rate: qData.financial_rates.length > 0
        ? qData.financial_rates.reduce((sum, r) => sum + r, 0) / qData.financial_rates.length
        : 0,
      ranking: 0 // Will be set after sorting
    };
  }).sort((a, b) => b.average_score_across_companies - a.average_score_across_companies);

  // Set rankings
  question_rankings.forEach((q, index) => {
    q.ranking = index + 1;
  });

  // Company rankings
  const company_rankings = companyMetrics
    .map(cm => ({
      company_name: cm.company_name,
      overall_score: cm.overall_disclosure_score,
      grade: cm.overall_grade,
      ranking: 0
    }))
    .sort((a, b) => b.overall_score - a.overall_score);

  company_rankings.forEach((c, index) => {
    c.ranking = index + 1;
  });

  // Category rankings
  const categoryMap = new Map<string, { scores: number[]; snippets: number[]; evidence_depths: number[] }>();

  companyMetrics.forEach(cm => {
    Object.entries(cm.category_scores).forEach(([cat, score]) => {
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { scores: [], snippets: [], evidence_depths: [] });
      }
      categoryMap.get(cat)!.scores.push(score);
    });
  });

  const category_rankings = Array.from(categoryMap.entries()).map(([cat, data]) => {
    const average_score = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
    const total_snippets = data.snippets.reduce((sum, s) => sum + s, 0);
    const average_evidence_depth = data.evidence_depths.length > 0
      ? data.evidence_depths.reduce((sum, d) => sum + d, 0) / data.evidence_depths.length
      : 0;

    return {
      category_name: cat,
      average_score_across_companies: average_score,
      total_snippets,
      average_evidence_depth,
      ranking: 0
    };
  }).sort((a, b) => b.average_score_across_companies - a.average_score_across_companies);

  category_rankings.forEach((c, index) => {
    c.ranking = index + 1;
  });

  // Global statistics
  const total_companies = companyMetrics.length;
  const total_questions = companyMetrics.reduce((sum, cm) => sum + cm.total_questions_analyzed, 0);
  const total_snippets = companyMetrics.reduce((sum, cm) => sum + cm.total_snippets, 0);
  const average_disclosure_score_all = companyMetrics.length > 0
    ? companyMetrics.reduce((sum, cm) => sum + cm.overall_disclosure_score, 0) / companyMetrics.length
    : 0;
  const average_financial_rate_all = companyMetrics.length > 0
    ? companyMetrics.reduce((sum, cm) => sum + cm.financial_quantification_rate, 0) / companyMetrics.length
    : 0;
  const average_forward_looking_rate_all = companyMetrics.length > 0
    ? companyMetrics.reduce((sum, cm) => sum + cm.forward_looking_rate, 0) / companyMetrics.length
    : 0;

  // Aggregate classification counts
  const full_disclosure_count = companyMetrics.reduce((sum, cm) =>
    sum + (cm.snippets_by_classification['FULL_DISCLOSURE'] || 0), 0);
  const partial_disclosure_count = companyMetrics.reduce((sum, cm) =>
    sum + (cm.snippets_by_classification['PARTIAL'] || 0), 0);
  const unclear_count = companyMetrics.reduce((sum, cm) =>
    sum + (cm.snippets_by_classification['UNCLEAR'] || 0), 0);
  const no_disclosure_count = companyMetrics.reduce((sum, cm) =>
    sum + (cm.snippets_by_classification['NO_DISCLOSURE'] || 0), 0);

  // Grade distribution
  const grade_distribution: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  companyMetrics.forEach(cm => {
    grade_distribution[cm.overall_grade] = (grade_distribution[cm.overall_grade] || 0) + 1;
  });

  // Best company
  const best_company = company_rankings.length > 0
    ? {
        company_name: company_rankings[0].company_name,
        score: company_rankings[0].overall_score
      }
    : undefined;

  return {
    question_rankings,
    company_rankings,
    category_rankings,
    global_stats: {
      total_companies,
      total_questions,
      total_snippets,
      average_disclosure_score_all,
      average_financial_rate_all,
      average_forward_looking_rate_all,
      full_disclosure_count,
      partial_disclosure_count,
      unclear_count,
      no_disclosure_count,
      grade_distribution,
      best_company
    }
  };
}
