/**
 * Unit Tests for Metrics Calculator
 * Tests categorization, classification, and distribution metrics
 */

import {
  calculateQuestionMetrics,
  calculateCompanyMetrics,
  calculateCrossCompanyMetrics
} from '../src/utils/metricsCalculator';
import type { CompanyYearData } from '../src/types/analysis';

import {
  TestResults,
  runTest,
  createMockSnippet,
  createMockQuestion,
  createMockAnalysisResult,
  assertEqual,
  assertClose,
  colors
} from './utils/testHelpers';

const results = new TestResults();

// ==================== Classification Tests ====================

await runTest('Classification counts: Correctly counts FULL_DISCLOSURE', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({ classification: 'FULL_DISCLOSURE' }),
      createMockSnippet({ classification: 'FULL_DISCLOSURE' })
    ]
  });

  const metrics = calculateQuestionMetrics(question);
  assertEqual(metrics.snippets_by_classification.FULL_DISCLOSURE, 2, 'Should count 2 FULL_DISCLOSURE snippets');
}, results);

await runTest('Classification counts: Correctly counts mixed classifications', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({ classification: 'FULL_DISCLOSURE' }),
      createMockSnippet({ classification: 'PARTIAL' }),
      createMockSnippet({ classification: 'UNCLEAR' })
    ]
  });

  const metrics = calculateQuestionMetrics(question);
  assertEqual(metrics.snippets_by_classification.FULL_DISCLOSURE, 1, 'Should count 1 FULL_DISCLOSURE');
  assertEqual(metrics.snippets_by_classification.PARTIAL, 1, 'Should count 1 PARTIAL');
  assertEqual(metrics.snippets_by_classification.UNCLEAR, 1, 'Should count 1 UNCLEAR');
  assertEqual(metrics.total_snippets, 3, 'Should have 3 total snippets');
}, results);

// ==================== Distribution Rate Tests ====================

await runTest('Financial rate: 100% for all full financial snippets', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          financial_type: 'Full'
        }
      }),
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          financial_type: 'Full'
        }
      })
    ]
  });

  const metrics = calculateQuestionMetrics(question);
  assertClose(metrics.financial_quantification_rate, 100, 0.1, 'All Full financial should be 100%');
}, results);

await runTest('Financial rate: 50% for half full financial snippets', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          financial_type: 'Full'
        }
      }),
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          financial_type: 'Non-Financial'
        }
      })
    ]
  });

  const metrics = calculateQuestionMetrics(question);
  assertClose(metrics.financial_quantification_rate, 50, 0.1, 'Half Full financial should be 50%');
}, results);

// ==================== Temporal Distribution Tests ====================

await runTest('Temporal rates: Correctly calculates present day rate', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          timeframe: 'Present day'
        }
      }),
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          timeframe: 'Future'
        }
      })
    ]
  });

  const metrics = calculateQuestionMetrics(question);
  assertEqual(metrics.snippets_current, 1, 'Should count 1 present-day snippet');
  assertEqual(metrics.snippets_future, 1, 'Should count 1 future-oriented snippet');
  const presentDayRate = metrics.total_snippets > 0
    ? (metrics.snippets_current / metrics.total_snippets) * 100
    : 0;
  assertClose(presentDayRate, 50, 0.1, 'Half present day should be 50%');
}, results);

// ==================== Narrative Distribution Tests ====================

await runTest('Narrative rates: Correctly calculates risk rate', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          framing: 'Risk'
        }
      }),
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          framing: 'Risk'
        }
      }),
      createMockSnippet({
        categorization: {
          ...createMockSnippet().categorization,
          framing: 'Opportunity'
        }
      })
    ]
  });

  const metrics = calculateQuestionMetrics(question);
  assertClose(metrics.narrative_risk_rate, 66.67, 0.5, 'Two out of three risk should be ~66.67%');
}, results);

// ==================== Evidence Depth Tests ====================

await runTest('Evidence depth: Equals total snippets for question metrics', () => {
  const question = createMockQuestion({
    disclosures: [
      createMockSnippet({ classification: 'FULL_DISCLOSURE' }),
      createMockSnippet({ classification: 'FULL_DISCLOSURE' })
    ]
  });

  const metrics = calculateQuestionMetrics(question);
  assertEqual(metrics.evidence_depth, 2, 'Evidence depth should equal total snippets');
  assertEqual(metrics.total_snippets, 2, 'Should have 2 snippets');
}, results);

