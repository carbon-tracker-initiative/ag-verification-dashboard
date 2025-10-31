/**
 * Test Helpers and Utilities
 * Provides mock data and assertion helpers for testing
 */

import type { Snippet, QuestionResult, AnalysisResult } from '../../src/types/analysis';
import type { CompanyMetrics, QuestionMetrics } from '../../src/types/metrics';

// Colors for test output
export const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test result tracking
export class TestResults {
  passed: number = 0;
  failed: number = 0;
  tests: Array<{ name: string; passed: boolean; error?: string }> = [];

  addTest(name: string, passed: boolean, error?: string) {
    this.tests.push({ name, passed, error });
    if (passed) {
      this.passed++;
    } else {
      this.failed++;
    }
  }

  print() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.cyan}Test Results${colors.reset}`);
    console.log('='.repeat(60));

    this.tests.forEach(test => {
      const status = test.passed
        ? `${colors.green}✓ PASS${colors.reset}`
        : `${colors.red}✗ FAIL${colors.reset}`;
      console.log(`${status} ${test.name}`);
      if (test.error) {
        console.log(`  ${colors.red}${test.error}${colors.reset}`);
      }
    });

    console.log('='.repeat(60));
    console.log(`Total: ${this.tests.length} | ${colors.green}Passed: ${this.passed}${colors.reset} | ${colors.red}Failed: ${this.failed}${colors.reset}`);
    console.log('='.repeat(60) + '\n');
  }

  get allPassed(): boolean {
    return this.failed === 0;
  }
}

// Assertion helpers
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

export function assertClose(actual: number, expected: number, tolerance: number = 0.01, message: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}\n  Tolerance: ${tolerance}`);
  }
}

export function assertInRange(value: number, min: number, max: number, message: string): void {
  if (value < min || value > max) {
    throw new Error(`${message}\n  Value: ${value}\n  Range: [${min}, ${max}]`);
  }
}

// Mock data generators
export function createMockSnippet(overrides: Partial<Snippet> = {}): Snippet {
  return {
    snippet_id: 'test-snippet-001',
    quote: 'Test quote for snippet',
    source: 'Test-Document.pdf, Page 1',
    classification: 'FULL_DISCLOSURE',
    classification_justification: 'Test justification',
    categorization: {
      framing: 'Both',
      framing_justification: 'Test framing justification',
      financial_type: 'Full',
      financial_justification: 'Test financial justification',
      timeframe: 'Current',
      timeframe_justification: 'Test timeframe justification'
    },
    financial_amounts: [
      {
        amount: '100',
        currency: 'USD',
        context: 'Test context'
      }
    ],
    ...overrides
  };
}

export function createMockQuestion(overrides: Partial<QuestionResult> = {}): QuestionResult {
  return {
    question_id: 'Q001',
    question_text: 'Test question text?',
    category: 'Environmental Risk',
    priority: 'High',
    disclosures: [createMockSnippet()],
    summary: 'Test summary',
    ...overrides
  };
}

export function createMockAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    company_name: 'Test Company',
    fiscal_year: 2024,
    analysis_date: '2024-01-01',
    model_used: 'test-model',
    total_questions: 1,
    documents_analyzed: ['test-doc.pdf'],
    analysis_results: [createMockQuestion()],
    ...overrides
  };
}

// Validation helpers
export function validateSnippetScore(score: number): void {
  assertInRange(score, 0, 100, 'Snippet score must be between 0 and 100');
}

export function validateGrade(grade: string): void {
  const validGrades = ['A', 'B', 'C', 'D', 'F'];
  assert(validGrades.includes(grade), `Grade must be one of ${validGrades.join(', ')}`);
}

export function validateClassification(classification: string): void {
  const validClassifications = ['FULL_DISCLOSURE', 'PARTIAL', 'UNCLEAR', 'NO_DISCLOSURE'];
  assert(validClassifications.includes(classification), `Classification must be one of ${validClassifications.join(', ')}`);
}

// Test runner
export async function runTest(
  name: string,
  testFn: () => void | Promise<void>,
  results: TestResults
): Promise<void> {
  try {
    await testFn();
    results.addTest(name, true);
  } catch (error) {
    results.addTest(name, false, error instanceof Error ? error.message : String(error));
  }
}
