/**
 * Data Validation Tests
 * Validates data structures and ensures data integrity
 */

import type { Snippet, QuestionResult, AnalysisResult } from '../src/types/analysis';
import type { Classification, FinancialType, Timeframe, Framing } from '../src/types/analysis';

import {
  TestResults,
  runTest,
  assert,
  colors
} from './utils/testHelpers';

const results = new TestResults();

// ==================== Type Validation Tests ====================

await runTest('Classification: Valid values are accepted', () => {
  const validClassifications: Classification[] = [
    'FULL_DISCLOSURE',
    'PARTIAL',
    'UNCLEAR',
    'NO_DISCLOSURE'
  ];

  validClassifications.forEach(classification => {
    // Type system check - this will fail at compile time if invalid
    const test: Classification = classification;
    assert(test === classification, `${classification} should be valid`);
  });
}, results);

await runTest('FinancialType: Valid values are accepted', () => {
  const validTypes: FinancialType[] = ['Full', 'Partial', 'Non-Financial'];

  validTypes.forEach(type => {
    const test: FinancialType = type;
    assert(test === type, `${type} should be valid`);
  });
}, results);

await runTest('Timeframe: Valid values are accepted', () => {
  const validTimeframes: Timeframe[] = [
    'Current',
    'Future',
    'Historical',
    'Multiple or Unclear'
  ];

  validTimeframes.forEach(timeframe => {
    const test: Timeframe = timeframe;
    assert(test === timeframe, `${timeframe} should be valid`);
  });
}, results);

await runTest('Framing: Valid values are accepted', () => {
  const validFramings: Framing[] = ['Risk', 'Opportunity', 'Neutral', 'Both'];

  validFramings.forEach(framing => {
    const test: Framing = framing;
    assert(test === framing, `${framing} should be valid`);
  });
}, results);

// ==================== Structure Validation Tests ====================

function validateSnippet(snippet: Snippet): void {
  assert(typeof snippet.snippet_id === 'string', 'snippet_id must be a string');
  assert(snippet.snippet_id.length > 0, 'snippet_id must not be empty');

  assert(typeof snippet.quote === 'string', 'quote must be a string');
  assert(snippet.quote.length > 0, 'quote must not be empty');

  assert(typeof snippet.source === 'string', 'source must be a string');
  assert(snippet.source.length > 0, 'source must not be empty');

  const validClassifications: Classification[] = [
    'FULL_DISCLOSURE',
    'PARTIAL',
    'UNCLEAR',
    'NO_DISCLOSURE'
  ];
  assert(
    validClassifications.includes(snippet.classification),
    `classification must be one of ${validClassifications.join(', ')}`
  );

  assert(
    typeof snippet.classification_justification === 'string',
    'classification_justification must be a string'
  );

  assert(
    typeof snippet.categorization === 'object' && snippet.categorization !== null,
    'categorization must be an object'
  );

  const validFramings: Framing[] = ['Risk', 'Opportunity', 'Neutral', 'Both'];
  assert(
    validFramings.includes(snippet.categorization.framing),
    `framing must be one of ${validFramings.join(', ')}`
  );

  const validFinancialTypes: FinancialType[] = ['Full', 'Partial', 'Non-Financial'];
  assert(
    validFinancialTypes.includes(snippet.categorization.financial_type),
    `financial_type must be one of ${validFinancialTypes.join(', ')}`
  );

  const validTimeframes: Timeframe[] = [
    'Current',
    'Future',
    'Historical',
    'Multiple or Unclear'
  ];
  assert(
    validTimeframes.includes(snippet.categorization.timeframe),
    `timeframe must be one of ${validTimeframes.join(', ')}`
  );

  assert(Array.isArray(snippet.financial_amounts), 'financial_amounts must be an array');
}

function validateQuestion(question: QuestionResult): void {
  assert(typeof question.question_id === 'string', 'question_id must be a string');
  assert(question.question_id.length > 0, 'question_id must not be empty');

  assert(typeof question.question_text === 'string', 'question_text must be a string');
  assert(question.question_text.length > 0, 'question_text must not be empty');

  assert(typeof question.category === 'string', 'category must be a string');
  assert(question.category.length > 0, 'category must not be empty');

  assert(Array.isArray(question.disclosures), 'disclosures must be an array');

  question.disclosures.forEach((snippet, index) => {
    try {
      validateSnippet(snippet);
    } catch (error) {
      throw new Error(
        `Snippet at index ${index} in question ${question.question_id} is invalid: ${error}`
      );
    }
  });
}

