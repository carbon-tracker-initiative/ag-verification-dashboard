/**
 * Metrics calculator for disclosure analysis
 * Calculates distribution metrics, rates, and evidence depth
 */

import type {
  AnalysisResult,
  Question,
  Snippet,
  Classification,
  CompanyYearData
} from '../types/analysis';
import type {
  QuestionMetrics,
  CategoryMetrics,
  CompanyMetrics,
  CrossCompanyMetrics,
  RadarMetrics,
  QuestionCoverage
} from '../types/metrics';
import { CANONICAL_QUESTIONS, isQuestionApplicableToSector } from '../data/canonicalQuestions';
import { normalizeSectorCode } from '../types/questions';

// ============================================================================
// Normalization Functions (Categorical Only)
// ============================================================================

export function normalizeFinancialDisclosureType(value: string | undefined): "Financial" | "Partial-type" | "Non-Financial" {
  const normalized = (value || '').trim().toLowerCase();

  if (["full", "financial", "financial-type", "financial disclosure"].includes(normalized)) {
    return "Financial";
  }
  if (["partial", "partial-type", "partial type", "partial-financial"].includes(normalized)) {
    return "Partial-type";
  }

  return "Non-Financial";
}

export function normalizeTimeframeCategory(value: string | undefined): "Present day" | "Forward-looking" | "Backward-looking" | "Multiple or Unclear" {
  const normalized = (value || '').trim().toLowerCase();

  if (["current", "present day", "present-day", "present", "ongoing", "today"].includes(normalized)) {
    return "Present day";
  }

  if (["future", "forward-looking", "forward looking", "upcoming", "planned"].includes(normalized)) {
    return "Forward-looking";
  }

  if (["historical", "past", "backward-looking", "backward looking", "retrospective"].includes(normalized)) {
    return "Backward-looking";
  }

  return "Multiple or Unclear";
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

  // If no snippets exist (empty disclosures array), this is a NO_DISCLOSURE question
  if (snippets.length === 0) {
    snippets_by_classification.NO_DISCLOSURE = 1;
  }

  // Financial metrics
  const financialTypes = snippets.map(s => normalizeFinancialDisclosureType(s.categorization.financial_type));
  const snippets_with_financial_data = financialTypes.filter(type => type !== "Non-Financial").length;

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
  let snippets_current = 0;
  let snippets_future = 0;
  let snippets_historical = 0;
  let snippets_unclear_time = 0;

  snippets.forEach(s => {
    const timeframeCategory = normalizeTimeframeCategory(s.categorization.timeframe);
    if (timeframeCategory === "Present day") snippets_current++;
    else if (timeframeCategory === "Forward-looking") snippets_future++;
    else if (timeframeCategory === "Backward-looking") snippets_historical++;
    else snippets_unclear_time++;
  });

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
    evidence_depth: snippets.length
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

  // Average rates
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

  // Aggregate from question metrics to include NO_DISCLOSURE questions
  questionMetrics.forEach(qm => {
    snippets_by_classification.FULL_DISCLOSURE += qm.snippets_by_classification.FULL_DISCLOSURE;
    snippets_by_classification.PARTIAL += qm.snippets_by_classification.PARTIAL;
    snippets_by_classification.UNCLEAR += qm.snippets_by_classification.UNCLEAR;
    snippets_by_classification.NO_DISCLOSURE += qm.snippets_by_classification.NO_DISCLOSURE;
  });

  // Financial metrics
  const total_financial_amount = questionMetrics.reduce((sum, qm) => sum + qm.total_financial_amount, 0);

  let snippets_with_financial_full = 0;
  let snippets_with_financial_partial = 0;
  let snippets_with_financial_none = 0;

  categoryQuestions.forEach(q => {
    q.disclosures.forEach(s => {
      const type = normalizeFinancialDisclosureType(s.categorization.financial_type);
      if (type === "Financial") snippets_with_financial_full++;
      else if (type === "Partial-type") snippets_with_financial_partial++;
      else snippets_with_financial_none++;
    });
  });

  // Top and bottom questions by evidence depth (not score)
  const sortedQuestions = questionMetrics.sort((a, b) => b.evidence_depth - a.evidence_depth);

  const top_questions = sortedQuestions.slice(0, 3).map(qm => ({
    question_id: qm.question_id,
    question_text: qm.question_text,
    evidence_depth: qm.evidence_depth
  }));

  const bottom_questions = sortedQuestions.slice(-3).reverse().map(qm => ({
    question_id: qm.question_id,
    question_text: qm.question_text,
    evidence_depth: qm.evidence_depth
  }));

  return {
    category_name: categoryName,
    total_questions: categoryQuestions.length,
    questions_answered,
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
    bottom_questions
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
  const sector = normalizeSectorCode(
    analysisResult.metadata?.company_sector as string | undefined
  );
  const questionLookup = new Map<string, Question>(
    questions.map(question => [question.question_id, question])
  );

  // Calculate question metrics first to properly capture NO_DISCLOSURE questions
  const questionMetrics = questions.map(q => calculateQuestionMetrics(q));

  // Get all snippets (excluding NO_DISCLOSURE classified snippets)
  const allSnippets = questions.flatMap(q =>
    q.disclosures.filter(d => d.classification !== 'NO_DISCLOSURE')
  );

  // Get unique categories
  const categories = Array.from(new Set(questions.map(q => q.category)));

  // Totals
  const total_questions_analyzed = questions.length;
  const total_questions_answered = questions.filter(q => q.disclosures.length > 0).length;
  const total_snippets = allSnippets.length;
  const average_snippets_per_question = total_questions_analyzed > 0
    ? total_snippets / total_questions_analyzed
    : 0;

  // Classification distribution - aggregate from question metrics to include NO_DISCLOSURE
  const snippets_by_classification: Record<Classification, number> = {
    FULL_DISCLOSURE: 0,
    PARTIAL: 0,
    UNCLEAR: 0,
    NO_DISCLOSURE: 0
  };

  questionMetrics.forEach(qm => {
    snippets_by_classification.FULL_DISCLOSURE += qm.snippets_by_classification.FULL_DISCLOSURE;
    snippets_by_classification.PARTIAL += qm.snippets_by_classification.PARTIAL;
    snippets_by_classification.UNCLEAR += qm.snippets_by_classification.UNCLEAR;
    snippets_by_classification.NO_DISCLOSURE += qm.snippets_by_classification.NO_DISCLOSURE;
  });

  const classification_percentages: Record<Classification, number> = {
    FULL_DISCLOSURE: total_snippets > 0 ? (snippets_by_classification.FULL_DISCLOSURE / total_snippets) * 100 : 0,
    PARTIAL: total_snippets > 0 ? (snippets_by_classification.PARTIAL / total_snippets) * 100 : 0,
    UNCLEAR: total_snippets > 0 ? (snippets_by_classification.UNCLEAR / total_snippets) * 100 : 0,
    NO_DISCLOSURE: total_snippets > 0 ? (snippets_by_classification.NO_DISCLOSURE / total_snippets) * 100 : 0
  };

  // Financial metrics
  let snippets_with_financial_full = 0;
  let snippets_with_financial_partial = 0;
  let snippets_with_financial_none = 0;

  allSnippets.forEach(s => {
    const type = normalizeFinancialDisclosureType(s.categorization.financial_type);
    if (type === "Financial") snippets_with_financial_full++;
    else if (type === "Partial-type") snippets_with_financial_partial++;
    else snippets_with_financial_none++;
  });

  const financial_quantification_rate = total_snippets > 0
    ? ((snippets_with_financial_full + snippets_with_financial_partial) / total_snippets) * 100
    : 0;

  const total_financial_amount_usd = allSnippets.reduce((sum, s) => {
    return sum + s.financial_amounts.reduce((amtSum, amt) => amtSum + amt.amount, 0);
  }, 0);

  // Temporal metrics
  let snippets_current = 0;
  let snippets_future = 0;
  let snippets_historical = 0;
  let snippets_unclear_time = 0;

  allSnippets.forEach(s => {
    const timeframeCategory = normalizeTimeframeCategory(s.categorization.timeframe);
    if (timeframeCategory === "Present day") snippets_current++;
    else if (timeframeCategory === "Forward-looking") snippets_future++;
    else if (timeframeCategory === "Backward-looking") snippets_historical++;
    else snippets_unclear_time++;
  });

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

  // Canonical question coverage
  const questionCoverage: QuestionCoverage[] = CANONICAL_QUESTIONS.map((canonical) => {
    const applicable = isQuestionApplicableToSector(canonical, sector);

    if (!applicable) {
      return {
        question_id: canonical.id,
        question_text: canonical.question_text,
        category: canonical.category,
        applicability: canonical.applicability,
        status: 'NOT_APPLICABLE',
        snippet_count: 0
      };
    }

    const matchingQuestion = questionLookup.get(canonical.id);
    if (!matchingQuestion) {
      return {
        question_id: canonical.id,
        question_text: canonical.question_text,
        category: canonical.category,
        applicability: canonical.applicability,
        status: 'NO_DISCLOSURE',
        snippet_count: 0
      };
    }

    const snippetCount = matchingQuestion.disclosures.length;
    return {
      question_id: canonical.id,
      question_text: canonical.question_text,
      category: canonical.category,
      applicability: canonical.applicability,
      status: snippetCount > 0 ? 'DISCLOSED' : 'NO_DISCLOSURE',
      snippet_count: snippetCount
    };
  });

  const canonical_questions_total = CANONICAL_QUESTIONS.length;
  const canonical_questions_not_applicable = questionCoverage.filter(
    coverage => coverage.status === 'NOT_APPLICABLE'
  ).length;
  const canonical_questions_with_disclosure = questionCoverage.filter(
    coverage => coverage.status === 'DISCLOSED'
  ).length;
  const canonical_questions_without_disclosure = questionCoverage.filter(
    coverage => coverage.status === 'NO_DISCLOSURE'
  ).length;
  const canonical_questions_applicable =
    canonical_questions_total - canonical_questions_not_applicable;

  // Radar metrics (4 dimensions - removed disclosure_quality)
  const radar_metrics: RadarMetrics = {
    evidence_depth: Math.min(average_snippets_per_question, 10) * 10, // Normalize to 100
    financial_transparency: financial_quantification_rate,
    forward_looking_maturity: forward_looking_rate,
    narrative_balance: narrative_balance_rate
  };

  // Top and bottom questions by evidence depth (not score)
  const sortedQuestions = [...questionMetrics].sort((a, b) => b.evidence_depth - a.evidence_depth);

  const top_questions = sortedQuestions.slice(0, 5).map(qm => ({
    question_id: qm.question_id,
    question_text: qm.question_text,
    category: qm.category,
    evidence_depth: qm.evidence_depth
  }));

  const bottom_questions = sortedQuestions.slice(-5).reverse().map(qm => ({
    question_id: qm.question_id,
    question_text: qm.question_text,
    category: qm.category,
    evidence_depth: qm.evidence_depth
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
    total_questions_analyzed,
    total_questions_answered,
    canonical_questions_total,
    canonical_questions_applicable,
    canonical_questions_not_applicable,
    canonical_questions_with_disclosure,
    canonical_questions_without_disclosure,
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
    verification_metadata,
    question_coverage: questionCoverage
  };
}

// ============================================================================
// Cross-Company Metrics
// ============================================================================

/**
 * Calculate cross-company analytics for all companies
 */
export function calculateCrossCompanyMetrics(
  companyMetrics: CompanyMetrics[],
  companyDataArray: CompanyYearData[]
): CrossCompanyMetrics {
  // Question rankings across all companies (by evidence depth, not score)
  const questionMap = new Map<string, {
    question_id: string;
    question_text: string;
    category: string;
    full_disclosure_count: number;
    total_snippets: number;
    financial_rates: number[];
    evidence_depths: number[];
  }>();

  // Collect question data from ALL questions in ALL companies
  companyDataArray.forEach((companyData) => {
    companyData.verified.analysis_results.forEach(question => {
      const qm = calculateQuestionMetrics(question);

      if (!questionMap.has(question.question_id)) {
        questionMap.set(question.question_id, {
          question_id: question.question_id,
          question_text: question.question_text,
          category: question.category,
          full_disclosure_count: 0,
          total_snippets: 0,
          financial_rates: [],
          evidence_depths: []
        });
      }

      const qData = questionMap.get(question.question_id)!;
      qData.evidence_depths.push(qm.evidence_depth);
      qData.total_snippets += qm.total_snippets;
      qData.financial_rates.push(qm.financial_quantification_rate);

      // Count companies with full disclosure (at least one FULL_DISCLOSURE snippet)
      if (qm.snippets_by_classification.FULL_DISCLOSURE > 0) {
        qData.full_disclosure_count++;
      }
    });
  });

  // Build question rankings (by average evidence depth)
  const question_rankings = Array.from(questionMap.values()).map((qData, index) => {
    const average_evidence_depth = qData.evidence_depths.length > 0
      ? qData.evidence_depths.reduce((sum, d) => sum + d, 0) / qData.evidence_depths.length
      : 0;

    return {
      question_id: qData.question_id,
      question_text: qData.question_text,
      category: qData.category,
      average_evidence_depth,
      companies_with_full_disclosure: qData.full_disclosure_count,
      companies_analyzed: qData.evidence_depths.length,
      total_snippets_across_companies: qData.total_snippets,
      average_financial_rate: qData.financial_rates.length > 0
        ? qData.financial_rates.reduce((sum, r) => sum + r, 0) / qData.financial_rates.length
        : 0,
      ranking: 0 // Will be set after sorting
    };
  }).sort((a, b) => b.average_evidence_depth - a.average_evidence_depth);

  // Set rankings
  question_rankings.forEach((q, index) => {
    q.ranking = index + 1;
  });

  // Company rankings (by total snippets, not score)
  const company_rankings = companyMetrics
    .map(cm => ({
      company_name: cm.company_name,
      total_snippets: cm.total_snippets,
      ranking: 0
    }))
    .sort((a, b) => b.total_snippets - a.total_snippets);

  company_rankings.forEach((c, index) => {
    c.ranking = index + 1;
  });

  // Category rankings (by average evidence depth)
  const categoryMap = new Map<string, { snippets: number[]; evidence_depths: number[] }>();

  // Collect category data
  companyDataArray.forEach((companyData) => {
    const categories = Array.from(new Set(companyData.verified.analysis_results.map(q => q.category)));

    categories.forEach(cat => {
      const catQuestions = companyData.verified.analysis_results.filter(q => q.category === cat);
      const catMetrics = calculateCategoryMetrics(catQuestions, cat);

      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { snippets: [], evidence_depths: [] });
      }

      categoryMap.get(cat)!.evidence_depths.push(catMetrics.average_evidence_depth);
      categoryMap.get(cat)!.snippets.push(catMetrics.total_snippets);
    });
  });

  const category_rankings = Array.from(categoryMap.entries()).map(([cat, data]) => {
    const total_snippets = data.snippets.reduce((sum, s) => sum + s, 0);
    const average_evidence_depth = data.evidence_depths.length > 0
      ? data.evidence_depths.reduce((sum, d) => sum + d, 0) / data.evidence_depths.length
      : 0;

    return {
      category_name: cat,
      average_evidence_depth,
      total_snippets,
      ranking: 0
    };
  }).sort((a, b) => b.average_evidence_depth - a.average_evidence_depth);

  category_rankings.forEach((c, index) => {
    c.ranking = index + 1;
  });

  // Global statistics
  const total_companies = companyMetrics.length;
  const total_questions = companyMetrics.reduce((sum, cm) => sum + cm.total_questions_analyzed, 0);
  const total_snippets = companyMetrics.reduce((sum, cm) => sum + cm.total_snippets, 0);
  const average_financial_rate_all = companyMetrics.length > 0
    ? companyMetrics.reduce((sum, cm) => sum + cm.financial_quantification_rate, 0) / companyMetrics.length
    : 0;
  const average_forward_looking_rate_all = companyMetrics.length > 0
    ? companyMetrics.reduce((sum, cm) => sum + cm.forward_looking_rate, 0) / companyMetrics.length
    : 0;
  const average_temporal_present_day_rate_all = companyMetrics.length > 0
    ? companyMetrics.reduce((sum, cm) => {
        const companyRate = cm.total_snippets > 0
          ? (cm.snippets_current / cm.total_snippets) * 100
          : 0;
        return sum + companyRate;
      }, 0) / companyMetrics.length
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

  // Best company (by total snippets)
  const best_company = company_rankings.length > 0
    ? {
        company_name: company_rankings[0].company_name,
        total_snippets: company_rankings[0].total_snippets
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
      average_financial_rate_all,
      average_forward_looking_rate_all,
      average_temporal_present_day_rate_all,
      full_disclosure_count,
      partial_disclosure_count,
      unclear_count,
      no_disclosure_count,
      best_company
    }
  };
}
