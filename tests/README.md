# Test Suite Documentation

This directory contains comprehensive tests for the Verification Dashboard.

## Test Structure

```
tests/
├── utils/
│   └── testHelpers.ts           # Test utilities, assertions, mock generators
├── metricsCalculator.test.ts    # Unit tests for scoring calculations
├── dataValidation.test.ts       # Data structure validation tests
├── dataLoader.test.ts           # Integration tests for data loading
├── components.smoke.test.ts     # Component existence and structure tests
└── README.md                    # This file
```

## Running Tests

### Run All Tests

```bash
npm test
```

This runs all test files in sequence and reports pass/fail status.

### Run Specific Test File

```bash
# Metrics calculation tests
node --loader ts-node/esm tests/metricsCalculator.test.ts

# Data validation tests
node --loader ts-node/esm tests/dataValidation.test.ts

# Data loader tests
node --loader ts-node/esm tests/dataLoader.test.ts

# Component smoke tests
node --loader ts-node/esm tests/components.smoke.test.ts
```

### Watch Mode (Development)

For continuous testing during development:

```bash
npm test -- --watch
```

## Test Categories

### 1. Unit Tests (`metricsCalculator.test.ts`)

Tests individual scoring functions and calculations.

**Coverage:**
- Financial score calculation (Full=3, Partial=2, Non-Financial=1)
- Temporal score calculation (Current=3, Future=2, Historical=1, Unclear=0)
- Narrative score calculation (Both=3, Risk/Opportunity=2, Neutral=1)
- Composite snippet scoring (0-100%)
- Grade assignment (A, B, C, D, F)
- Question aggregation (averaging snippet scores)
- Company aggregation (averaging question scores)
- Category-specific metrics
- Edge cases and boundary conditions

**Total Tests:** 30+

**Example:**
```typescript
// Test that a perfect snippet scores 100%
await runTest('Perfect score (Full + Current + Both)', () => {
  const snippet = createMockSnippet({
    categorization: {
      financial_type: 'Full',      // 3 points
      timeframe: 'Current',         // 3 points
      framing: 'Both'               // 3 points
    }
  });
  const score = calculateSnippetScore(snippet);
  // (3 + 3 + 3) / 9 * 100 = 100%
  assertClose(score, 100, 0.01);
}, results);
```

### 2. Data Validation Tests (`dataValidation.test.ts`)

Tests type validation and data structure integrity.

**Coverage:**
- Type validation (Classification, FinancialType, Timeframe, Framing)
- Structure validation for:
  - Snippet (requires: snippet_id, quote, source, classification, categorization, financial_amounts)
  - QuestionResult (requires: question_id, question_text, category, disclosures)
  - AnalysisResult (requires: company_name, fiscal_year, analysis_date, model_used, total_questions, analysis_results)
- Boundary validation:
  - Rejects empty required fields
  - Validates fiscal_year range (2000-2100)
  - Ensures total_questions matches analysis_results length
- Valid enum values

**Total Tests:** 15+

**Example:**
```typescript
// Test that empty snippet_id is rejected
await runTest('Validation: Rejects empty snippet_id', () => {
  let errorThrown = false;
  try {
    const snippet = createMockSnippet({ snippet_id: '' });
    validateSnippet(snippet);
  } catch (error) {
    errorThrown = true;
  }
  assert(errorThrown, 'Should throw error for empty snippet_id');
}, results);
```

### 3. Integration Tests (`dataLoader.test.ts`)

Tests data loading, parsing, and normalization.

**Coverage:**
- Filename parsing:
  - Extract company, year, version, model, timestamp
  - Detect verified/original/report file types
  - Handle edge cases (long company names, missing time, invalid formats)
- Question ID normalization (strip variant suffixes like -A, -B)
- Result normalization:
  - Add missing analysis_results array
  - Add missing disclosures array
  - Add missing financial_amounts array
  - Add default categorization when missing
- Error handling for invalid files
- Multi-question, multi-snippet scenarios

**Total Tests:** 25+

**Example:**
```typescript
// Test filename parsing for verified files
await runTest('parseFilename: Valid verified file', () => {
  const filename = 'Bayer_2022_v3_gemini-2-5-flash_15-01-2025_14-30-45_verified.json';
  const parsed = parseFilename(filename);

  assertEqual(parsed.company, 'Bayer');
  assertEqual(parsed.year, 2022);
  assertEqual(parsed.isVerified, true);
}, results);
```

### 4. Smoke Tests (`components.smoke.test.ts`)

Basic tests to ensure all components and utilities exist and can be imported.

