/**
 * Unit Tests for Metrics Calculator
 * Tests multi-dimensional scoring, grading, and aggregation
 */

import {
  calculateSnippetScore,
  calculateFinancialScore,
  calculateTemporalScore,
  calculateNarrativeScore,
  calculateQuestionMetrics,
  calculateCompanyMetrics,
  calculateGrade
} from '../src/utils/metricsCalculator';

import {
  TestResults,
  runTest,
  createMockSnippet,
  createMockQuestion,
  createMockAnalysisResult,
  assertEqual,
  assertClose,
  assertInRange,
  validateSnippetScore,
  validateGrade,
  colors
} from './utils/testHelpers';

const results = new TestResults();

// ==================== Financial Score Tests ====================

await runTest('calculateFinancialScore: Full financial type = 3 points', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      financial_type: 'Full'
    }
  });
  const score = calculateFinancialScore(snippet);
  assertEqual(score, 3, 'Full financial type should give 3 points');
}, results);

await runTest('calculateFinancialScore: Partial financial type = 2 points', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      financial_type: 'Partial'
    }
  });
  const score = calculateFinancialScore(snippet);
  assertEqual(score, 2, 'Partial financial type should give 2 points');
}, results);

await runTest('calculateFinancialScore: Non-Financial type = 1 point', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      financial_type: 'Non-Financial'
    }
  });
  const score = calculateFinancialScore(snippet);
  assertEqual(score, 1, 'Non-Financial type should give 1 point');
}, results);

// ==================== Temporal Score Tests ====================

await runTest('calculateTemporalScore: Current timeframe = 3 points', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      timeframe: 'Current'
    }
  });
  const score = calculateTemporalScore(snippet);
  assertEqual(score, 3, 'Current timeframe should give 3 points');
}, results);

await runTest('calculateTemporalScore: Future timeframe = 2 points', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      timeframe: 'Future'
    }
  });
  const score = calculateTemporalScore(snippet);
  assertEqual(score, 2, 'Future timeframe should give 2 points');
}, results);

await runTest('calculateTemporalScore: Historical timeframe = 1 point', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      timeframe: 'Historical'
    }
  });
  const score = calculateTemporalScore(snippet);
  assertEqual(score, 1, 'Historical timeframe should give 1 point');
}, results);

await runTest('calculateTemporalScore: Unclear timeframe = 0 points', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      timeframe: 'Multiple or Unclear'
    }
  });
  const score = calculateTemporalScore(snippet);
  assertEqual(score, 0, 'Unclear timeframe should give 0 points');
}, results);

// ==================== Narrative Score Tests ====================

await runTest('calculateNarrativeScore: Both framing = 3 points', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      framing: 'Both'
    }
  });
  const score = calculateNarrativeScore(snippet);
  assertEqual(score, 3, 'Both framing should give 3 points');
}, results);

await runTest('calculateNarrativeScore: Risk or Opportunity framing = 2 points', () => {
  const snippetRisk = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      framing: 'Risk'
    }
  });
  const scoreRisk = calculateNarrativeScore(snippetRisk);
  assertEqual(scoreRisk, 2, 'Risk framing should give 2 points');

  const snippetOpp = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      framing: 'Opportunity'
    }
  });
  const scoreOpp = calculateNarrativeScore(snippetOpp);
  assertEqual(scoreOpp, 2, 'Opportunity framing should give 2 points');
}, results);

await runTest('calculateNarrativeScore: Neutral framing = 1 point', () => {
  const snippet = createMockSnippet({
    categorization: {
      ...createMockSnippet().categorization,
      framing: 'Neutral'
    }
  });
  const score = calculateNarrativeScore(snippet);
  assertEqual(score, 1, 'Neutral framing should give 1 point');
}, results);

// ==================== Composite Score Tests ====================

await runTest('calculateSnippetScore: Perfect score (Full + Current + Both)', () => {
  const snippet = createMockSnippet({
    categorization: {
      framing: 'Both',
      framing_justification: 'Test',
      financial_type: 'Full',
      financial_justification: 'Test',
      timeframe: 'Current',
      timeframe_justification: 'Test'
    }
  });
  const score = calculateSnippetScore(snippet);
  // (3 + 3 + 3) / 9 * 100 = 100%
  assertClose(score, 100, 0.01, 'Perfect snippet should score 100%');
  validateSnippetScore(score);
}, results);

