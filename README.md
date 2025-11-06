# Verification Dashboard

[![Tests](https://img.shields.io/badge/tests-62%20passing-brightgreen)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Astro](https://img.shields.io/badge/Astro-5.14.5-orange)](https://astro.build/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An interactive dashboard for analyzing agricultural risk disclosure quality through evidence-based analysis with multi-dimensional categorization and cross-company benchmarking.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Verification Dashboard provides comprehensive analysis of agricultural risk disclosures across multiple companies. It evaluates disclosure quality using an evidence-based approach with multi-dimensional categorization and presents insights through an accessible, performant web interface.

### Key Capabilities

- **Evidence-Based Analysis:** Evaluates disclosures on Financial Transparency, Temporal Specificity, and Narrative Framing
- **Classification System:** Categorizes each disclosure as Full, Partial, Unclear, or No Disclosure
- **Evidence Depth Metrics:** Measures thoroughness through snippet counts per question
- **Cross-Company Analytics:** Compare disclosure practices, identify leaders and laggards
- **Question Benchmarking:** Discover which questions are universally well or poorly disclosed
- **Category Deep-Dive:** Analyze Environmental, Human Health, Market, and Regulatory risks separately
- **Verification Support:** Compare original vs. verified results side-by-side
- **Distribution Metrics:** Track financial transparency, present-day vs. forward-looking temporal balance, and narrative framing rates
- **Excel Export:** Comprehensive 7-sheet reports with all metrics, perfect for presentations and further analysis
- **Version Support:** Track and compare different schema versions (v3, v4, etc.) with separate cards and routes

## Features

### Analysis System

The dashboard uses a multi-dimensional categorization system to analyze disclosure quality:

#### 1. Classification System

Each disclosure is classified by completeness:

- **FULL_DISCLOSURE** (Green): Complete, clear evidence addressing the question
- **PARTIAL** (Yellow): Incomplete or indirect evidence
- **UNCLEAR** (Orange): Ambiguous or difficult to assess
- **NO_DISCLOSURE** (Red): No evidence found for this question

#### 2. Evidence Depth

Evidence depth measures the number of supporting snippets per question:
- **Higher evidence depth** = More thorough documentation
- **Multiple snippets** = Comprehensive coverage
- **Zero snippets** = Disclosure gap

#### 3. Distribution Metrics

Three key metrics tracked as percentages:

Temporal analysis surfaces both the average present-day rate and the average forward-looking rate across all companies, highlighting how disclosures balance current status versus future commitments.

**Financial Transparency Rate**
- **Full Financial**: Explicit monetary amounts and specific ranges
- **Partial Financial**: Relative terms like "significant" or "material"
- **Non-Financial**: Qualitative descriptions only

**Forward-Looking Rate**
- **Forward-looking**: Future plans and projections
- **Present day**: Current year data
- **Historical**: Previous year data
- **Multiple/Unclear**: No clear temporal indicators

**Narrative Balance Rate**
- **Both**: Discusses risks and opportunities
- **Risk only**: Single-sided risk perspective
- **Opportunity only**: Single-sided opportunity perspective
- **Neutral**: Factual statements only

### Pages

1. **Home** - Cross-company overview with company cards, category summaries, and question rankings
2. **Company-Year Detail** - In-depth analysis with filterable questions and snippet-level categorization
3. **Analytics** - Cross-company insights with benchmarking, radar comparisons, and trends

### Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader optimized
- High contrast mode
- Reduced motion support

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd verification-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:4321
```

## Installation

### Prerequisites

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Results data:** JSON files in `../../results/` directory

### Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Verify data structure:**
   Ensure verified JSON files exist at `../../results/`:
   ```
   results/
   ├── Company_2024_v3_gemini-2-5-flash_DD-MM-YYYY_HH-MM-SS_verified.json
   ├── Company_2024_v3_gemini-2-5-flash_DD-MM-YYYY_HH-MM-SS.json (optional)
   └── Company_2024_v3_gemini-2-5-flash_..._verification_report.json (optional)
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Usage

### Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Excel Export

```bash
# Generate comprehensive Excel report (all data, 7 sheets)
npm run export:excel

# Export specific company
npm run export:excel -- --company Syngenta

# Export specific version
npm run export:excel -- --version v4

# Custom output path
npm run export:excel -- --output reports/my-report.xlsx
```

**📊 What gets exported:**
- Executive Summary with high-level statistics
- Company Details with full metrics
- Question Performance rankings
- Category Analysis breakdowns
- Snippet Raw Data for custom analysis
- Verification Reports
- Column Reference documentation

**📖 See the complete guide:** [Excel Export Guide](docs/EXCEL_EXPORT_GUIDE.md)

### Testing

```bash
# Run all tests (62 tests)
npm test

# Run specific test suites
npm run test:metrics      # Metrics calculation tests
npm run test:validation   # Data validation tests
npm run test:loader       # Data loader tests
npm run test:smoke        # Component smoke tests
```

### Adding New Company Data

1. Place verified JSON file in `../../results/`:
   ```
   CompanyName_YYYY_v3_model-name_DD-MM-YYYY_HH-MM-SS_verified.json
   ```

2. Rebuild the dashboard:
   ```bash
   npm run build
   ```

3. The new company will automatically appear on the home page

### Customization

#### Add New Risk Categories

Edit `src/config/categories.json` to add new risk categories:

```json
{
  "categories": [
    {
      "name": "Your New Category",
      "icon": "🆕",
      "color": "#yourcolor",
      "description": "Description of the category"
    }
  ]
}
```

#### Customize Styling

- **Global styles:** `src/styles/global.css`
- **Tailwind config:** `tailwind.config.mjs`
- **Colors:** Modify utility classes in components

## Project Structure

```
verification-dashboard/
├── src/
│   ├── components/
│   │   ├── shared/              # Reusable components
│   │   │   ├── ClassificationBadge.astro
│   │   │   └── LoadingSkeleton.astro
│   │   ├── layout/              # Layout components
│   │   │   ├── Header.astro
│   │   │   └── Footer.astro
│   │   ├── home/                # Home page components
│   │   ├── detail/              # Detail page components
│   │   └── analytics/           # Analytics page components
│   ├── layouts/
│   │   └── Layout.astro         # Root layout
│   ├── pages/
│   │   ├── index.astro          # Home page
│   │   ├── analytics.astro      # Analytics page
│   │   └── [company]/
│   │       └── [year].astro     # Company-year detail
│   ├── types/
│   │   ├── analysis.ts          # Core data types
│   │   └── metrics.ts           # Metrics types
│   ├── utils/
│   │   ├── dataLoader.ts        # Data loading functions
│   │   ├── metricsCalculator.ts # Metrics calculation functions
│   │   └── excelGenerator.ts    # Excel export functions
│   ├── scripts/
│   │   └── generateExcelReport.ts # Excel export CLI
│   ├── config/
│   │   └── categories.json      # Risk category configuration
│   └── styles/
│       └── global.css           # Global styles
├── tests/
│   ├── utils/
│   │   └── testHelpers.ts       # Test utilities
│   ├── metricsCalculator.test.ts
│   ├── dataValidation.test.ts
│   ├── dataLoader.test.ts
│   ├── components.smoke.test.ts
│   └── README.md                # Test documentation
├── docs/
│   └── EXCEL_EXPORT_GUIDE.md    # Excel export documentation
├── public/                       # Static assets
├── astro.config.mjs             # Astro configuration
├── tailwind.config.mjs          # Tailwind configuration
├── package.json
├── tsconfig.json
├── DASHBOARD.md                 # Architecture documentation
└── README.md                    # This file
```

## Development

### Tech Stack

- **Framework:** Astro 5.14.5
- **Styling:** Tailwind CSS 4.1.14
- **Visualization:** Chart.js 4.5.1
- **Runtime:** Node.js with @astrojs/node adapter
- **Language:** TypeScript (strict mode)
- **Testing:** tsx + custom test framework
- **Excel Export:** ExcelJS 4.4.0

### Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test:**
   ```bash
   npm run dev  # Start dev server
   npm test     # Run tests
   ```

3. **Build and preview:**
   ```bash
   npm run build
   npm run preview
   ```

4. **Commit with descriptive messages:**
   ```bash
   git add .
   git commit -m "feat: add new analytics component"
   ```

### Code Style

- **TypeScript:** Strict mode enabled
- **Components:** Use `.astro` for UI components
- **Utilities:** Pure functions with explicit types
- **Naming:** camelCase for functions/variables, PascalCase for types/components
- **Comments:** JSDoc for public APIs

### Adding New Features

#### Example: Add a New Component

1. Create component file:
   ```astro
   ---
   // src/components/shared/NewComponent.astro
   interface Props {
     data: string;
   }
   const { data } = Astro.props;
   ---
   <div>{data}</div>
   ```

2. Add smoke test:
   ```typescript
   // tests/components.smoke.test.ts
   await runTest('NewComponent: File exists', async () => {
     const content = await fs.readFile('src/components/shared/NewComponent.astro', 'utf-8');
     assert(content.length > 0);
   }, results);
   ```

3. Use in a page:
   ```astro
   ---
   import NewComponent from '@/components/shared/NewComponent.astro';
   ---
   <NewComponent data="Hello" />
   ```

## Testing

### Test Coverage

- **Total Tests:** 62
- **Pass Rate:** 100%
- **Coverage:**
  - Metrics calculation: 100%
  - Data validation: 100%
  - Data loading: 100%
  - Components: 100%

### Test Structure

```
tests/
├── utils/testHelpers.ts          # Shared test utilities
├── metricsCalculator.test.ts     # Unit tests for metrics calculation
├── dataValidation.test.ts        # Validation tests
├── dataLoader.test.ts            # Integration tests
└── components.smoke.test.ts      # Component tests
```

### Writing Tests

```typescript
import { TestResults, runTest, assert, assertEqual } from './utils/testHelpers';

const results = new TestResults();

await runTest('Test description', () => {
  // Arrange
  const input = createMockData();

  // Act
  const output = functionUnderTest(input);

  // Assert
  assertEqual(output, expectedValue, 'Should match expected');
}, results);

results.print();
process.exit(results.allPassed ? 0 : 1);
```

### Continuous Integration

Tests run automatically on:
- Pre-commit (via Git hooks, if configured)
- Pull requests (via CI/CD)
- Production builds

## Deployment

### Build for Production

```bash
npm run build
```

This generates a production-ready build in `dist/`.

### Deployment Options

#### Option 1: Static Hosting (Netlify, Vercel)

```bash
# Build command
npm run build

# Publish directory
dist/
```

#### Option 2: Node.js Server

```bash
# Build for SSR
npm run build

# Start server
node dist/server/entry.mjs
```

#### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
```

### Environment Variables

No environment variables required for basic deployment. Data is loaded from local `results/` directory.

### Performance Optimization

- Enable gzip compression
- Use CDN for static assets
- Implement caching headers
- Consider pre-rendering static pages

## Documentation

- **[USER_GUIDE.md](USER_GUIDE.md)** - End-user guide for navigating and interpreting the dashboard
- **[docs/EXCEL_EXPORT_GUIDE.md](docs/EXCEL_EXPORT_GUIDE.md)** - Complete Excel export guide with examples and troubleshooting
- **[DASHBOARD.md](DASHBOARD.md)** - Architecture and design decisions
- **[tests/README.md](tests/README.md)** - Testing documentation
- **[API.md](API.md)** - API and utilities documentation

## Contributing

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Contribution Guidelines

- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation as needed
- Follow existing code style
- Ensure accessibility standards are met

### Reporting Issues

Please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node version, etc.)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with [Astro](https://astro.build/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts powered by [Chart.js](https://www.chartjs.org/)
- Excel exports with [ExcelJS](https://github.com/exceljs/exceljs)

## Support

For questions or issues:
- Check existing [documentation](DASHBOARD.md)
- Review [test examples](tests/)
- Open an issue on GitHub

---

**Version:** 2.0.0
**Last Updated:** 2025-11-05
**Major Changes:** Removed scoring/grading system, focused on evidence-based analysis with classification, distribution metrics, and evidence depth.
