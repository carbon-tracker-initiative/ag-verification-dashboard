# API Documentation

**Version:** 1.0.0

Complete reference for all utilities, functions, and types in the Verification Dashboard.

## Table of Contents

1. [Data Loading API](#data-loading-api)
2. [Metrics Calculation API](#metrics-calculation-api)
3. [Type Definitions](#type-definitions)
4. [Test Utilities](#test-utilities)

## Data Loading API

**Module:** `src/utils/dataLoader.ts`

### Functions

#### `parseFilename(filename: string): ParsedFilename | null`

Extracts metadata from a results filename.

**Parameters:**
- `filename` - Filename string to parse

**Returns:**
- `ParsedFilename` object if successful
- `null` if filename cannot be parsed

**Format Expected:**
```
CompanyName_YYYY_v3_model-name_DD-MM-YYYY_HH-MM-SS[_verified|_verification_report].json
```

**Example:**
```typescript
const parsed = parseFilename('Bayer_2022_v3_gemini-2-5-flash_15-01-2025_14-30-45_verified.json');
// Returns:
// {
//   company: 'Bayer',
//   year: 2022,
//   version: 'v3',
//   model: 'gemini-2-5-flash',
//   timestamp: '15-01-2025_14-30-45',
//   isVerified: true,
//   isReport: false
// }
```

**Edge Cases:**
- Returns `null` for invalid filenames
- Missing time component defaults to '00-00-00'
- Handles company names with hyphens
- Warns to console if parsing fails

---

#### `loadJsonFile(filePath: string): Promise<AnalysisResult | any>`

Loads and parses a JSON file.

**Parameters:**
- `filePath` - Absolute path to JSON file

**Returns:**
- Promise resolving to parsed JSON object

**Throws:**
- Error if file cannot be read or JSON is invalid

**Example:**
```typescript
const data = await loadJsonFile('/path/to/results/file.json');
```

---

#### `normalizeAnalysisResult(result: any): AnalysisResult`

Ensures all required fields exist with defaults.

**Parameters:**
- `result` - Raw analysis result object

**Returns:**
- Normalized `AnalysisResult` with all fields

**Normalization:**
- Adds empty `analysis_results` array if missing
- Adds empty `disclosures` arrays to questions if missing
- Adds empty `financial_amounts` arrays to snippets if missing
- Adds default `categorization` to snippets if missing:
  ```typescript
  {
    framing: "Neutral",
    framing_justification: "",
    financial_type: "Non-Financial",
    financial_justification: "",
    timeframe: "Multiple or Unclear",
    timeframe_justification: ""
  }
  ```

**Example:**
```typescript
const raw = { /* incomplete data */ };
const normalized = normalizeAnalysisResult(raw);
// Now safe to access normalized.analysis_results, etc.
```

---

#### `loadAllCompanyData(): Promise<CompanyYearData[]>`

Loads all verified company data from results folder.

**Parameters:** None

**Returns:**
- Promise resolving to array of `CompanyYearData` objects

**Behavior:**
- Searches `../../results/` directory
- Filters for files ending with `_verified.json`
- Excludes `_verification_report` files
- Groups by company-year-model
- Attempts to load matching original and report files
- Returns empty array if results folder doesn't exist

**Example:**
```typescript
const allData = await loadAllCompanyData();
allData.forEach(company => {
  console.log(`${company.company} (${company.year}): Grade ${company.verified.overall_grade}`);
});
```

---

#### `loadCompanyYear(company: string, year: number): Promise<CompanyYearData | null>`

Loads data for a specific company and year.

**Parameters:**
- `company` - Company name (case-insensitive)
- `year` - Fiscal year

**Returns:**
- Promise resolving to `CompanyYearData` or `null` if not found

**Example:**
```typescript
const bayer2022 = await loadCompanyYear('Bayer', 2022);
if (bayer2022) {
  console.log(`Found data for ${bayer2022.company}`);
}
```

---

#### `getCompanies(): Promise<string[]>`

Gets list of all unique company names.

**Parameters:** None

**Returns:**
- Promise resolving to sorted array of company names

**Example:**
```typescript
const companies = await getCompanies();
// ['Bayer', 'Corteva', 'Syngenta', ...]
```

---

#### `getYearsForCompany(company: string): Promise<number[]>`

Gets all available years for a company.

**Parameters:**
- `company` - Company name (case-insensitive)

**Returns:**
- Promise resolving to array of years (descending order)

**Example:**
```typescript
const years = await getYearsForCompany('Bayer');
// [2024, 2023, 2022, ...]
```

---

#### `getBaseQuestionId(questionId: string): string`

Removes variant suffixes from question IDs.

**Parameters:**
- `questionId` - Question ID string

**Returns:**
- Base question ID without variant suffix

**Behavior:**
- Strips `-A`, `-B`, etc. suffixes
- Preserves internal hyphens
- Returns unchanged if no suffix

**Example:**
```typescript
getBaseQuestionId('ENV-001-A'); // Returns 'ENV-001'
getBaseQuestionId('ENV-RISK-001-B'); // Returns 'ENV-RISK-001'
getBaseQuestionId('ENV-001'); // Returns 'ENV-001'
```

---

## Metrics Calculation API

**Module:** `src/utils/metricsCalculator.ts`

### Snippet-Level Functions

#### `calculateFinancialScore(snippet: Snippet): number`

Calculates financial transparency score.

**Parameters:**
- `snippet` - Disclosure snippet object

**Returns:**
- Score: 0-3

**Scoring:**
- `Full`: 3 points
- `Partial`: 2 points
- `Non-Financial`: 1 point

**Example:**
```typescript
const snippet = { categorization: { financial_type: 'Full', ... }, ... };
const score = calculateFinancialScore(snippet); // Returns 3
```

---

#### `calculateTemporalScore(snippet: Snippet): number`

Calculates temporal specificity score.

**Parameters:**
- `snippet` - Disclosure snippet object

**Returns:**
- Score: 0-3

**Scoring:**
- `Current`: 3 points
- `Future`: 2 points
- `Historical`: 1 point
- `Multiple or Unclear`: 0 points

**Example:**
```typescript
const snippet = { categorization: { timeframe: 'Current', ... }, ... };
const score = calculateTemporalScore(snippet); // Returns 3
```

---

#### `calculateNarrativeScore(snippet: Snippet): number`

Calculates narrative framing score.

**Parameters:**
- `snippet` - Disclosure snippet object

**Returns:**
- Score: 1-3

**Scoring:**
- `Both`: 3 points
- `Risk` or `Opportunity`: 2 points
- `Neutral`: 1 point

**Example:**
```typescript
const snippet = { categorization: { framing: 'Both', ... }, ... };
const score = calculateNarrativeScore(snippet); // Returns 3
```

---

#### `calculateSnippetScore(snippet: Snippet): number`

Calculates composite snippet score (0-100%).

**Parameters:**
- `snippet` - Disclosure snippet object

**Returns:**
- Score: 0-100 (percentage)

**Formula:**
```
(financial + temporal + narrative) / 9 × 100
```

**Example:**
```typescript
const snippet = {
  categorization: {
    financial_type: 'Full',     // 3 points
    timeframe: 'Current',        // 3 points
    framing: 'Both'              // 3 points
  },
  // ... other fields
};
const score = calculateSnippetScore(snippet); // Returns 100
```

---

### Grading Functions

#### `calculateGrade(score: number): Grade`

Converts numeric score to letter grade.

**Parameters:**
- `score` - Numeric score (0-100)

**Returns:**
- Grade: 'A' | 'B' | 'C' | 'D' | 'F'

**Thresholds:**
- A: 90-100
- B: 80-89
- C: 70-79
- D: 60-69
- F: 0-59

**Example:**
```typescript
calculateGrade(95);  // Returns 'A'
calculateGrade(85);  // Returns 'B'
calculateGrade(55);  // Returns 'F'
```

---

### Aggregation Functions

#### `calculateQuestionMetrics(question: Question): QuestionMetrics`

Calculates comprehensive metrics for a question.

**Parameters:**
- `question` - Question object with disclosures

**Returns:**
- `QuestionMetrics` object

**Metrics Included:**
- `average_snippet_score` - Mean score of all snippets
- `best_snippet_score` - Highest scoring snippet
- `best_snippet_id` - ID of highest scoring snippet
- `snippets_by_classification` - Count by classification type
- `financial_quantification_rate` - % with financial data
- `forward_looking_rate` - % with future timeframe
- `narrative_balance_rate` - % with balanced framing
- `disclosure_quality_grade` - Letter grade for question

**Example:**
```typescript
const metrics = calculateQuestionMetrics(question);
console.log(`Average score: ${metrics.average_snippet_score}%`);
console.log(`Grade: ${metrics.disclosure_quality_grade}`);
```

---

#### `calculateCategoryMetrics(questions: Question[], categoryName: string): CategoryMetrics`

Calculates metrics for a category across questions.

**Parameters:**
- `questions` - Array of all questions
- `categoryName` - Category to analyze

**Returns:**
- `CategoryMetrics` object

**Metrics Included:**
- `average_question_score` - Mean score across category questions
- `total_questions` - Number of questions in category
- `questions_answered` - Questions with disclosures
- `total_snippets` - Total snippet count
- `top_questions` - Best 5 questions in category
- `bottom_questions` - Worst 5 questions in category
- `category_grade` - Letter grade for category

**Example:**
```typescript
const envMetrics = calculateCategoryMetrics(allQuestions, 'Environmental Risk');
console.log(`Environmental Risk: ${envMetrics.average_question_score}%`);
```

---

#### `calculateCompanyMetrics(analysisResult: AnalysisResult): CompanyMetrics`

Calculates comprehensive company-level metrics.

**Parameters:**
- `analysisResult` - Complete analysis result for company-year

**Returns:**
- `CompanyMetrics` object

**Metrics Included:**
- `overall_disclosure_score` - Mean score across all snippets
- `overall_grade` - Letter grade for company
- `category_scores` - Scores per category
- `total_questions_analyzed` - Total questions
- `total_questions_answered` - Questions with disclosures
- `total_snippets` - Total snippet count
- `classification_percentages` - % by classification type
- `financial_quantification_rate` - % with financial data
- `forward_looking_rate` - % with future timeframe
- `narrative_balance_rate` - % with balanced framing
- `radar_metrics` - 5-dimensional comparison metrics
- `top_questions` - Top 10 questions
- `bottom_questions` - Bottom 10 questions

**Example:**
```typescript
const metrics = calculateCompanyMetrics(analysisResult);
console.log(`${metrics.company_name} (${metrics.fiscal_year})`);
console.log(`Overall: ${metrics.overall_grade} (${metrics.overall_disclosure_score}%)`);
console.log(`Questions answered: ${metrics.total_questions_answered}/${metrics.total_questions_analyzed}`);
```

---

#### `analyzeCrossCompany(companyMetrics: CompanyMetrics[]): CrossCompanyMetrics`

Analyzes patterns across all companies.

**Parameters:**
- `companyMetrics` - Array of company metrics

**Returns:**
- `CrossCompanyMetrics` object

**Metrics Included:**
- `question_rankings` - Questions ranked by average score
- `company_rankings` - Companies ranked by overall score
- `category_rankings` - Categories ranked by average score
- `global_stats` - Industry-wide statistics

**Example:**
```typescript
const allMetrics = companies.map(c => calculateCompanyMetrics(c.verified));
const crossCompany = analyzeCrossCompany(allMetrics);

console.log('Top 3 Companies:');
crossCompany.company_rankings.slice(0, 3).forEach((c, i) => {
  console.log(`${i + 1}. ${c.company_name}: ${c.grade} (${c.overall_score}%)`);
});
```

---

## Type Definitions

### Core Types (`src/types/analysis.ts`)

#### `Classification`

```typescript
type Classification =
  | "FULL_DISCLOSURE"
  | "PARTIAL"
  | "UNCLEAR"
  | "NO_DISCLOSURE";
```

Qualitative assessment of disclosure completeness.

---

#### `FinancialType`

```typescript
type FinancialType =
  | "Full"
  | "Partial"
  | "Non-Financial";
```

Level of financial quantification.

---

#### `Timeframe`

```typescript
type Timeframe =
  | "Current"
  | "Future"
  | "Historical"
  | "Multiple or Unclear";
```

Temporal specificity of disclosure.

---

#### `Framing`

```typescript
type Framing =
  | "Risk"
  | "Opportunity"
  | "Neutral"
  | "Both";
```

Narrative perspective (risk/opportunity).

---

#### `FinancialAmount`

```typescript
interface FinancialAmount {
  amount: number;
  currency: string;
  context: string;
}
```

Monetary value extracted from disclosure.

**Fields:**
- `amount` - Numeric value
- `currency` - Currency code (e.g., "USD")
- `context` - Explanatory text

---

#### `Categorization`

```typescript
interface Categorization {
  financial_type: FinancialType;
  financial_justification: string;
  timeframe: Timeframe;
  timeframe_justification: string;
  framing: Framing;
  framing_justification: string;
}
```

Three-dimensional categorization with justifications.

---

#### `Snippet`

```typescript
interface Snippet {
  snippet_id: string;
  quote: string;
  source: string;
  classification: Classification;
  classification_justification: string;
  categorization: Categorization;
  financial_amounts: FinancialAmount[];
}
```

Individual disclosure snippet.

---

#### `Question`

```typescript
interface Question {
  question_id: string;
  question_text: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  disclosures: Snippet[];
  summary: string;
}
```

Question with associated disclosure snippets.

---

#### `AnalysisResult`

```typescript
interface AnalysisResult {
  company_name: string;
  fiscal_year: number;
  analysis_date: string;
  model_used: string;
  total_questions: number;
  documents_analyzed: string[];
  analysis_results: Question[];
}
```

Complete analysis result for a company-year.

---

#### `ParsedFilename`

```typescript
interface ParsedFilename {
  company: string;
  year: number;
  version: string;
  model: string;
  timestamp: string;
  isVerified: boolean;
  isReport: boolean;
}
```

Metadata extracted from filename.

---

#### `CompanyYearData`

```typescript
interface CompanyYearData {
  company: string;
  year: number;
  model: string;
  verified: AnalysisResult;
  original?: AnalysisResult;
  verificationReport?: any;
  hasComparison: boolean;
}
```

Company-year with verified, original, and report data.

---

### Metrics Types (`src/types/metrics.ts`)

#### `Grade`

```typescript
type Grade = "A" | "B" | "C" | "D" | "F";
```

Letter grade for quality assessment.

---

#### `QuestionMetrics`

```typescript
interface QuestionMetrics {
  question_id: string;
  question_text: string;
  category: string;
  total_snippets: number;
  snippets_by_classification: Record<Classification, number>;
  average_snippet_score: number;
  best_snippet_score: number;
  best_snippet_id: string;
  snippets_with_financial_data: number;
  financial_quantification_rate: number;
  total_financial_amount: number;
  snippets_current: number;
  snippets_future: number;
  snippets_historical: number;
  snippets_unclear_time: number;
  forward_looking_rate: number;
  snippets_balanced: number;
  snippets_risk: number;
  snippets_opportunity: number;
  snippets_neutral: number;
  narrative_balance_rate: number;
  evidence_depth: number;
  disclosure_quality_grade: Grade;
}
```

Comprehensive metrics for a single question.

---

#### `CategoryMetrics`

```typescript
interface CategoryMetrics {
  category_name: string;
  total_questions: number;
  questions_answered: number;
  average_question_score: number;
  average_evidence_depth: number;
  average_financial_rate: number;
  average_forward_looking_rate: number;
  average_narrative_balance_rate: number;
  total_snippets: number;
  snippets_by_classification: Record<Classification, number>;
  total_financial_amount: number;
  snippets_with_financial_full: number;
  snippets_with_financial_partial: number;
  snippets_with_financial_none: number;
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
  category_grade: Grade;
}
```

Aggregated metrics for a risk category.

---

#### `CompanyMetrics`

```typescript
interface CompanyMetrics {
  company_name: string;
  fiscal_year: number;
  model_used: string;
  overall_disclosure_score: number;
  overall_grade: Grade;
  category_scores: Record<string, number>;
  total_questions_analyzed: number;
  total_questions_answered: number;
  total_snippets: number;
  average_snippets_per_question: number;
  snippets_by_classification: Record<Classification, number>;
  classification_percentages: Record<Classification, number>;
  financial_quantification_rate: number;
  snippets_with_financial_full: number;
  snippets_with_financial_partial: number;
  snippets_with_financial_none: number;
  total_financial_amount_usd: number;
  forward_looking_rate: number;
  snippets_current: number;
  snippets_future: number;
  snippets_historical: number;
  snippets_unclear_time: number;
  narrative_balance_rate: number;
  snippets_balanced: number;
  snippets_risk: number;
  snippets_opportunity: number;
  snippets_neutral: number;
  radar_metrics: RadarMetrics;
  top_questions: Array<{
    question_id: string;
    question_text: string;
    score: number;
    grade: Grade;
  }>;
  bottom_questions: Array<{
    question_id: string;
    question_text: string;
    score: number;
    grade: Grade;
  }>;
  verification_metadata?: any;
}
```

Comprehensive metrics for a company-year.

---

#### `RadarMetrics`

```typescript
interface RadarMetrics {
  financial_transparency: number;
  temporal_clarity: number;
  narrative_balance: number;
  evidence_depth: number;
  disclosure_breadth: number;
}
```

Five-dimensional comparison metrics (0-100 scale).

---

#### `CrossCompanyMetrics`

```typescript
interface CrossCompanyMetrics {
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
  company_rankings: Array<{
    company_name: string;
    overall_score: number;
    grade: Grade;
    ranking: number;
  }>;
  category_rankings: Array<{
    category_name: string;
    average_score_across_companies: number;
    total_snippets: number;
    average_evidence_depth: number;
    ranking: number;
  }>;
  global_stats: {
    total_companies: number;
    total_questions: number;
    total_snippets: number;
    average_disclosure_score_all: number;
    average_financial_rate_all: number;
    average_forward_looking_rate_all: number;
  };
}
```

Cross-company analytics and rankings.

---

## Test Utilities

**Module:** `tests/utils/testHelpers.ts`

### `TestResults`

Class for tracking test pass/fail status.

**Methods:**

```typescript
class TestResults {
  passed: number;
  failed: number;
  tests: Array<{ name: string; passed: boolean; error?: string }>;

  addTest(name: string, passed: boolean, error?: string): void;
  print(): void;
  get allPassed(): boolean;
}
```

**Example:**
```typescript
const results = new TestResults();
results.addTest('Test name', true);
results.print(); // Displays formatted results
```

---

### Assertion Functions

#### `assert(condition: boolean, message: string): void`

Basic assertion.

**Throws:** Error if condition is false

```typescript
assert(value > 0, 'Value must be positive');
```

---

#### `assertEqual<T>(actual: T, expected: T, message: string): void`

Equality assertion.

**Throws:** Error if actual !== expected

```typescript
assertEqual(result, 100, 'Should equal 100');
```

---

#### `assertClose(actual: number, expected: number, tolerance: number, message: string): void`

Floating-point comparison.

**Throws:** Error if difference exceeds tolerance

```typescript
assertClose(66.67, 66.666, 0.01, 'Should be approximately 66.67');
```

---

#### `assertInRange(value: number, min: number, max: number, message: string): void`

Range validation.

**Throws:** Error if value outside range

```typescript
assertInRange(score, 0, 100, 'Score should be between 0 and 100');
```

---

### Mock Data Generators

#### `createMockSnippet(overrides?: Partial<Snippet>): Snippet`

Creates a test snippet with defaults.

```typescript
const snippet = createMockSnippet({
  categorization: { financial_type: 'Full', ... }
});
```

---

#### `createMockQuestion(overrides?: Partial<Question>): Question`

Creates a test question with defaults.

```typescript
const question = createMockQuestion({
  disclosures: [snippet1, snippet2]
});
```

---

#### `createMockAnalysisResult(overrides?: Partial<AnalysisResult>): AnalysisResult`

Creates a test analysis result with defaults.

```typescript
const analysis = createMockAnalysisResult({
  company_name: 'Test Company',
  fiscal_year: 2024
});
```

---

### Test Runner

#### `runTest(name: string, fn: () => void | Promise<void>, results: TestResults): Promise<void>`

Executes a test and records result.

```typescript
await runTest('Test description', () => {
  const result = functionUnderTest();
  assertEqual(result, expected, 'Should match');
}, results);
```

---

## Usage Examples

### Complete Analysis Workflow

```typescript
import { loadAllCompanyData } from './utils/dataLoader';
import { calculateCompanyMetrics, analyzeCrossCompany } from './utils/metricsCalculator';

// Load all companies
const companies = await loadAllCompanyData();

// Calculate metrics for each
const allMetrics = companies.map(company =>
  calculateCompanyMetrics(company.verified)
);

// Cross-company analysis
const crossCompany = analyzeCrossCompany(allMetrics);

// Display results
console.log('Top 5 Companies:');
crossCompany.company_rankings.slice(0, 5).forEach((c, i) => {
  console.log(`${i + 1}. ${c.company_name}: ${c.grade} (${c.overall_score.toFixed(1)}%)`);
});

console.log('\nTop 5 Questions:');
crossCompany.question_rankings.slice(0, 5).forEach((q, i) => {
  console.log(`${i + 1}. ${q.question_text}: ${q.average_score_across_companies.toFixed(1)}%`);
});
```

---

**Version:** 1.0.0
**Last Updated:** 2025-10-30