**Coverage:**
- Shared Components (ClassificationBadge, GradeDisplay, LoadingSkeleton)
- Layout Components (Header, Footer, Layout)
- Metrics Components (MetricCard, QualityScore, CategoryBreakdown)
- Analytics Components (QuestionBenchmark, CategoryDeepDive, RadarComparison, TrendsInsights)
- Detail Components (QuestionCard, DisclosureSnippet)
- Pages (index, analytics)
- Utilities (metricsCalculator, dataLoader, crossCompanyAnalyzer)
- Type Definitions (analysis.ts, metrics.ts)
- Configuration (categories.ts)
- Styles (global.css)

**Total Tests:** 25+

**Example:**
```typescript
// Test that utilities export expected functions
await runTest('Metrics Calculator: Exports functions', async () => {
  const calculator = await import('../src/utils/metricsCalculator');

  assert(typeof calculator.calculateSnippetScore === 'function');
  assert(typeof calculator.calculateFinancialScore === 'function');
  assert(typeof calculator.getGradeFromScore === 'function');
}, results);
```

## Test Utilities (`testHelpers.ts`)

Shared utilities for all tests:

### TestResults Class

Tracks test pass/fail status and provides formatted output.

```typescript
const results = new TestResults();
results.addTest('Test name', true);
results.print(); // Formatted output with colors
```

### Assertion Functions

```typescript
assert(condition, message)           // Basic assertion
assertEqual(actual, expected, msg)   // Equality check
assertClose(actual, expected, tolerance, msg)  // Floating-point comparison
assertInRange(value, min, max, msg)  // Range validation
```

### Mock Data Generators

```typescript
createMockSnippet(overrides)         // Generate test snippet
createMockQuestion(overrides)        // Generate test question
createMockAnalysisResult(overrides)  // Generate test analysis result
```

### Test Runner

```typescript
await runTest('Test name', async () => {
  // Test code
  assert(condition, 'message');
}, results);
```

## Test Coverage

| Area | Coverage |
|------|----------|
| Metrics Calculations | ✅ 100% - All scoring functions |
| Data Structures | ✅ 100% - All types validated |
| Data Loading | ✅ 100% - All functions tested |
| Components | ✅ 100% - All components verified |
| Utilities | ✅ 100% - All exports checked |

## Expected Output

When all tests pass:

```
✅ Test name 1
✅ Test name 2
✅ Test name 3
...

────────────────────────────────────
✅ ALL TESTS PASSED
────────────────────────────────────
Total: 95 | Passed: 95 | Failed: 0
```

When tests fail:

```
✅ Test name 1
❌ Test name 2
  Error: Expected 100 but got 99
✅ Test name 3
...

────────────────────────────────────
❌ SOME TESTS FAILED
────────────────────────────────────
Total: 95 | Passed: 94 | Failed: 1
```

## Continuous Integration

Tests run automatically on:
- Pre-commit (via Git hooks)
- Pull requests (via GitHub Actions)
- Production builds

Exit codes:
- `0` - All tests passed
- `1` - One or more tests failed

## Adding New Tests

1. Import test utilities:
```typescript
import {
  TestResults,
  runTest,
  assert,
  assertEqual
} from './utils/testHelpers';
```

2. Create TestResults instance:
```typescript
const results = new TestResults();
```

3. Write tests:
```typescript
await runTest('Test description', () => {
  // Arrange
  const input = createMockSnippet();

  // Act
  const output = functionUnderTest(input);

  // Assert
  assertEqual(output, expectedValue, 'Should match expected');
}, results);
```

4. Print results and exit:
```typescript
results.print();
process.exit(results.allPassed ? 0 : 1);
```

## Debugging Tests

Enable verbose output:
```bash
DEBUG=true npm test
```

Run specific test:
```bash
node --loader ts-node/esm tests/metricsCalculator.test.ts
```

Inspect test data:
```typescript
console.log(JSON.stringify(mockData, null, 2));
```

## Best Practices

1. **One assertion per test** - Makes failures easier to diagnose
2. **Descriptive test names** - Should read like documentation
3. **Arrange-Act-Assert** - Clear test structure
4. **Test edge cases** - Empty arrays, null values, boundaries
5. **Use mock data** - Predictable, repeatable test data
6. **Independent tests** - No shared state between tests
7. **Fast tests** - Unit tests should run in milliseconds

## Test Maintenance

- Update tests when adding new features
- Remove tests for deprecated features
- Keep mock data in sync with types
- Review test coverage regularly
- Refactor tests to reduce duplication

## Support

For questions or issues with tests:
1. Check this README
2. Review existing tests for examples
3. Check test output for error messages
4. Open an issue with test failure details
