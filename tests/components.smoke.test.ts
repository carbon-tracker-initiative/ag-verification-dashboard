/**
 * Component Smoke Tests
 * Basic tests to ensure components can be imported and have valid structure
 */

import {
  TestResults,
  runTest,
  assert,
  assertEqual,
  colors
} from './utils/testHelpers';

const results = new TestResults();

// ==================== Shared Components ====================

await runTest('ClassificationBadge: File exists and exports', async () => {
  try {
    // Check that the file exists by attempting to read it
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/shared/ClassificationBadge.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
    assert(content.includes('Classification'), 'Should import Classification type');
    assert(content.includes('classification'), 'Should use classification prop');
  } catch (error) {
    throw new Error(`Failed to read ClassificationBadge component: ${error}`);
  }
}, results);

await runTest('LoadingSkeleton: File exists and exports', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/shared/LoadingSkeleton.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
    assert(content.includes('variant'), 'Should support variant prop');
    assert(content.includes('skeleton'), 'Should have skeleton classes');
  } catch (error) {
    throw new Error(`Failed to read LoadingSkeleton component: ${error}`);
  }
}, results);

// ==================== Layout Components ====================

await runTest('Header: File exists and has navigation', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/Header.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
    assert(content.includes('role="banner"'), 'Should have banner landmark');
    assert(content.includes('navigation'), 'Should have navigation');
  } catch (error) {
    throw new Error(`Failed to read Header component: ${error}`);
  }
}, results);

await runTest('Footer: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/Footer.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
  } catch (error) {
    throw new Error(`Failed to read Footer component: ${error}`);
  }
}, results);

await runTest('Layout: File exists and has main structure', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/layouts/Layout.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Layout file should have content');
    assert(content.includes('<html'), 'Should have HTML structure');
    assert(content.includes('main-content'), 'Should have main content area');
    assert(content.includes('skip-to-main'), 'Should have skip link');
  } catch (error) {
    throw new Error(`Failed to read Layout: ${error}`);
  }
}, results);

// ==================== Home Components ====================

await runTest('CompanyCard: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/home/CompanyCard.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
  } catch (error) {
    throw new Error(`Failed to read CompanyCard component: ${error}`);
  }
}, results);

// ==================== Analytics Components ====================

await runTest('QuestionBenchmark: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/analytics/QuestionBenchmark.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
    assert(content.includes('questions'), 'Should display questions');
  } catch (error) {
    throw new Error(`Failed to read QuestionBenchmark component: ${error}`);
  }
}, results);

await runTest('CategoryDeepDive: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/analytics/CategoryDeepDive.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
    assert(content.includes('category'), 'Should display category data');
  } catch (error) {
    throw new Error(`Failed to read CategoryDeepDive component: ${error}`);
  }
}, results);

await runTest('RadarComparison: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/analytics/RadarComparison.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
    assert(content.includes('dimensions'), 'Should display dimensions');
    assert(content.includes('comparison'), 'Should show comparison');
  } catch (error) {
    throw new Error(`Failed to read RadarComparison component: ${error}`);
  }
}, results);

await runTest('TrendsInsights: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/analytics/TrendsInsights.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
    assert(content.includes('insights'), 'Should display insights');
  } catch (error) {
    throw new Error(`Failed to read TrendsInsights component: ${error}`);
  }
}, results);

// ==================== Detail Components ====================

await runTest('QuestionAccordion: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/detail/QuestionAccordion.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
  } catch (error) {
    throw new Error(`Failed to read QuestionAccordion component: ${error}`);
  }
}, results);

await runTest('SnippetCard: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const componentPath = path.join(
      process.cwd(),
      'src/components/detail/SnippetCard.astro'
    );

    const content = await fs.readFile(componentPath, 'utf-8');

    assert(content.length > 0, 'Component file should have content');
  } catch (error) {
    throw new Error(`Failed to read SnippetCard component: ${error}`);
  }
}, results);

// ==================== Pages ====================

