/**
 * Data Loader Integration Tests
 * Tests data loading, parsing, and normalization
 */

import {
  parseFilename,
  normalizeAnalysisResult,
  getBaseQuestionId,
  loadJsonFile
} from '../src/utils/dataLoader';

import type { AnalysisResult } from '../src/types/analysis';

import {
  TestResults,
  runTest,
  assert,
  assertEqual,
  colors
} from './utils/testHelpers';

const results = new TestResults();

// ==================== Filename Parsing Tests ====================

await runTest('parseFilename: Valid verified file', () => {
  const filename = 'Bayer_2022_v3_gemini-2-5-flash_15-01-2025_14-30-45_verified.json';
  const parsed = parseFilename(filename);

  assert(parsed !== null, 'Should parse valid filename');
  assertEqual(parsed!.company, 'Bayer', 'Company name should be extracted');
  assertEqual(parsed!.year, 2022, 'Year should be extracted');
  assertEqual(parsed!.version, 'v3', 'Version should be extracted');
  assertEqual(parsed!.model, 'gemini-2-5-flash', 'Model should be extracted');
  assertEqual(parsed!.timestamp, '15-01-2025_14-30-45', 'Timestamp should be extracted');
  assertEqual(parsed!.isVerified, true, 'Should detect verified flag');
  assertEqual(parsed!.isReport, false, 'Should not be a report');
}, results);

await runTest('parseFilename: Verification report file', () => {
  const filename = 'Bayer_2022_v3_gemini-2-5-flash_15-01-2025_14-30-45_verification_report.json';
  const parsed = parseFilename(filename);

  assert(parsed !== null, 'Should parse verification report filename');
  assertEqual(parsed!.company, 'Bayer', 'Company name should be extracted');
  assertEqual(parsed!.year, 2022, 'Year should be extracted');
  assertEqual(parsed!.isVerified, false, 'Report should not have verified flag');
  assertEqual(parsed!.isReport, true, 'Should detect report flag');
}, results);

await runTest('parseFilename: Original (unverified) file', () => {
  const filename = 'Bayer_2022_v3_gemini-2-5-flash_15-01-2025_14-30-45.json';
  const parsed = parseFilename(filename);

  assert(parsed !== null, 'Should parse original filename');
  assertEqual(parsed!.company, 'Bayer', 'Company name should be extracted');
  assertEqual(parsed!.year, 2022, 'Year should be extracted');
  assertEqual(parsed!.isVerified, false, 'Should not have verified flag');
  assertEqual(parsed!.isReport, false, 'Should not be a report');
}, results);

await runTest('parseFilename: Company name with hyphen', () => {
  const filename = 'Corteva-AgriScience_2023_v3_claude-3-5-sonnet_10-01-2025_09-15-30_verified.json';
  const parsed = parseFilename(filename);

  assert(parsed !== null, 'Should parse filename with hyphenated company name');
  assertEqual(parsed!.company, 'Corteva-AgriScience', 'Should preserve hyphens in company name');
}, results);

await runTest('parseFilename: Invalid filename (too few parts)', () => {
  const filename = 'Invalid_2022.json';
  const parsed = parseFilename(filename);

  assertEqual(parsed, null, 'Should return null for invalid filename');
}, results);

await runTest('parseFilename: Invalid year', () => {
  const filename = 'Bayer_NotAYear_v3_model_15-01-2025_14-30-45_verified.json';
  const parsed = parseFilename(filename);

  assertEqual(parsed, null, 'Should return null for invalid year');
}, results);

await runTest('parseFilename: Missing time component', () => {
  const filename = 'Bayer_2022_v3_gemini-2-5-flash_15-01-2025_verified.json';
  const parsed = parseFilename(filename);

  assert(parsed !== null, 'Should parse filename without time');
  assertEqual(parsed!.timestamp, '15-01-2025_00-00-00', 'Should default time to 00-00-00');
}, results);

// ==================== Question ID Normalization Tests ====================

await runTest('getBaseQuestionId: Strip variant suffix -A', () => {
  const questionId = 'ENV-001-A';
  const baseId = getBaseQuestionId(questionId);

  assertEqual(baseId, 'ENV-001', 'Should strip -A suffix');
}, results);