await runTest('Evidence depth: Zero when no snippets', () => {
  const question = createMockQuestion({
    disclosures: []
  });

  const metrics = calculateQuestionMetrics(question);
  assertEqual(metrics.evidence_depth, 0, 'Evidence depth should be 0 for no snippets');
  assertEqual(metrics.total_snippets, 0, 'Should have 0 snippets');
}, results);

// ==================== Company Aggregation Tests ====================

await runTest('Company metrics: Correctly aggregates question classifications', () => {
  const analysis = createMockAnalysisResult({
    analysis_results: [
      createMockQuestion({
        question_id: 'Q001',
        disclosures: [
          createMockSnippet({ classification: 'FULL_DISCLOSURE' })
        ]
      }),
      createMockQuestion({
        question_id: 'Q002',
        disclosures: [
          createMockSnippet({ classification: 'PARTIAL' })
        ]
      }),
      createMockQuestion({
        question_id: 'Q003',
        disclosures: []
      })
    ]
  });

  const metrics = calculateCompanyMetrics(analysis);

  assertEqual(metrics.total_questions_analyzed, 3, 'Should have 3 questions');
  assertEqual(metrics.total_snippets, 2, 'Should have 2 snippets');
}, results);

await runTest('Company metrics: Radar metrics are calculated', () => {
  const analysis = createMockAnalysisResult({
    analysis_results: [
      createMockQuestion({
        question_id: 'Q001',
        disclosures: [
          createMockSnippet({
            categorization: {
              framing: 'Risk',
              framing_justification: 'Test',
              financial_type: 'Full',
              financial_justification: 'Test',
              timeframe: 'Present day',
              timeframe_justification: 'Test'
            }
          })
        ]
      })
    ]
  });

  const metrics = calculateCompanyMetrics(analysis);

  assertClose(metrics.radar_metrics.financial_transparency, 100, 0.1, 'All Full financial = 100%');
  assertClose(metrics.radar_metrics.evidence_depth, 10, 0.1, 'Evidence depth scales based on average snippets per question');
}, results);

await runTest('Cross-company metrics: Calculates average present-day rate', () => {
  function createTimeframeSnippet(id: string, timeframe: string) {
    const base = createMockSnippet();
    return {
      ...base,
      snippet_id: id,
      categorization: {
        ...base.categorization,
        timeframe
      }
    };
  }

  const companyAAnalysis = createMockAnalysisResult({
    company_name: 'Company A',
    analysis_results: [
      createMockQuestion({
        question_id: 'A-Q1',
        disclosures: [
          createTimeframeSnippet('A-1', 'Present day'),
          createTimeframeSnippet('A-2', 'Present day'),
          createTimeframeSnippet('A-3', 'Future'),
          createTimeframeSnippet('A-4', 'Future')
        ]
      })
    ]
  });

  const companyBAnalysis = createMockAnalysisResult({
    company_name: 'Company B',
    analysis_results: [
      createMockQuestion({
        question_id: 'B-Q1',
        disclosures: [
          createTimeframeSnippet('B-1', 'Present day'),
          createTimeframeSnippet('B-2', 'Present day'),
          createTimeframeSnippet('B-3', 'Present day')
        ]
      })
    ]
  });

  const companyMetrics = [
    calculateCompanyMetrics(companyAAnalysis),
    calculateCompanyMetrics(companyBAnalysis)
  ];

  const companyData: CompanyYearData[] = [
    {
      company: companyAAnalysis.company_name,
      year: companyAAnalysis.fiscal_year,
      version: 'v1',
      model: companyAAnalysis.model_used,
      verified: companyAAnalysis,
      hasComparison: false
    },
    {
      company: companyBAnalysis.company_name,
      year: companyBAnalysis.fiscal_year,
      version: 'v1',
      model: companyBAnalysis.model_used,
      verified: companyBAnalysis,
      hasComparison: false
    }
  ];

  const crossMetrics = calculateCrossCompanyMetrics(companyMetrics, companyData);
  assertClose(
    crossMetrics.global_stats.average_temporal_present_day_rate_all,
    75,
    0.1,
    'Average of company present-day rates (50% and 100%) should be 75%'
  );
}, results);

// ==================== Edge Cases ====================

await runTest('Edge case: Empty analysis results', () => {
  const analysis = createMockAnalysisResult({
    analysis_results: []
  });

  const metrics = calculateCompanyMetrics(analysis);

  assertEqual(metrics.total_questions_analyzed, 0, 'Should have 0 questions');
  assertEqual(metrics.total_snippets, 0, 'Should have 0 snippets');
}, results);

// Print results
results.print();

// Exit with appropriate code
process.exit(results.allPassed ? 0 : 1);