await runTest('calculateSnippetScore: Minimum score (Non-Financial + Unclear + Neutral)', () => {
  const snippet = createMockSnippet({
    categorization: {
      framing: 'Neutral',
      framing_justification: 'Test',
      financial_type: 'Non-Financial',
      financial_justification: 'Test',
      timeframe: 'Multiple or Unclear',
      timeframe_justification: 'Test'
    }
  });
  const score = calculateSnippetScore(snippet);
  // (1 + 0 + 1) / 9 * 100 = 22.22%
  assertClose(score, 22.22, 0.1, 'Minimum snippet should score ~22.22%');
  validateSnippetScore(score);
}, results);

await runTest('calculateSnippetScore: Mid-range score (Partial + Future + Risk)', () => {
  const snippet = createMockSnippet({
    categorization: {
      framing: 'Risk',
      framing_justification: 'Test',
      financial_type: 'Partial',
      financial_justification: 'Test',
      timeframe: 'Future',
      timeframe_justification: 'Test'
    }
  });
  const score = calculateSnippetScore(snippet);
  // (2 + 2 + 2) / 9 * 100 = 66.67%
  assertClose(score, 66.67, 0.1, 'Mid-range snippet should score ~66.67%');
  validateSnippetScore(score);
}, results);

// ==================== Grading Tests ====================

await runTest('getGrade: 95% = A', () => {
  const grade = calculateGrade(95);
  assertEqual(grade, 'A', 'Score of 95% should be grade A');
  validateGrade(grade);
}, results);

await runTest('getGrade: 85% = B', () => {
  const grade = calculateGrade(85);
  assertEqual(grade, 'B', 'Score of 85% should be grade B');
  validateGrade(grade);
}, results);

await runTest('getGrade: 75% = C', () => {
  const grade = calculateGrade(75);
  assertEqual(grade, 'C', 'Score of 75% should be grade C');
  validateGrade(grade);
}, results);

await runTest('getGrade: 65% = D', () => {
  const grade = calculateGrade(65);
  assertEqual(grade, 'D', 'Score of 65% should be grade D');
  validateGrade(grade);
}, results);

await runTest('getGrade: 55% = F', () => {
  const grade = calculateGrade(55);
  assertEqual(grade, 'F', 'Score of 55% should be grade F');
  validateGrade(grade);
}, results);

await runTest('getGrade: Boundary at 90% = A', () => {
  const grade = calculateGrade(90);
  assertEqual(grade, 'A', 'Score of exactly 90% should be grade A');
}, results);

await runTest('getGrade: Boundary at 89.9% = B', () => {
  const grade = calculateGrade(89.9);
  assertEqual(grade, 'B', 'Score of 89.9% should be grade B');
}, results);

// ==================== Question Metrics Tests ====================

await runTest('calculateQuestionMetrics: Correctly aggregates snippet scores', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({
        categorization: {
          framing: 'Both',
          framing_justification: 'Test',
          financial_type: 'Full',
          financial_justification: 'Test',
          timeframe: 'Current',
          timeframe_justification: 'Test'
        }
      }),
      createMockSnippet({
        categorization: {
          framing: 'Risk',
          framing_justification: 'Test',
          financial_type: 'Partial',
          financial_justification: 'Test',
          timeframe: 'Future',
          timeframe_justification: 'Test'
        }
      })
    ]
  });

  const metrics = calculateQuestionMetrics(question);

  // First snippet: 100%, Second snippet: 66.67%, Average: 83.33%
  assertClose(metrics.average_snippet_score, 83.33, 0.5, 'Average of 100% and 66.67% should be ~83.33%');
  assertEqual(metrics.best_snippet_score, 100, 'Best snippet should be 100%');
  assertEqual(metrics.total_snippets, 2, 'Should have 2 snippets');
  assertEqual(metrics.disclosure_quality_grade, 'B', 'Average of 83.33% should be grade B');
}, results);

await runTest('calculateQuestionMetrics: Handles single snippet', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({
        categorization: {
          framing: 'Both',
          framing_justification: 'Test',
          financial_type: 'Full',
          financial_justification: 'Test',
          timeframe: 'Current',
          timeframe_justification: 'Test'
        }
      })
    ]
  });

  const metrics = calculateQuestionMetrics(question);

  assertEqual(metrics.average_snippet_score, 100, 'Single perfect snippet should average 100%');
  assertEqual(metrics.best_snippet_score, 100, 'Best snippet should be 100%');
  assertEqual(metrics.total_snippets, 1, 'Should have 1 snippet');
}, results);