await runTest('getBaseQuestionId: Strip variant suffix -B', () => {
  const questionId = 'REG-015-B';
  const baseId = getBaseQuestionId(questionId);

  assertEqual(baseId, 'REG-015', 'Should strip -B suffix');
}, results);

await runTest('getBaseQuestionId: No suffix to strip', () => {
  const questionId = 'ENV-001';
  const baseId = getBaseQuestionId(questionId);

  assertEqual(baseId, 'ENV-001', 'Should return unchanged if no suffix');
}, results);

await runTest('getBaseQuestionId: Preserve internal hyphens', () => {
  const questionId = 'ENV-RISK-001-A';
  const baseId = getBaseQuestionId(questionId);

  assertEqual(baseId, 'ENV-RISK-001', 'Should only strip final -A');
}, results);

// ==================== Result Normalization Tests ====================

await runTest('normalizeAnalysisResult: Complete valid result', () => {
  const result = {
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
            classification_justification: 'Test',
            categorization: {
              framing: 'Both',
              framing_justification: 'Test',
              financial_type: 'Full',
              financial_justification: 'Test',
              timeframe: 'Current',
              timeframe_justification: 'Test'
            },
            financial_amounts: [100000]
          }
        ],
        summary: 'Test summary'
      }
    ]
  };

  const normalized = normalizeAnalysisResult(result);

  assert(normalized.analysis_results.length === 1, 'Should preserve analysis results');
  assert(normalized.analysis_results[0].disclosures.length === 1, 'Should preserve disclosures');
  assertEqual(
    normalized.analysis_results[0].disclosures[0].financial_amounts[0],
    100000,
    'Should preserve financial amounts'
  );
}, results);

await runTest('normalizeAnalysisResult: Missing analysis_results', () => {
  const result = {
    company_name: 'Test Company',
    fiscal_year: 2024,
    analysis_date: '2024-01-01',
    model_used: 'test-model',
    total_questions: 0,
    documents_analyzed: ['test.pdf']
    // analysis_results missing
  };

  const normalized = normalizeAnalysisResult(result);

  assert(Array.isArray(normalized.analysis_results), 'Should create empty analysis_results array');
  assertEqual(normalized.analysis_results.length, 0, 'Should be empty array');
}, results);

await runTest('normalizeAnalysisResult: Missing disclosures in question', () => {
  const result = {
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
        // disclosures missing
        summary: 'Test summary'
      }
    ]
  };

  const normalized = normalizeAnalysisResult(result);

  assert(
    Array.isArray(normalized.analysis_results[0].disclosures),
    'Should create empty disclosures array'
  );
  assertEqual(normalized.analysis_results[0].disclosures.length, 0, 'Should be empty array');
}, results);

await runTest('normalizeAnalysisResult: Missing financial_amounts in snippet', () => {
  const result = {
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
            classification_justification: 'Test',
            categorization: {
              framing: 'Both',
              framing_justification: 'Test',
              financial_type: 'Full',
              financial_justification: 'Test',
              timeframe: 'Current',
              timeframe_justification: 'Test'
            }
            // financial_amounts missing
          }
        ],
        summary: 'Test summary'
      }
    ]
  };

  const normalized = normalizeAnalysisResult(result);

  assert(
    Array.isArray(normalized.analysis_results[0].disclosures[0].financial_amounts),
    'Should create empty financial_amounts array'
  );
  assertEqual(
    normalized.analysis_results[0].disclosures[0].financial_amounts.length,
    0,
    'Should be empty array'
  );
}, results);

await runTest('normalizeAnalysisResult: Missing categorization in snippet', () => {
  const result = {
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
            classification_justification: 'Test',
            // categorization missing
            financial_amounts: []
          }
        ],
        summary: 'Test summary'
      }
    ]
  };

  const normalized = normalizeAnalysisResult(result);

  const categorization = normalized.analysis_results[0].disclosures[0].categorization;

  assert(categorization !== undefined, 'Should create default categorization');
  assertEqual(categorization.framing, 'Neutral', 'Should default framing to Neutral');
  assertEqual(categorization.financial_type, 'Non-Financial', 'Should default financial_type');
  assertEqual(categorization.timeframe, 'Multiple or Unclear', 'Should default timeframe');
  assertEqual(categorization.framing_justification, '', 'Should have empty justification');
}, results);

