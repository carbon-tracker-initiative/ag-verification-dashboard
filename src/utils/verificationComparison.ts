/**
 * Compare original vs verified analysis results
 * Calculate verification metrics and identify changes
 */

import type { AnalysisResult, Snippet } from '../types/analysis';
import type {
  VerificationMetrics,
  SnippetChange,
  ChangeType
} from '../types/verification';
import { calculateSnippetScore } from './metricsCalculator';

/**
 * Compare original and verified results to calculate verification metrics
 */
export function compareOriginalVsVerified(
  original: AnalysisResult,
  verified: AnalysisResult,
  verificationReport?: any
): VerificationMetrics {
  // Build snippet maps for easy lookup
  const originalSnippets = new Map<string, Snippet>();
  original.analysis_results.forEach(q => {
    q.disclosures.forEach(s => {
      originalSnippets.set(s.snippet_id, s);
    });
  });

  const verifiedSnippets = new Map<string, Snippet>();
  verified.analysis_results.forEach(q => {
    q.disclosures.forEach(s => {
      verifiedSnippets.set(s.snippet_id, s);
    });
  });

  // Find removed, corrected, and unchanged snippets
  const snippets_removed: string[] = [];
  const snippets_corrected: string[] = [];
  const snippets_unchanged: string[] = [];

  // Check each original snippet
  for (const [snippetId, originalSnippet] of originalSnippets) {
    const verifiedSnippet = verifiedSnippets.get(snippetId);

    if (!verifiedSnippet) {
      // Snippet was removed
      snippets_removed.push(snippetId);
    } else {
      // Check if classification or categorization changed
      const classificationChanged = originalSnippet.classification !== verifiedSnippet.classification;
      const financialChanged = originalSnippet.categorization.financial_type !== verifiedSnippet.categorization.financial_type;
      const timeframeChanged = originalSnippet.categorization.timeframe !== verifiedSnippet.categorization.timeframe;
      const framingChanged = originalSnippet.categorization.framing !== verifiedSnippet.categorization.framing;

      if (classificationChanged || financialChanged || timeframeChanged || framingChanged) {
        snippets_corrected.push(snippetId);
      } else {
        snippets_unchanged.push(snippetId);
      }
    }
  }

  const total_snippets_original = originalSnippets.size;
  const total_snippets_verified = verifiedSnippets.size;
  const pass_rate = total_snippets_original > 0
    ? (snippets_unchanged.length / total_snippets_original) * 100
    : 100;

  // Build classification transition matrix
  const classification_transitions = new Map<string, number>();

  for (const [snippetId, originalSnippet] of originalSnippets) {
    const verifiedSnippet = verifiedSnippets.get(snippetId);
    if (verifiedSnippet && originalSnippet.classification !== verifiedSnippet.classification) {
      const transition = `${originalSnippet.classification}→${verifiedSnippet.classification}`;
      classification_transitions.set(transition, (classification_transitions.get(transition) || 0) + 1);
    }
  }

  // Count categorization changes
  let financial_type_changes = 0;
  let timeframe_changes = 0;
  let framing_changes = 0;

  for (const [snippetId, originalSnippet] of originalSnippets) {
    const verifiedSnippet = verifiedSnippets.get(snippetId);
    if (verifiedSnippet) {
      if (originalSnippet.categorization.financial_type !== verifiedSnippet.categorization.financial_type) {
        financial_type_changes++;
      }
      if (originalSnippet.categorization.timeframe !== verifiedSnippet.categorization.timeframe) {
        timeframe_changes++;
      }
      if (originalSnippet.categorization.framing !== verifiedSnippet.categorization.framing) {
        framing_changes++;
      }
    }
  }

  // Find modified questions
  const questions_modified = new Set<string>();
  const questions_with_removals = new Set<string>();
  const questions_with_corrections = new Set<string>();

  original.analysis_results.forEach(q => {
    const hasRemovals = q.disclosures.some(s => snippets_removed.includes(s.snippet_id));
    const hasCorrections = q.disclosures.some(s => snippets_corrected.includes(s.snippet_id));

    if (hasRemovals || hasCorrections) {
      questions_modified.add(q.question_id);
      if (hasRemovals) questions_with_removals.add(q.question_id);
      if (hasCorrections) questions_with_corrections.add(q.question_id);
    }
  });

  // Calculate score changes (simplified - would need full metrics calculation)
  const score_change_original_vs_verified = 0; // Placeholder

  // Find most corrected category
  const categoryCorrections = new Map<string, number>();
  original.analysis_results.forEach(q => {
    const correctionCount = q.disclosures.filter(s =>
      snippets_corrected.includes(s.snippet_id)
    ).length;

    if (correctionCount > 0) {
      categoryCorrections.set(
        q.category,
        (categoryCorrections.get(q.category) || 0) + correctionCount
      );
    }
  });

  const most_corrected_category = Array.from(categoryCorrections.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  // Find most corrected questions
  const questionCorrections = new Map<string, number>();
  original.analysis_results.forEach(q => {
    const correctionCount = q.disclosures.filter(s =>
      snippets_corrected.includes(s.snippet_id) || snippets_removed.includes(s.snippet_id)
    ).length;

    if (correctionCount > 0) {
      questionCorrections.set(q.question_id, correctionCount);
    }
  });

  const most_corrected_questions = Array.from(questionCorrections.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([question_id, corrections_count]) => ({
      question_id,
      corrections_count
    }));

  // Build detailed snippet changes
  const snippet_changes: SnippetChange[] = [];

  for (const [snippetId, originalSnippet] of originalSnippets) {
    const verifiedSnippet = verifiedSnippets.get(snippetId);

    let changeType: ChangeType = 'unchanged';
    let change: SnippetChange | null = null;

    if (!verifiedSnippet) {
      // Removed
      changeType = 'removed';
      const questionId = original.analysis_results.find(q =>
        q.disclosures.some(s => s.snippet_id === snippetId)
      )?.question_id || '';

      change = {
        snippet_id: snippetId,
        question_id: questionId,
        change_type: 'removed',
        original_classification: originalSnippet.classification,
        original_score: calculateSnippetScore(originalSnippet)
      };

    } else if (originalSnippet.classification !== verifiedSnippet.classification) {
      // Classification corrected
      changeType = 'classification_corrected';
      const questionId = verified.analysis_results.find(q =>
        q.disclosures.some(s => s.snippet_id === snippetId)
      )?.question_id || '';

      change = {
        snippet_id: snippetId,
        question_id: questionId,
        change_type: 'classification_corrected',
        original_classification: originalSnippet.classification,
        verified_classification: verifiedSnippet.classification,
        original_score: calculateSnippetScore(originalSnippet),
        verified_score: calculateSnippetScore(verifiedSnippet)
      };

    } else if (
      originalSnippet.categorization.financial_type !== verifiedSnippet.categorization.financial_type ||
      originalSnippet.categorization.timeframe !== verifiedSnippet.categorization.timeframe ||
      originalSnippet.categorization.framing !== verifiedSnippet.categorization.framing
    ) {
      // Categorization corrected
      changeType = 'categorization_corrected';
      const questionId = verified.analysis_results.find(q =>
        q.disclosures.some(s => s.snippet_id === snippetId)
      )?.question_id || '';

      change = {
        snippet_id: snippetId,
        question_id: questionId,
        change_type: 'categorization_corrected',
        original_score: calculateSnippetScore(originalSnippet),
        verified_score: calculateSnippetScore(verifiedSnippet)
      };
    }

    if (change) {
      snippet_changes.push(change);
    }
  }

  return {
    company_name: verified.company_name,
    fiscal_year: verified.fiscal_year,
    total_snippets_original,
    total_snippets_verified,
    snippets_removed: snippets_removed.length,
    snippets_corrected: snippets_corrected.length,
    snippets_unchanged: snippets_unchanged.length,
    pass_rate,
    classification_transitions,
    financial_type_changes,
    timeframe_changes,
    framing_changes,
    questions_modified: Array.from(questions_modified),
    questions_with_removals: Array.from(questions_with_removals),
    questions_with_corrections: Array.from(questions_with_corrections),
    score_change_original_vs_verified,
    category_score_changes: {},
    most_corrected_category,
    most_corrected_questions,
    snippet_changes
  };
}

/**
 * Get change information for a specific snippet
 */
export function getSnippetChange(
  snippetId: string,
  verificationMetrics: VerificationMetrics
): SnippetChange | null {
  return verificationMetrics.snippet_changes.find(sc => sc.snippet_id === snippetId) || null;
}

/**
 * Check if a snippet was changed during verification
 */
export function wasSnippetChanged(
  snippetId: string,
  verificationMetrics: VerificationMetrics
): boolean {
  return verificationMetrics.snippet_changes.some(sc => sc.snippet_id === snippetId);
}

/**
 * Get all snippets changed in a question
 */
export function getQuestionSnippetChanges(
  questionId: string,
  verificationMetrics: VerificationMetrics
): SnippetChange[] {
  return verificationMetrics.snippet_changes.filter(sc => sc.question_id === questionId);
}