await runTest('calculateQuestionMetrics: Handles empty disclosures', () => {
  const question = createMockQuestion({
    disclosures: []
  });

  const metrics = calculateQuestionMetrics(question);

  assertEqual(metrics.average_snippet_score, 0, 'No snippets should average 0%');
  assertEqual(metrics.best_snippet_score, 0, 'No snippets should have best of 0%');
  assertEqual(metrics.total_snippets, 0, 'Should have 0 snippets');
  assertEqual(metrics.disclosure_quality_grade, 'F', 'No disclosure should be grade F');
}, results);

// ==================== Company Metrics Tests ====================

await runTest('calculateCompanyMetrics: Correctly aggregates question scores', () => {
  const analysis = createMockAnalysisResult({
    analysis_results: [
      createMockQuestion({
        question_id: 'Q001',
        category: 'Environmental Risk',
        disclosures: [
          createMockSnippet({
            categorization: {
              framing: 'Both',
              framing_justification: 'Test',
              financial_type: 'Full',
              financial_justification: 'Test',
              timeframe: 'Current',
              timeframe_justification: 'Test'
            }
          })
        ]
      }),
      createMockQuestion({
        question_id: 'Q002',
        category: 'Environmental Risk',
        disclosures: [
          createMockSnippet({
            categorization: {
              framing: 'Neutral',
              framing_justification: 'Test',
              financial_type: 'Non-Financial',
              financial_justification: 'Test',
              timeframe: 'Multiple or Unclear',
              timeframe_justification: 'Test'
            }
          })
        ]
      })
    ]
  });

  const metrics = calculateCompanyMetrics(analysis);

  // Average of 100% and 22.22% ≈ 61.11%
  assertClose(metrics.overall_disclosure_score, 61.11, 1, 'Overall score should be ~61.11%');
  assertEqual(metrics.overall_grade, 'D', 'Score of ~61% should be grade D');
  assertEqual(metrics.total_questions_analyzed, 2, 'Should have 2 questions analyzed');
  assertEqual(metrics.total_snippets, 2, 'Should have 2 snippets');
}, results);

await runTest('calculateCompanyMetrics: Category scores are correct', () => {
  const analysis = createMockAnalysisResult({
    analysis_results: [
      createMockQuestion({
        question_id: 'Q001',
        category: 'Environmental Risk',
        disclosures: [createMockSnippet()] // Default snippet scores 100%
      }),
      createMockQuestion({
        question_id: 'Q002',
        category: 'Human Health Risk',
        disclosures: [
          createMockSnippet({
            categorization: {
              framing: 'Risk',
              framing_justification: 'Test',
              financial_type: 'Partial',
              financial_justification: 'Test',
              timeframe: 'Future',
              timeframe_justification: 'Test'
            }
          })
        ]
      })
    ]
  });

  const metrics = calculateCompanyMetrics(analysis);

  assertClose(metrics.category_scores['Environmental Risk'], 100, 0.1, 'Environmental Risk should be 100%');
  assertClose(metrics.category_scores['Human Health Risk'], 66.67, 0.5, 'Human Health Risk should be ~66.67%');
}, results);

// ==================== Edge Cases ====================

await runTest('Edge case: Score never exceeds 100%', () => {
  const snippet = createMockSnippet({
    categorization: {
      framing: 'Both',
      framing_justification: 'Test',
      financial_type: 'Full',
      financial_justification: 'Test',
      timeframe: 'Current',
      timeframe_justification: 'Test'
    }
  });
  const score = calculateSnippetScore(snippet);
  assertInRange(score, 0, 100, 'Score should be between 0 and 100');
}, results);

await runTest('Edge case: Score never goes below 0%', () => {
  const snippet = createMockSnippet({
    categorization: {
      framing: 'Neutral',
      framing_justification: 'Test',
      financial_type: 'Non-Financial',
      financial_justification: 'Test',
      timeframe: 'Multiple or Unclear',
      timeframe_justification: 'Test'
    }
  });
  const score = calculateSnippetScore(snippet);
  assertInRange(score, 0, 100, 'Score should be between 0 and 100');
}, results);

// Print results
results.print();

// Exit with appropriate code
process.exit(results.allPassed ? 0 : 1);