await runTest('normalizeAnalysisResult: Partial categorization', () => {
  const result = {
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
            classification_justification: 'Test',
            categorization: {
              framing: 'Risk',
              framing_justification: 'Test'
              // Other fields missing
            },
            financial_amounts: []
          }
        ],
        summary: 'Test summary'
      }
    ]
  };

  const normalized = normalizeAnalysisResult(result);

  const categorization = normalized.analysis_results[0].disclosures[0].categorization;

  assertEqual(categorization.framing, 'Risk', 'Should preserve existing framing');
  // Note: Current implementation doesn't add defaults to partial categorization
  // This test documents current behavior
}, results);

// ==================== JSON Loading Tests ====================

await runTest('loadJsonFile: Error handling for non-existent file', async () => {
  let errorThrown = false;
  try {
    await loadJsonFile('/path/to/nonexistent/file.json');
  } catch (error) {
    errorThrown = true;
  }

  assert(errorThrown, 'Should throw error for non-existent file');
}, results);

// ==================== Edge Cases ====================

await runTest('normalizeAnalysisResult: Empty analysis results array', () => {
  const result = {
    company_name: 'Test Company',
    fiscal_year: 2024,
    analysis_date: '2024-01-01',
    model_used: 'test-model',
    total_questions: 0,
    documents_analyzed: ['test.pdf'],
    analysis_results: []
  };

  const normalized = normalizeAnalysisResult(result);

  assert(Array.isArray(normalized.analysis_results), 'Should preserve empty array');
  assertEqual(normalized.analysis_results.length, 0, 'Should remain empty');
}, results);

await runTest('normalizeAnalysisResult: Multiple questions and snippets', () => {
  const result = {
    company_name: 'Test Company',
    fiscal_year: 2024,
    analysis_date: '2024-01-01',
    model_used: 'test-model',
    total_questions: 2,
    documents_analyzed: ['test.pdf'],
    analysis_results: [
      {
        question_id: 'Q001',
        question_text: 'Question 1?',
        category: 'Environmental Risk',
        priority: 'High',
        disclosures: [
          {
            snippet_id: 'test-001',
            quote: 'Quote 1',
            source: 'test.pdf, Page 1',
            classification: 'FULL_DISCLOSURE',
            classification_justification: 'Test',
            financial_amounts: []
          },
          {
            snippet_id: 'test-002',
            quote: 'Quote 2',
            source: 'test.pdf, Page 2',
            classification: 'PARTIAL',
            classification_justification: 'Test',
            financial_amounts: []
          }
        ],
        summary: 'Summary 1'
      },
      {
        question_id: 'Q002',
        question_text: 'Question 2?',
        category: 'Regulatory Risk',
        priority: 'Medium',
        disclosures: [],
        summary: 'Summary 2'
      }
    ]
  };

  const normalized = normalizeAnalysisResult(result);

  assertEqual(normalized.analysis_results.length, 2, 'Should preserve all questions');
  assertEqual(
    normalized.analysis_results[0].disclosures.length,
    2,
    'Should preserve all snippets'
  );
  assert(
    normalized.analysis_results[0].disclosures[0].categorization !== undefined,
    'Should add categorization to all snippets'
  );
  assert(
    normalized.analysis_results[0].disclosures[1].categorization !== undefined,
    'Should add categorization to all snippets'
  );
}, results);

await runTest('parseFilename: Very long company name', () => {
  const filename = 'VeryLongCompanyNameWithMultipleWords_2024_v3_model_15-01-2025_14-30-45_verified.json';
  const parsed = parseFilename(filename);

  assert(parsed !== null, 'Should parse filename with long company name');
  assertEqual(
    parsed!.company,
    'VeryLongCompanyNameWithMultipleWords',
    'Should preserve full company name'
  );
}, results);

await runTest('getBaseQuestionId: No hyphen in ID', () => {
  const questionId = 'Q001';
  const baseId = getBaseQuestionId(questionId);

  assertEqual(baseId, 'Q001', 'Should handle IDs without hyphens');
}, results);

// Print results
results.print();

// Exit with appropriate code
process.exit(results.allPassed ? 0 : 1);