function validateAnalysisResult(analysis: AnalysisResult): void {
  assert(typeof analysis.company_name === 'string', 'company_name must be a string');
  assert(analysis.company_name.length > 0, 'company_name must not be empty');

  assert(typeof analysis.fiscal_year === 'number', 'fiscal_year must be a number');
  assert(analysis.fiscal_year >= 2000 && analysis.fiscal_year <= 2100, 'fiscal_year must be reasonable');

  assert(typeof analysis.analysis_date === 'string', 'analysis_date must be a string');

  assert(typeof analysis.model_used === 'string', 'model_used must be a string');

  assert(typeof analysis.total_questions === 'number', 'total_questions must be a number');
  assert(analysis.total_questions >= 0, 'total_questions must be non-negative');

  assert(Array.isArray(analysis.documents_analyzed), 'documents_analyzed must be an array');

  assert(Array.isArray(analysis.analysis_results), 'analysis_results must be an array');
  assert(
    analysis.analysis_results.length === analysis.total_questions,
    'analysis_results length must match total_questions'
  );

  analysis.analysis_results.forEach((question, index) => {
    try {
      validateQuestion(question);
    } catch (error) {
      throw new Error(`Question at index ${index} is invalid: ${error}`);
    }
  });
}

await runTest('Snippet structure validation', () => {
  const snippet: Snippet = {
    snippet_id: 'test-001',
    quote: 'Test quote',
    source: 'test.pdf, Page 1',
    classification: 'FULL_DISCLOSURE',
    classification_justification: 'Test justification',
    categorization: {
      framing: 'Both',
      framing_justification: 'Test framing',
      financial_type: 'Full',
      financial_justification: 'Test financial',
      timeframe: 'Current',
      timeframe_justification: 'Test timeframe'
    },
    financial_amounts: []
  };

  validateSnippet(snippet);
}, results);

await runTest('Question structure validation', () => {
  const question: QuestionResult = {
    question_id: 'Q001',
    question_text: 'Test question?',
    category: 'Environmental Risk',
    priority: 'High',
    disclosures: [
      {
        snippet_id: 'test-001',
        quote: 'Test quote',
        source: 'test.pdf, Page 1',
        classification: 'FULL_DISCLOSURE',
        classification_justification: 'Test justification',
        categorization: {
          framing: 'Both',
          framing_justification: 'Test framing',
          financial_type: 'Full',
          financial_justification: 'Test financial',
          timeframe: 'Current',
          timeframe_justification: 'Test timeframe'
        },
        financial_amounts: []
      }
    ],
    summary: 'Test summary'
  };

  validateQuestion(question);
}, results);

await runTest('AnalysisResult structure validation', () => {
  const analysis: AnalysisResult = {
    company_name: 'Test Company',
    fiscal_year: 2024,
    analysis_date: '2024-01-01',
    model_used: 'test-model',
    total_questions: 1,
    documents_analyzed: ['test.pdf'],
    analysis_results: [
      {
        question_id: 'Q001',
        question_text: 'Test question?',
        category: 'Environmental Risk',
        priority: 'High',
        disclosures: [
          {
            snippet_id: 'test-001',
            quote: 'Test quote',
            source: 'test.pdf, Page 1',
            classification: 'FULL_DISCLOSURE',
            classification_justification: 'Test justification',
            categorization: {
              framing: 'Both',
              framing_justification: 'Test framing',
              financial_type: 'Full',
              financial_justification: 'Test financial',
              timeframe: 'Current',
              timeframe_justification: 'Test timeframe'
            },
            financial_amounts: []
          }
        ],
        summary: 'Test summary'
      }
    ]
  };

  validateAnalysisResult(analysis);
}, results);

// ==================== Boundary Validation Tests ====================

await runTest('Validation: Rejects empty snippet_id', () => {
  let errorThrown = false;
  try {
    const snippet: Snippet = {
      snippet_id: '',
      quote: 'Test quote',
      source: 'test.pdf, Page 1',
      classification: 'FULL_DISCLOSURE',
      classification_justification: 'Test',
      categorization: {
        framing: 'Both',
        framing_justification: 'Test',
        financial_type: 'Full',
        financial_justification: 'Test',
        timeframe: 'Current',
        timeframe_justification: 'Test'
      },
      financial_amounts: []
    };
    validateSnippet(snippet);
  } catch (error) {
    errorThrown = true;
  }
  assert(errorThrown, 'Should throw error for empty snippet_id');
}, results);

await runTest('Validation: Rejects invalid fiscal_year', () => {
  let errorThrown = false;
  try {
    const analysis: AnalysisResult = {
      company_name: 'Test Company',
      fiscal_year: 1900, // Invalid year
      analysis_date: '2024-01-01',
      model_used: 'test-model',
      total_questions: 0,
      documents_analyzed: [],
      analysis_results: []
    };
    validateAnalysisResult(analysis);
  } catch (error) {
    errorThrown = true;
  }
  assert(errorThrown, 'Should throw error for invalid fiscal_year');
}, results);

await runTest('Validation: Rejects mismatched total_questions', () => {
  let errorThrown = false;
  try {
    const analysis: AnalysisResult = {
      company_name: 'Test Company',
      fiscal_year: 2024,
      analysis_date: '2024-01-01',
      model_used: 'test-model',
      total_questions: 5, // Mismatch
      documents_analyzed: [],
      analysis_results: [] // Empty
    };
    validateAnalysisResult(analysis);
  } catch (error) {
    errorThrown = true;
  }
  assert(errorThrown, 'Should throw error for mismatched total_questions');
}, results);

// Print results
results.print();

// Exit with appropriate code
process.exit(results.allPassed ? 0 : 1);