await runTest('Home Page: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const pagePath = path.join(
      process.cwd(),
      'src/pages/index.astro'
    );

    const content = await fs.readFile(pagePath, 'utf-8');

    assert(content.length > 0, 'Home page should have content');
    assert(content.includes('Layout'), 'Should use Layout component');
  } catch (error) {
    throw new Error(`Failed to read home page: ${error}`);
  }
}, results);

await runTest('Analytics Page: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const pagePath = path.join(
      process.cwd(),
      'src/pages/analytics.astro'
    );

    const content = await fs.readFile(pagePath, 'utf-8');

    assert(content.length > 0, 'Analytics page should have content');
    assert(content.includes('analytics'), 'Should have analytics content');
  } catch (error) {
    throw new Error(`Failed to read analytics page: ${error}`);
  }
}, results);

// ==================== Utilities ====================

await runTest('Metrics Calculator: File exists and exports functions', async () => {
  try {
    const calculator = await import('../src/utils/metricsCalculator');

    assert(typeof calculator.calculateQuestionMetrics === 'function', 'Should export calculateQuestionMetrics');
    assert(typeof calculator.calculateCompanyMetrics === 'function', 'Should export calculateCompanyMetrics');
    assert(typeof calculator.calculateCrossCompanyMetrics === 'function', 'Should export calculateCrossCompanyMetrics');
  } catch (error) {
    throw new Error(`Failed to import metricsCalculator: ${error}`);
  }
}, results);

await runTest('Data Loader: File exists and exports functions', async () => {
  try {
    const loader = await import('../src/utils/dataLoader');

    assert(typeof loader.parseFilename === 'function', 'Should export parseFilename');
    assert(typeof loader.loadJsonFile === 'function', 'Should export loadJsonFile');
    assert(typeof loader.normalizeAnalysisResult === 'function', 'Should export normalizeAnalysisResult');
    assert(typeof loader.getBaseQuestionId === 'function', 'Should export getBaseQuestionId');
  } catch (error) {
    throw new Error(`Failed to import dataLoader: ${error}`);
  }
}, results);


// ==================== Type Definitions ====================

await runTest('Type definitions: analysis.ts exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const typesPath = path.join(
      process.cwd(),
      'src/types/analysis.ts'
    );

    const content = await fs.readFile(typesPath, 'utf-8');

    assert(content.length > 0, 'Types file should have content');
    assert(content.includes('export type Classification'), 'Should export Classification type');
    assert(content.includes('export type FinancialType'), 'Should export FinancialType type');
    assert(content.includes('export interface Snippet'), 'Should export Snippet interface');
    assert(content.includes('export interface AnalysisResult'), 'Should export AnalysisResult interface');
  } catch (error) {
    throw new Error(`Failed to read types file: ${error}`);
  }
}, results);

await runTest('Type definitions: metrics.ts exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const typesPath = path.join(
      process.cwd(),
      'src/types/metrics.ts'
    );

    const content = await fs.readFile(typesPath, 'utf-8');

    assert(content.length > 0, 'Metrics types file should have content');
    assert(content.includes('export interface QuestionMetrics'), 'Should export QuestionMetrics interface');
    assert(content.includes('export interface CompanyMetrics'), 'Should export CompanyMetrics interface');
  } catch (error) {
    throw new Error(`Failed to read metrics types file: ${error}`);
  }
}, results);


// ==================== Styles ====================

await runTest('Global CSS: File exists', async () => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const cssPath = path.join(
      process.cwd(),
      'src/styles/global.css'
    );

    const content = await fs.readFile(cssPath, 'utf-8');

    assert(content.length > 0, 'Global CSS should have content');
    assert(content.includes('@keyframes'), 'Should have keyframe animations');
    assert(content.includes('animate-fade-in'), 'Should have fade-in animation');
    assert(content.includes('skip-to-main'), 'Should have accessibility styles');
  } catch (error) {
    throw new Error(`Failed to read global CSS: ${error}`);
  }
}, results);

// Print results
results.print();

// Exit with appropriate code
process.exit(results.allPassed ? 0 : 1);
