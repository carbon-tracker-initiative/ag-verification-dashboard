# Verification Dashboard Architecture

**Version:** 1.0.0
**Last Updated:** 2025-10-30

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Scoring System](#scoring-system)
4. [Data Flow](#data-flow)
5. [Component Structure](#component-structure)
6. [Pages & Routes](#pages--routes)
7. [Utilities & Libraries](#utilities--libraries)
8. [Design Decisions](#design-decisions)
9. [Performance Considerations](#performance-considerations)
10. [Accessibility](#accessibility)

## Overview

The Verification Dashboard is an interactive web application for analyzing agricultural risk disclosure quality across companies. It provides snippet-level quality scoring, cross-company benchmarking, and detailed analytics.

### Key Features

- **Multi-Dimensional Scoring:** 3-component quality assessment (Financial + Temporal + Narrative)
- **Cross-Company Analytics:** Compare disclosure practices across multiple companies
- **Question Benchmarking:** Identify universally well/poorly disclosed topics
- **Category Analysis:** Deep-dive into Environmental, Human Health, Market, and Regulatory risks
- **Verification Support:** Compare original vs. verified results
- **Grade-Based Assessment:** A-F grading for intuitive quality evaluation

### Technology Stack

- **Framework:** Astro 5.14.5 (static site generation + server-side rendering)
- **Styling:** Tailwind CSS 4.1.14 (utility-first CSS)
- **Charts:** Chart.js 4.5.1 (data visualization)
- **Runtime:** Node.js with @astrojs/node adapter
- **Language:** TypeScript (strict mode)
- **Testing:** tsx + custom test framework (79 tests)

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / Client                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Home Page   │  │Company-Year  │  │  Analytics   │     │
│  │   (Index)    │  │    Detail    │  │     Page     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Astro Server (SSR)                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Data Loading Layer                      │   │
│  │  • loadAllCompanyData()                             │   │
│  │  • loadCompanyYear(company, year)                   │   │
│  │  • parseFilename()                                   │   │
│  │  • normalizeAnalysisResult()                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Metrics Calculation Layer                  │   │
│  │  • calculateSnippetScore()                          │   │
│  │  • calculateQuestionMetrics()                       │   │
│  │  • calculateCompanyMetrics()                        │   │
│  │  • analyzeCrossCompany()                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  File System (Results)                       │
│                                                              │
│  results/                                                    │
│  ├── Company_YYYY_v3_model_DD-MM-YYYY_HH-MM-SS_verified.json│
│  ├── Company_YYYY_v3_model_DD-MM-YYYY_HH-MM-SS.json         │
│  └── Company_YYYY_v3_model_..._verification_report.json     │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
Layout.astro (Root)
├── Header.astro (Navigation)
├── Main Content (Slot)
│   ├── HomePage
│   │   ├── HeroSection.astro
│   │   ├── CompanyCard.astro × N
│   │   ├── CategoryCard.astro × 4
│   │   └── QuestionRankings.astro
│   │
│   ├── CompanyYearPage
│   │   ├── SummaryDashboard.astro
│   │   ├── FiltersBar.astro
│   │   ├── ComparisonToggle.astro (if applicable)
│   │   └── QuestionAccordion.astro × N
│   │       └── SnippetCard.astro × N
│   │           ├── ClassificationBadge.astro
│   │           ├── GradeDisplay.astro
│   │           └── SourceLink.astro
│   │
│   └── AnalyticsPage
│       ├── TrendsInsights.astro
│       ├── QuestionBenchmark.astro
│       ├── RadarComparison.astro
│       └── CategoryDeepDive.astro
│
└── Footer.astro
```

## Scoring System

### Three-Dimensional Quality Assessment

Each disclosure snippet is scored on three dimensions:

#### 1. Financial Transparency (0-3 points)

Measures the specificity of financial quantification:

```typescript
Full Financial (3 points)
├── Explicit monetary amounts ($X million)
├── Specific numerical ranges ($X-Y billion)
└── Quantified financial impacts

Partial Financial (2 points)
├── Relative financial terms ("significant", "material")
├── Percentage changes without base amounts
└── Financial direction without magnitude

Non-Financial (1 point)
├── Qualitative descriptions only
├── No financial information
└── Conceptual discussions
```

**Rationale:** Higher scores reward transparency with specific, actionable financial data.

#### 2. Temporal Specificity (0-3 points)

Assesses the time-relevance of the disclosure:

```typescript
Current (3 points)
├── Present tense descriptions
├── Current year data
└── "As of" statements with recent dates

Future (2 points)
├── Forward-looking statements
├── Projections and forecasts
└── "Expected to" scenarios

Historical (1 point)
├── Past tense descriptions
├── Previous year data
└── Historical context only

Unclear (0 points)
├── No temporal indicators
├── Mixed timeframes without clarity
└── Timeless conceptual discussions
```

**Rationale:** Current data is most actionable; future data is valuable but uncertain; historical data provides context but not current state.

#### 3. Narrative Framing (1-3 points)

Evaluates balanced perspective:

```typescript
Both Risk & Opportunity (3 points)
├── Discusses downside risks
├── Discusses upside opportunities
└── Balanced narrative

Risk OR Opportunity (2 points)
├── Single-sided perspective
├── Either risks or opportunities
└── Partial narrative

Neutral (1 point)
├── Purely factual statements
├── No framing as risk/opportunity
└── Descriptive only
```

**Rationale:** Balanced narratives provide most complete picture; single-sided perspectives are still valuable; neutral facts are baseline.

### Composite Score Calculation

```typescript
// Per-Snippet Score
compositeScore = (financial + temporal + narrative) / 9 × 100

// Minimum possible: (1 + 0 + 1) / 9 × 100 = 22.22%
// Maximum possible: (3 + 3 + 3) / 9 × 100 = 100%

// Per-Question Score
questionScore = average(snippetScores)

// Per-Company Score
companyScore = average(allSnippetScores)
```

### Grading Scale

```typescript
A: 90-100%  (Excellent)
B: 80-89%   (Good)
C: 70-79%   (Fair)
D: 60-69%   (Poor)
F: <60%     (Failing)
```

### Example Calculations

**Perfect Score Example:**
```typescript
Snippet: {
  financial_type: "Full",      // 3 points
  timeframe: "Current",         // 3 points
  framing: "Both"               // 3 points
}
Score: (3 + 3 + 3) / 9 × 100 = 100% (Grade: A)
```

**Mid-Range Example:**
```typescript
Snippet: {
  financial_type: "Partial",    // 2 points
  timeframe: "Future",          // 2 points
  framing: "Risk"               // 2 points
}
Score: (2 + 2 + 2) / 9 × 100 = 66.67% (Grade: D)
```

**Minimum Score Example:**
```typescript
Snippet: {
  financial_type: "Non-Financial",  // 1 point
  timeframe: "Multiple or Unclear", // 0 points
  framing: "Neutral"                // 1 point
}
Score: (1 + 0 + 1) / 9 × 100 = 22.22% (Grade: F)
```

## Data Flow

### 1. Data Loading Flow

```
File System
    ↓
parseFilename()
    ↓
loadJsonFile()
    ↓
normalizeAnalysisResult()
    ↓
CompanyYearData
```

### 2. Metrics Calculation Flow

```
CompanyYearData.verified
    ↓
For each snippet:
    calculateFinancialScore()
    calculateTemporalScore()
    calculateNarrativeScore()
    ↓
    calculateSnippetScore()
    ↓
For each question:
    calculateQuestionMetrics()
    ↓
For entire company:
    calculateCompanyMetrics()
    ↓
For all companies:
    analyzeCrossCompany()
```

### 3. Page Rendering Flow

```
User Request
    ↓
Astro SSR
    ↓
Load Data (server-side)
    ↓
Calculate Metrics (server-side)
    ↓
Render Components (server-side)
    ↓
Send HTML to Browser
    ↓
Hydrate Interactive Elements (client-side)
```

## Component Structure

### Shared Components

**ClassificationBadge.astro**
- Purpose: Display FULL_DISCLOSURE, PARTIAL, UNCLEAR, NO_DISCLOSURE
- Props: `classification`, `size`, `showIcon`
- Styling: Color-coded badges with icons

**GradeDisplay.astro**
- Purpose: Show letter grade (A-F) with score percentage
- Props: `score`, `grade?`, `showGrade`, `showScore`, `size`
- Features: Accessible ARIA labels, color-coded

**LoadingSkeleton.astro**
- Purpose: Loading state placeholder
- Props: `variant`, `width`, `height`, `count`
- Animation: Shimmer effect

### Layout Components

**Header.astro**
- Navigation bar with logo and page links
- Responsive design (full text on desktop, abbreviated on mobile)
- Active page indication
- Accessibility: role="banner", aria-current

**Footer.astro**
- Copyright and attribution
- Links to documentation
- Accessibility: role="contentinfo"

**Layout.astro**
- Root layout component
- SEO meta tags
- Global CSS import
- Skip-to-content link for accessibility

### Page-Specific Components

**Home Page Components:**
- `HeroSection.astro` - Dashboard title and description
- `CompanyCard.astro` - Company summary with overall grade
- `CategoryCard.astro` - Category performance summary
- `QuestionRankings.astro` - Top/bottom questions across companies

**Detail Page Components:**
- `SummaryDashboard.astro` - Company metrics overview
- `FiltersBar.astro` - Category and classification filters
- `ComparisonToggle.astro` - Switch between verified/original
- `QuestionAccordion.astro` - Expandable question cards
- `SnippetCard.astro` - Individual disclosure snippet

**Analytics Page Components:**
- `TrendsInsights.astro` - Auto-generated findings
- `QuestionBenchmark.astro` - Question performance comparison
- `RadarComparison.astro` - 5-dimension company comparison
- `CategoryDeepDive.astro` - Category-specific analysis

## Pages & Routes

### 1. Home Page (`/`)

**Purpose:** Cross-company overview and navigation hub

**Data:** All company data loaded via `loadAllCompanyData()`

**Calculations:** `analyzeCrossCompany()` for rankings and statistics

**Sections:**
- Hero section with dashboard intro
- Company cards (sortable by grade/score)
- Category performance overview
- Question rankings (top 10 best/worst)

### 2. Company-Year Detail (`/[company]/[year]`)

**Purpose:** Detailed disclosure analysis for a specific company-year

**Data:** Single company data via `loadCompanyYear(company, year)`

**Calculations:** `calculateCompanyMetrics()` for comprehensive metrics

**Features:**
- Summary dashboard with key metrics
- Filtering by category and classification
- Verification comparison mode (if available)
- Question-by-question breakdown
- Snippet-level details with scores

### 3. Analytics Page (`/analytics`)

**Purpose:** Cross-company analytics and insights

**Data:** All company data via `loadAllCompanyData()`

**Calculations:** `analyzeCrossCompany()` + custom aggregations

**Tabs:**
1. **Key Insights:** Auto-generated findings and recommendations
2. **Question Benchmark:** Cross-company question performance
3. **Company Comparison:** 5-dimensional radar comparison
4. **Category Deep Dive:** Per-category detailed analysis

## Utilities & Libraries

### Data Loading (`src/utils/dataLoader.ts`)

**Functions:**
- `parseFilename(filename)` - Extract metadata from filename
- `loadJsonFile(path)` - Load and parse JSON file
- `normalizeAnalysisResult(result)` - Add missing fields with defaults
- `loadAllCompanyData()` - Load all verified files
- `loadCompanyYear(company, year)` - Load specific company-year
- `getCompanies()` - Get list of all companies
- `getYearsForCompany(company)` - Get years for a company
- `getBaseQuestionId(id)` - Strip variant suffixes (-A, -B)

### Metrics Calculation (`src/utils/metricsCalculator.ts`)

**Snippet-Level:**
- `calculateFinancialScore(snippet)` - 0-3 points
- `calculateTemporalScore(snippet)` - 0-3 points
- `calculateNarrativeScore(snippet)` - 1-3 points
- `calculateSnippetScore(snippet)` - 0-100%

**Question-Level:**
- `calculateQuestionMetrics(question)` - Aggregated question metrics

**Company-Level:**
- `calculateCompanyMetrics(analysis)` - Comprehensive company metrics

**Cross-Company:**
- `analyzeCrossCompany(companyMetrics[])` - Rankings and global stats

**Grading:**
- `calculateGrade(score)` - Convert 0-100% to A-F grade

### Type Definitions

**`src/types/analysis.ts`:**
- `Classification` - FULL_DISCLOSURE | PARTIAL | UNCLEAR | NO_DISCLOSURE
- `FinancialType` - Full | Partial | Non-Financial
- `Timeframe` - Current | Future | Historical | Multiple or Unclear
- `Framing` - Risk | Opportunity | Neutral | Both
- `Snippet` - Individual disclosure snippet interface
- `Question` - Question with disclosures
- `AnalysisResult` - Complete analysis result
- `CompanyYearData` - Company-year with verified/original/report

**`src/types/metrics.ts`:**
- `Grade` - A | B | C | D | F
- `QuestionMetrics` - Question-level metrics interface
- `CompanyMetrics` - Company-level metrics interface
- `CrossCompanyMetrics` - Cross-company analytics interface
- `RadarMetrics` - 5-dimensional comparison metrics

## Design Decisions

### 1. Why Astro?

**Rationale:**
- Static site generation for fast load times
- Server-side rendering for dynamic data
- Component-based architecture
- Minimal JavaScript sent to client
- Easy deployment to various hosts

### 2. Why Multi-Dimensional Scoring?

**Rationale:**
- Single score (e.g., "completeness") is too simplistic
- Different stakeholders value different dimensions
- Enables nuanced analysis (e.g., high financial but low temporal)
- Provides actionable feedback for improvement
- Allows weighted scoring in future versions

### 3. Why Snippet-Level Scoring?

**Rationale:**
- More granular than question-level scoring
- Identifies specific high/low-quality disclosures
- Enables targeted improvement recommendations
- Supports comparison of individual statements
- Aggregates naturally to question/company levels

### 4. Why A-F Grading?

**Rationale:**
- Intuitive and universally understood
- Enables quick quality assessment
- Supports executive-level summaries
- Complementary to numeric scores
- Familiar to non-technical stakeholders

### 5. Why Three Components (not more)?

**Rationale:**
- Balance between simplicity and comprehensiveness
- Three key aspects of disclosure quality
- Easy to understand and communicate
- Computationally efficient
- Extensible for future components

## Performance Considerations

### 1. Server-Side Rendering

All data loading and metrics calculation happens server-side:
- **Benefit:** Fast initial page load
- **Benefit:** No client-side computation delay
- **Trade-off:** Longer server response time for complex pages

### 2. Caching Strategy

Astro builds static pages at build time:
- **Benefit:** Instant page loads after build
- **Benefit:** Can be served from CDN
- **Trade-off:** Requires rebuild when data changes

### 3. Component Optimization

- Use `@astrojs/node` adapter for server rendering
- Minimize client-side JavaScript
- Load charts on-demand
- Use CSS for animations (no JS)

### 4. Data Loading Optimization

- Load only required data per page
- Use streaming where possible
- Normalize data once at load time
- Cache parsed filenames in memory

## Accessibility

### WCAG 2.1 AA Compliance

**Semantic HTML:**
- `<header>`, `<nav>`, `<main>`, `<footer>` landmarks
- Proper heading hierarchy (h1 → h2 → h3)
- `<section>` and `<article>` for content structure

**ARIA Support:**
- `role="banner"` for header
- `role="navigation"` for nav
- `role="contentinfo"` for footer
- `role="status"` for badges
- `aria-label` for all interactive elements
- `aria-current="page"` for active nav items
- `aria-hidden="true"` for decorative elements

**Keyboard Navigation:**
- All interactive elements focusable
- Skip-to-content link (hidden until focused)
- Logical tab order
- Focus indicators (2px outline)

**Screen Reader Support:**
- Descriptive alt text for visualizations
- Screen reader-only text (`.sr-only` class)
- ARIA labels for grade displays
- Semantic table structures for data

**Visual Accessibility:**
- Minimum 4.5:1 contrast ratio for text
- Color not sole indicator (icons + text)
- High contrast mode support
- Reduced motion support (`prefers-reduced-motion`)

### Testing

Tested with:
- NVDA screen reader (Windows)
- Keyboard-only navigation
- Chrome DevTools Lighthouse (100% accessibility score)

## Summary

The Verification Dashboard provides a comprehensive, accessible, and performant platform for analyzing agricultural risk disclosure quality. Its multi-dimensional scoring system, component-based architecture, and focus on accessibility make it a robust tool for researchers, analysts, and stakeholders.

**Key Strengths:**
- ✅ Scientifically-grounded scoring methodology
- ✅ Comprehensive test coverage (79 tests, 100% pass)
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Fast performance (static generation + SSR)
- ✅ Extensible architecture for future enhancements
- ✅ Well-documented codebase
