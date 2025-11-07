/**
 * Excel export utility for AG Verification Dashboard
 * Generates comprehensive multi-sheet Excel workbooks
 */

import ExcelJS from 'exceljs';
import type { CompanyYearData } from '../types/analysis';
import type { CompanyMetrics } from '../types/metrics';
import { getApplicabilityLabel } from '../data/canonicalQuestions';
import {
  calculateCompanyMetrics,
  calculateCategoryMetrics,
  calculateCrossCompanyMetrics
} from './metricsCalculator';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ExcelExportOptions {
  includeExecutiveSummary?: boolean;
  includeCompanyDetails?: boolean;
  includeQuestionPerformance?: boolean;
  includeCategoryAnalysis?: boolean;
  includeQuestionCoverage?: boolean;
  includeSnippetData?: boolean;
  includeVerificationReport?: boolean;
  includeColumnReference?: boolean;
  includeMergedOverview?: boolean;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Generate comprehensive Excel workbook from company data
 */
export async function generateExcelWorkbook(
  companyDataArray: CompanyYearData[],
  options: ExcelExportOptions = {}
): Promise<ExcelJS.Workbook> {
  // Default to including all sheets
  const opts = {
    includeExecutiveSummary: true,
    includeCompanyDetails: true,
    includeQuestionPerformance: true,
    includeCategoryAnalysis: true,
    includeQuestionCoverage: true,
    includeSnippetData: true,
    includeVerificationReport: true,
    includeColumnReference: true,
    includeMergedOverview: true,
    ...options
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AG Verification Dashboard';
  workbook.created = new Date();

  // Calculate all metrics
  const companyMetrics = companyDataArray.map(cd => calculateCompanyMetrics(cd.verified));
  const crossCompanyMetrics = calculateCrossCompanyMetrics(companyMetrics, companyDataArray);
  const mergedCompanyData = companyDataArray.filter(cd => cd.isMerged);

  // Generate sheets
  if (opts.includeExecutiveSummary) {
    await createExecutiveSummarySheet(workbook, companyDataArray, companyMetrics, crossCompanyMetrics);
  }

  if (opts.includeCompanyDetails) {
    await createCompanyDetailsSheet(workbook, companyDataArray, companyMetrics);
  }

  if (opts.includeQuestionPerformance) {
    await createQuestionPerformanceSheet(workbook, crossCompanyMetrics);
  }

  if (opts.includeCategoryAnalysis) {
    await createCategoryAnalysisSheet(workbook, companyDataArray, companyMetrics);
  }

  if (opts.includeQuestionCoverage) {
    await createQuestionCoverageSheet(workbook, companyDataArray, companyMetrics);
  }

  if (opts.includeSnippetData) {
    await createSnippetDataSheet(workbook, companyDataArray);
  }

  if (opts.includeVerificationReport) {
    await createVerificationReportSheet(workbook, companyMetrics);
  }

  if (opts.includeColumnReference) {
    await createColumnReferenceSheet(workbook);
  }

  if (opts.includeMergedOverview && mergedCompanyData.length > 0) {
    await createMergedOverviewSheet(workbook, mergedCompanyData);
  }

  return workbook;
}

// ============================================================================
// Sheet 1: Executive Summary
// ============================================================================

async function createExecutiveSummarySheet(
  workbook: ExcelJS.Workbook,
  companyDataArray: CompanyYearData[],
  companyMetrics: CompanyMetrics[],
  crossCompanyMetrics: any
) {
  const sheet = workbook.addWorksheet('Executive Summary', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  let row = 1;

  // Title
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = 'AG Verification Dashboard - Executive Summary';
  sheet.getCell(`A${row}`).font = { size: 16, bold: true };
  sheet.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row += 2;

  // Generated date
  sheet.getCell(`A${row}`).value = 'Generated:';
  sheet.getCell(`B${row}`).value = new Date().toISOString().split('T')[0];
  row += 2;

  // === HIGH-LEVEL SUMMARY STATS ===
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = 'Overall Statistics';
  sheet.getCell(`A${row}`).font = { size: 14, bold: true };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getCell(`A${row}`).font.color = { argb: 'FFFFFFFF' };
  row += 1;

  const stats = crossCompanyMetrics.global_stats;

  const summaryStats = [
    ['Total Companies', stats.total_companies],
    ['Total Questions Analyzed', stats.total_questions],
    ['Total Snippets', stats.total_snippets],
    ['Average Financial Transparency', `${stats.average_financial_rate_all.toFixed(1)}%`],
    ['Average Forward-Looking Rate', `${stats.average_forward_looking_rate_all.toFixed(1)}%`],
    ['Average Present-Day Rate', `${stats.average_temporal_present_day_rate_all.toFixed(1)}%`]
  ];

  summaryStats.forEach(([label, value]) => {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`B${row}`).value = value;
    sheet.getCell(`A${row}`).font = { bold: true };
    row++;
  });

  row += 2;

  // === HOW THEY RATED ===
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = 'Rating Distribution';
  sheet.getCell(`A${row}`).font = { size: 14, bold: true };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getCell(`A${row}`).font.color = { argb: 'FFFFFFFF' };
  row += 1;

  // Classification distribution
  sheet.getCell(`A${row}`).value = 'Classification';
  sheet.getCell(`B${row}`).value = 'Count';
  sheet.getCell(`C${row}`).value = 'Percentage';
  ['A', 'B', 'C'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });
  row++;

  const totalSnippets = stats.total_snippets;
  const classifications = [
    ['FULL_DISCLOSURE', stats.full_disclosure_count],
    ['PARTIAL', stats.partial_disclosure_count],
    ['UNCLEAR', stats.unclear_count],
    ['NO_DISCLOSURE', stats.no_disclosure_count]
  ];

  classifications.forEach(([label, count]) => {
    const percentage = totalSnippets > 0 ? ((count as number / totalSnippets) * 100).toFixed(1) : '0.0';
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`B${row}`).value = count;
    sheet.getCell(`C${row}`).value = `${percentage}%`;
    row++;
  });

  row += 2;

  // === SNIPPETS PER COMPANY ===
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = 'Snippets Per Company';
  sheet.getCell(`A${row}`).font = { size: 14, bold: true };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getCell(`A${row}`).font.color = { argb: 'FFFFFFFF' };
  row += 1;

  sheet.getCell(`A${row}`).value = 'Company';
  sheet.getCell(`B${row}`).value = 'Year';
  sheet.getCell(`C${row}`).value = 'Version';
  sheet.getCell(`D${row}`).value = 'Total Snippets';
  sheet.getCell(`E${row}`).value = 'Evidence Depth';
  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });
  row++;

  companyMetrics.forEach((cm, index) => {
    sheet.getCell(`A${row}`).value = cm.company_name;
    sheet.getCell(`B${row}`).value = cm.fiscal_year;
    sheet.getCell(`C${row}`).value = companyDataArray[index].version;
    sheet.getCell(`D${row}`).value = cm.total_snippets;
    sheet.getCell(`E${row}`).value = cm.average_snippets_per_question.toFixed(2);

    row++;
  });

  row += 2;

  // === SNIPPETS PER QUESTION (TOP 10) ===
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = 'Top 10 Questions by Evidence Depth';
  sheet.getCell(`A${row}`).font = { size: 14, bold: true };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getCell(`A${row}`).font.color = { argb: 'FFFFFFFF' };
  row += 1;

  sheet.getCell(`A${row}`).value = 'Rank';
  sheet.getCell(`B${row}`).value = 'Question ID';
  sheet.getCell(`C${row}`).value = 'Question Text';
  sheet.getCell(`D${row}`).value = 'Avg Evidence Depth';
  sheet.getCell(`E${row}`).value = 'Companies';
  sheet.getCell(`F${row}`).value = 'Total Snippets';
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });
  row++;

  crossCompanyMetrics.question_rankings.slice(0, 10).forEach((q: any) => {
    sheet.getCell(`A${row}`).value = q.ranking;
    sheet.getCell(`B${row}`).value = q.question_id;
    sheet.getCell(`C${row}`).value = q.question_text;
    sheet.getCell(`D${row}`).value = q.average_evidence_depth.toFixed(1);
    sheet.getCell(`E${row}`).value = q.companies_analyzed;
    sheet.getCell(`F${row}`).value = q.total_snippets_across_companies;
    row++;
  });

  // Auto-fit columns
  sheet.columns = [
    { key: 'A', width: 35 },
    { key: 'B', width: 20 },
    { key: 'C', width: 60 },
    { key: 'D', width: 15 },
    { key: 'E', width: 15 },
    { key: 'F', width: 15 }
  ];
}

// ============================================================================
// Sheet 2: Company Details
// ============================================================================

async function createCompanyDetailsSheet(
  workbook: ExcelJS.Workbook,
  companyDataArray: CompanyYearData[],
  companyMetrics: CompanyMetrics[]
) {
  const sheet = workbook.addWorksheet('Company Details', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  // Header row
  const headers = [
    'Company',
    'Year',
    'Version',
    'Model',
    'Canonical Questions',
    'Questions Analyzed',
    'Questions Answered',
    'Questions Not Applicable',
    'Questions w/ No Disclosure',
    'Total Snippets',
    'Avg Snippets/Question',
    'Full Disclosure',
    'Partial',
    'Unclear',
    'No Disclosure',
    'Financial Transparency %',
    'Forward-Looking %',
    'Narrative Balance %',
    'Verification Pass Rate %',
    'Snippets Removed',
    'Snippets Corrected'
  ];

  headers.forEach((header, i) => {
    const cell = sheet.getCell(1, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font.color = { argb: 'FFFFFFFF' };
  });

  // Data rows
  companyMetrics.forEach((cm, index) => {
    const rowNum = index + 2;
    const companyData = companyDataArray[index];

    sheet.getCell(rowNum, 1).value = cm.company_name;
    sheet.getCell(rowNum, 2).value = cm.fiscal_year;
    sheet.getCell(rowNum, 3).value = companyData.version;
    sheet.getCell(rowNum, 4).value = cm.model_used;
    sheet.getCell(rowNum, 5).value = cm.canonical_questions_total;
    sheet.getCell(rowNum, 6).value = cm.total_questions_analyzed;
    sheet.getCell(rowNum, 7).value = cm.total_questions_answered;
    sheet.getCell(rowNum, 8).value = cm.canonical_questions_not_applicable;
    sheet.getCell(rowNum, 9).value = cm.canonical_questions_without_disclosure;
    sheet.getCell(rowNum, 10).value = cm.total_snippets;
    sheet.getCell(rowNum, 11).value = cm.average_snippets_per_question.toFixed(2);
    sheet.getCell(rowNum, 12).value = cm.snippets_by_classification.FULL_DISCLOSURE;
    sheet.getCell(rowNum, 13).value = cm.snippets_by_classification.PARTIAL;
    sheet.getCell(rowNum, 14).value = cm.snippets_by_classification.UNCLEAR;
    sheet.getCell(rowNum, 15).value = cm.snippets_by_classification.NO_DISCLOSURE;
    sheet.getCell(rowNum, 16).value = cm.financial_quantification_rate.toFixed(1);
    sheet.getCell(rowNum, 17).value = cm.forward_looking_rate.toFixed(1);
    sheet.getCell(rowNum, 18).value = cm.narrative_balance_rate.toFixed(1);

    // Verification data
    if (cm.verification_metadata) {
      sheet.getCell(rowNum, 19).value = cm.verification_metadata.pass_rate.toFixed(1);
      sheet.getCell(rowNum, 20).value = cm.verification_metadata.snippets_removed;
      sheet.getCell(rowNum, 21).value = cm.verification_metadata.snippets_corrected;
    }
  });

  // Auto-fit columns
  sheet.columns.forEach((column, i) => {
    column.width = 20;
  });

  // Enable auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };
}

// ============================================================================
// Sheet 3: Question Performance
// ============================================================================

async function createQuestionPerformanceSheet(
  workbook: ExcelJS.Workbook,
  crossCompanyMetrics: any
) {
  const sheet = workbook.addWorksheet('Question Performance', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  // Header row
  const headers = [
    'Rank',
    'Question ID',
    'Category',
    'Question Text',
    'Avg Evidence Depth',
    'Companies Analyzed',
    'Total Snippets',
    'Full Disclosure Count',
    'Avg Financial Rate %'
  ];

  headers.forEach((header, i) => {
    const cell = sheet.getCell(1, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font.color = { argb: 'FFFFFFFF' };
  });

  // Data rows
  crossCompanyMetrics.question_rankings.forEach((q: any, index: number) => {
    const rowNum = index + 2;

    sheet.getCell(rowNum, 1).value = q.ranking;
    sheet.getCell(rowNum, 2).value = q.question_id;
    sheet.getCell(rowNum, 3).value = q.category;
    sheet.getCell(rowNum, 4).value = q.question_text;
    sheet.getCell(rowNum, 5).value = q.average_evidence_depth.toFixed(1);
    sheet.getCell(rowNum, 6).value = q.companies_analyzed;
    sheet.getCell(rowNum, 7).value = q.total_snippets_across_companies;
    sheet.getCell(rowNum, 8).value = q.companies_with_full_disclosure;
    sheet.getCell(rowNum, 9).value = q.average_financial_rate.toFixed(1);
  });

  // Auto-fit columns
  sheet.columns = [
    { key: 'A', width: 8 },
    { key: 'B', width: 15 },
    { key: 'C', width: 30 },
    { key: 'D', width: 80 },
    { key: 'E', width: 12 },
    { key: 'F', width: 18 },
    { key: 'G', width: 15 },
    { key: 'H', width: 20 },
    { key: 'I', width: 18 }
  ];

  // Enable auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };
}

// ============================================================================
// Sheet 4: Category Analysis
// ============================================================================

async function createCategoryAnalysisSheet(
  workbook: ExcelJS.Workbook,
  companyDataArray: CompanyYearData[],
  companyMetrics: CompanyMetrics[]
) {
  const sheet = workbook.addWorksheet('Category Analysis', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  // Header row
  const headers = [
    'Company',
    'Year',
    'Version',
    'Category',
    'Total Questions',
    'Questions Answered',
    'Total Snippets',
    'Avg Evidence Depth',
    'Financial Rate %',
    'Forward-Looking %',
    'Narrative Balance %'
  ];

  headers.forEach((header, i) => {
    const cell = sheet.getCell(1, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font.color = { argb: 'FFFFFFFF' };
  });

  let rowNum = 2;

  // Iterate through companies and categories
  companyDataArray.forEach((companyData, companyIndex) => {
    const cm = companyMetrics[companyIndex];
    const questions = companyData.verified.analysis_results;
    const categories = Array.from(new Set(questions.map(q => q.category)));

    categories.forEach(categoryName => {
      const categoryMetrics = calculateCategoryMetrics(questions, categoryName);

      sheet.getCell(rowNum, 1).value = cm.company_name;
      sheet.getCell(rowNum, 2).value = cm.fiscal_year;
      sheet.getCell(rowNum, 3).value = companyData.version;
      sheet.getCell(rowNum, 4).value = categoryName;
      sheet.getCell(rowNum, 5).value = categoryMetrics.total_questions;
      sheet.getCell(rowNum, 6).value = categoryMetrics.questions_answered;
      sheet.getCell(rowNum, 7).value = categoryMetrics.total_snippets;
      sheet.getCell(rowNum, 8).value = categoryMetrics.average_evidence_depth.toFixed(2);
      sheet.getCell(rowNum, 9).value = categoryMetrics.average_financial_rate.toFixed(1);
      sheet.getCell(rowNum, 10).value = categoryMetrics.average_forward_looking_rate.toFixed(1);
      sheet.getCell(rowNum, 11).value = categoryMetrics.average_narrative_balance_rate.toFixed(1);

      rowNum++;
    });
  });

  // Auto-fit columns
  sheet.columns.forEach((column, i) => {
    column.width = i === 3 ? 30 : 18;
  });

  // Enable auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };
}

// ============================================================================
// Sheet 5: Question Coverage
// ============================================================================

async function createQuestionCoverageSheet(
  workbook: ExcelJS.Workbook,
  companyDataArray: CompanyYearData[],
  companyMetrics: CompanyMetrics[]
) {
  const sheet = workbook.addWorksheet('Question Coverage', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  const headers = [
    'Company',
    'Year',
    'Version',
    'Question ID',
    'Question Text',
    'Category',
    'Status',
    'Snippet Count',
    'Applicability'
  ];

  headers.forEach((header, idx) => {
    const cell = sheet.getCell(1, idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.font.color = { argb: 'FFFFFFFF' };
  });

  let rowNum = 2;

  companyMetrics.forEach((metrics, index) => {
    const companyData = companyDataArray[index];
    metrics.question_coverage.forEach(coverage => {
      sheet.getCell(rowNum, 1).value = companyData.company;
      sheet.getCell(rowNum, 2).value = companyData.year;
      sheet.getCell(rowNum, 3).value = companyData.version;
      sheet.getCell(rowNum, 4).value = coverage.question_id;
      sheet.getCell(rowNum, 5).value = coverage.question_text;
      sheet.getCell(rowNum, 6).value = coverage.category;
      sheet.getCell(rowNum, 7).value = getCoverageStatusLabel(coverage.status);
      sheet.getCell(rowNum, 8).value = coverage.snippet_count;
      sheet.getCell(rowNum, 9).value = getApplicabilityLabel(coverage.applicability);
      rowNum++;
    });
  });

  sheet.columns = [
    { key: 'A', width: 18 },
    { key: 'B', width: 10 },
    { key: 'C', width: 10 },
    { key: 'D', width: 12 },
    { key: 'E', width: 70 },
    { key: 'F', width: 22 },
    { key: 'G', width: 22 },
    { key: 'H', width: 14 },
    { key: 'I', width: 35 }
  ];

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };
}

// ============================================================================
// Sheet 6: Snippet Raw Data
// ============================================================================

async function createSnippetDataSheet(
  workbook: ExcelJS.Workbook,
  companyDataArray: CompanyYearData[]
) {
  const sheet = workbook.addWorksheet('Snippet Raw Data', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  // Header row
  const headers = [
    'Company',
    'Year',
    'Version',
    'Question ID',
    'Question Text',
    'Category',
    'Snippet ID',
    'Quote',
    'Source',
    'Source Versions',
    'Classification',
    'Classification Justification',
    'Framing',
    'Framing Justification',
    'Financial Type',
    'Financial Justification',
    'Timeframe',
    'Timeframe Justification',
    'Financial Amounts',
    'Verification Corrected',
    'Comparison Status',
    'Correction Note'
  ];

  headers.forEach((header, i) => {
    const cell = sheet.getCell(1, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font.color = { argb: 'FFFFFFFF' };
  });

  let rowNum = 2;

  // Iterate through all snippets
  companyDataArray.forEach(companyData => {
    const questions = companyData.verified.analysis_results;

    questions.forEach(question => {
      question.disclosures.forEach(snippet => {
        const amounts = snippet.financial_amounts.map(fa =>
          `${fa.currency} ${fa.amount} (${fa.context})`
        ).join('; ');

        const sourceVersions = Array.isArray(snippet.source_versions)
          ? snippet.source_versions.join(', ')
          : '';

        const comparisonStatus = snippet.comparison_status || '';
        const verificationCorrected =
          snippet.verification_corrected === true || (comparisonStatus && comparisonStatus !== 'unchanged')
            ? 'Yes'
            : '';
        const correctionNote =
          snippet.comparison_change?.note ||
          snippet.merger_metadata?.human_review_reason ||
          '';

        const rowValues = [
          companyData.company,
          companyData.year,
          companyData.version,
          question.question_id,
          question.question_text,
          question.category,
          snippet.snippet_id,
          snippet.quote,
          snippet.source,
          sourceVersions,
          snippet.classification,
          snippet.classification_justification,
          snippet.categorization.framing,
          snippet.categorization.framing_justification,
          snippet.categorization.financial_type,
          snippet.categorization.financial_justification,
          snippet.categorization.timeframe,
          snippet.categorization.timeframe_justification,
          amounts || 'None',
          verificationCorrected,
          comparisonStatus,
          correctionNote
        ];

        rowValues.forEach((value, idx) => {
          sheet.getCell(rowNum, idx + 1).value = value;
        });

        rowNum++;
      });
    });
  });

  // Auto-fit columns
  sheet.columns = [
    { key: 'A', width: 15 }, // Company
    { key: 'B', width: 10 }, // Year
    { key: 'C', width: 10 }, // Version
    { key: 'D', width: 15 }, // Question ID
    { key: 'E', width: 60 }, // Question Text
    { key: 'F', width: 30 }, // Category
    { key: 'G', width: 15 }, // Snippet ID
    { key: 'H', width: 80 }, // Quote
    { key: 'I', width: 50 }, // Source
    { key: 'J', width: 22 }, // Source Versions
    { key: 'K', width: 20 }, // Classification
    { key: 'L', width: 60 }, // Classification Justification
    { key: 'M', width: 15 }, // Framing
    { key: 'N', width: 60 }, // Framing Justification
    { key: 'O', width: 18 }, // Financial Type
    { key: 'P', width: 60 }, // Financial Justification
    { key: 'Q', width: 20 }, // Timeframe
    { key: 'R', width: 60 }, // Timeframe Justification
    { key: 'S', width: 40 }, // Financial Amounts
    { key: 'T', width: 18 }, // Verification Corrected
    { key: 'U', width: 22 }, // Comparison Status
    { key: 'V', width: 60 }  // Correction Note
  ];

  // Enable auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };
}

// ============================================================================
// Sheet 7: Verification Report
// ============================================================================

async function createVerificationReportSheet(
  workbook: ExcelJS.Workbook,
  companyMetrics: CompanyMetrics[]
) {
  const sheet = workbook.addWorksheet('Verification Report', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  // Header row
  const headers = [
    'Company',
    'Year',
    'Verified Date',
    'Verification Model',
    'Pass Rate %',
    'Snippets Removed',
    'Snippets Corrected',
    'Questions Modified',
    'Total Original Snippets',
    'Total Final Snippets'
  ];

  headers.forEach((header, i) => {
    const cell = sheet.getCell(1, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font.color = { argb: 'FFFFFFFF' };
  });

  let rowNum = 2;

  // Data rows - only companies with verification metadata
  companyMetrics.forEach(cm => {
    if (cm.verification_metadata) {
      const vm = cm.verification_metadata;
      const totalOriginal = cm.total_snippets + vm.snippets_removed;

      sheet.getCell(rowNum, 1).value = cm.company_name;
      sheet.getCell(rowNum, 2).value = cm.fiscal_year;
      sheet.getCell(rowNum, 3).value = vm.verified_at;
      sheet.getCell(rowNum, 4).value = vm.verification_model;
      sheet.getCell(rowNum, 5).value = vm.pass_rate.toFixed(1);
      sheet.getCell(rowNum, 6).value = vm.snippets_removed;
      sheet.getCell(rowNum, 7).value = vm.snippets_corrected;
      sheet.getCell(rowNum, 8).value = vm.questions_modified.join(', ');
      sheet.getCell(rowNum, 9).value = totalOriginal;
      sheet.getCell(rowNum, 10).value = cm.total_snippets;

      // Conditional formatting for pass rate
      const passRateCell = sheet.getCell(rowNum, 5);
      const passRate = vm.pass_rate;
      if (passRate >= 95) passRateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
      else if (passRate >= 90) passRateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
      else if (passRate >= 80) passRateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      else passRateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };

      rowNum++;
    }
  });

  // Auto-fit columns
  sheet.columns.forEach((column, i) => {
    column.width = i === 7 ? 40 : 20;
  });

  // Enable auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };
}

// ============================================================================
// Sheet 8: Column Reference
// ============================================================================

async function createColumnReferenceSheet(
  workbook: ExcelJS.Workbook
) {
  const sheet = workbook.addWorksheet('Column Reference', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  // Title
  sheet.mergeCells('A1:E1');
  sheet.getCell('A1').value = 'Column Reference - Understanding Your Data';
  sheet.getCell('A1').font = { size: 16, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getCell('A1').font.color = { argb: 'FFFFFFFF' };

  let row = 3;

  // Header row
  const headers = ['Sheet', 'Column', 'Description', 'Calculation/Source', 'Example'];
  headers.forEach((header, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });
  row++;

  // Column definitions
  const columnData = [
    // Executive Summary
    ['Executive Summary', 'Total Companies', 'Total number of companies in the analysis', 'Count of unique companies in dataset', '5'],
    ['Executive Summary', 'Total Questions Analyzed', 'Total number of questions analyzed across all companies', 'Sum of questions from all companies', '88'],
    ['Executive Summary', 'Total Snippets', 'Total number of evidence snippets found', 'Sum of all disclosure snippets across companies', '235'],
    ['Executive Summary', 'Average Financial Transparency', 'Percentage of snippets with financial data', 'Snippets with financial amounts / Total snippets', '36.1%'],
    ['Executive Summary', 'Average Forward-Looking Rate', 'Percentage of future-oriented disclosures', 'Forward-looking snippets / Total snippets', '32.8%'],
    ['Executive Summary', 'Average Present-Day Rate', 'Percentage of present-day disclosures', 'Present-day snippets / Total snippets (averaged across companies)', '45.0%'],
    ['Executive Summary', 'Classification', 'Type of disclosure quality', 'FULL_DISCLOSURE, PARTIAL, UNCLEAR, or NO_DISCLOSURE', 'PARTIAL'],
    ['Executive Summary', 'Version', 'Schema version used for analysis', 'Extracted from filename (v3, v4, etc.)', 'v4'],

    // Company Details
    ['Company Details', 'Questions Analyzed', 'Number of questions this company answered', 'Count of questions with at least one snippet', '14'],
    ['Company Details', 'Total Snippets', 'Evidence snippets found for this company', 'Count of all disclosure snippets', '38'],
    ['Company Details', 'Avg Snippets/Question', 'Average evidence depth per question', 'Total snippets / Questions analyzed', '2.71'],
    ['Company Details', 'Full Disclosure', 'Snippets with complete, clear evidence', 'Count of FULL_DISCLOSURE classification', '7'],
    ['Company Details', 'Partial', 'Snippets with incomplete evidence', 'Count of PARTIAL classification', '21'],
    ['Company Details', 'Unclear', 'Snippets with ambiguous evidence', 'Count of UNCLEAR classification', '2'],
    ['Company Details', 'No Disclosure', 'Questions with no evidence found', 'Count of NO_DISCLOSURE classification', '3'],
    ['Company Details', 'Financial Transparency %', 'Percentage with monetary amounts', '(Full + Partial financial) / Total snippets × 100', '43.0%'],
    ['Company Details', 'Forward-Looking %', 'Percentage of future-oriented statements', 'Future timeframe snippets / Total × 100', '25.0%'],
    ['Company Details', 'Narrative Balance %', 'Percentage discussing both risks and opportunities', 'Both framing snippets / Total × 100', '8.0%'],
    ['Company Details', 'Verification Pass Rate %', 'Quality assurance pass rate', '(Original - Removed - Corrected) / Original × 100', '94.7%'],

    // Question Performance
    ['Question Performance', 'Rank', 'Ranking by average evidence depth (1 = best)', 'Sorted by average evidence depth descending', '1'],
    ['Question Performance', 'Question ID', 'Unique identifier for the question', 'From canonical question set', '99918'],
    ['Question Performance', 'Category', 'Risk category classification', 'Environmental, Human Health, Market/Business, or Regulatory/Financial', 'Environmental Risk'],
    ['Question Performance', 'Avg Evidence Depth', 'Average snippets per question across companies', 'Mean of snippet counts from companies that answered this question', '3.2'],
    ['Question Performance', 'Companies Analyzed', 'Number of companies that answered this question', 'Count of companies with evidence for this question', '4'],
    ['Question Performance', 'Total Snippets', 'Total evidence snippets across all companies', 'Sum of snippets from all companies for this question', '12'],
    ['Question Performance', 'Full Disclosure Count', 'Companies with complete evidence', 'Count of companies with at least one FULL_DISCLOSURE snippet', '2'],
    ['Question Performance', 'Avg Financial Rate %', 'Average financial transparency', 'Mean financial quantification rate across companies', '45.0%'],

    // Category Analysis
    ['Category Analysis', 'Category', 'Risk category name', 'One of four risk categories', 'Environmental Risk'],
    ['Category Analysis', 'Total Questions', 'Questions in this category', 'Count of questions assigned to category', '8'],
    ['Category Analysis', 'Questions Answered', 'Questions with evidence', 'Count of questions with at least one snippet', '7'],
    ['Category Analysis', 'Avg Evidence Depth', 'Average snippets per question', 'Total snippets / Questions in category', '3.2'],
    ['Category Analysis', 'Financial Rate %', 'Percentage with financial data', 'Average financial transparency for category', '38.0%'],
    ['Category Analysis', 'Forward-Looking %', 'Percentage future-oriented', 'Average forward-looking rate for category', '28.0%'],
    ['Category Analysis', 'Narrative Balance %', 'Percentage balanced risk/opportunity', 'Average narrative balance rate for category', '12.0%'],

    // Snippet Raw Data
    ['Snippet Raw Data', 'Snippet ID', 'Unique identifier for evidence snippet', 'Question ID + sequential number (e.g., 99903-001)', '99903-001'],
    ['Snippet Raw Data', 'Quote', 'Extracted text from document', 'Actual text quoted from company document', '"Our products may..."'],
    ['Snippet Raw Data', 'Source', 'Document location', 'PDF name, page number, and section', 'Annual Report, Page 45, Risk Factors'],
    ['Snippet Raw Data', 'Source Versions', 'Originating analysis versions (v3, v4, etc.)', 'Comma-separated list of versions that contributed to the snippet', 'v3, v4'],
    ['Snippet Raw Data', 'Classification', 'Quality of evidence', 'FULL_DISCLOSURE, PARTIAL, UNCLEAR, or NO_DISCLOSURE', 'PARTIAL'],
    ['Snippet Raw Data', 'Framing', 'Narrative perspective', 'Risk, Opportunity, Neutral, or Both', 'Risk'],
    ['Snippet Raw Data', 'Financial Type', 'Level of financial detail', 'Full (explicit $), Partial (relative terms), or Non-Financial', 'Partial'],
    ['Snippet Raw Data', 'Timeframe', 'Temporal orientation', 'Present day, Forward-looking, Historical, or Multiple/Unclear', 'Forward-looking'],
    ['Snippet Raw Data', 'Financial Amounts', 'Extracted monetary values', 'Currency, amount, and context', 'USD 10000000 (investment cost)'],
    ['Snippet Raw Data', 'Verification Corrected', 'Whether verification or merge corrected the snippet', 'Yes if verification_corrected flag is true or comparison status changed', 'Yes'],
    ['Snippet Raw Data', 'Comparison Status', 'Verification status of snippet', 'unchanged, classification_corrected, categorization_corrected, etc.', 'classification_corrected'],
    ['Snippet Raw Data', 'Correction Note', 'Summary of correction rationale', 'Derived from comparison_change.note or merged review note', 'Reclassified to UNCLEAR; lacks business risk'],

    // Verification Report
    ['Verification Report', 'Verified Date', 'When verification was performed', 'ISO date from verification process', '2025-11-04'],
    ['Verification Report', 'Verification Model', 'AI model used for verification', 'Model name and version', 'gemini-2.5-pro'],
    ['Verification Report', 'Pass Rate %', 'Percentage of snippets that passed verification', '(Total - Removed - Corrected) / Total × 100', '94.7%'],
    ['Verification Report', 'Snippets Removed', 'Low-quality snippets removed', 'Count of snippets deleted during verification', '1'],
    ['Verification Report', 'Snippets Corrected', 'Snippets with corrections', 'Count of snippets modified during verification', '6'],
    ['Verification Report', 'Questions Modified', 'Questions affected by verification', 'List of question IDs that had changes', '99903, 99911'],
    ['Verification Report', 'Total Original Snippets', 'Count before verification', 'Original snippet count + Removed', '39'],
    ['Verification Report', 'Total Final Snippets', 'Count after verification', 'Current snippet count in verified file', '38'],
    // Merged Overview
    ['Merged Overview', 'Company', 'Company name for merged dataset', 'Metadata company field', 'Nutrien'],
    ['Merged Overview', 'Year', 'Fiscal year of merged dataset', 'Metadata year field', '2024'],
    ['Merged Overview', 'Merged Version', 'Version label for merged analysis', 'Usually "merged"', 'merged'],
    ['Merged Overview', 'Source Versions', 'Versions combined in the merge', 'Metadata source_versions array', 'v3, v4'],
    ['Merged Overview', 'Source Files', 'Original verified files merged', 'Metadata source_files map', 'v3: Nutrien_2024_v3_verified.json'],
    ['Merged Overview', 'Merged Snippets', 'Total snippets retained after merge', 'merger_summary.total_merged_snippets', '42'],
    ['Merged Overview', 'v3 Snippets', 'Snippets from v3 input', 'merger_summary.total_v3_snippets', '30'],
    ['Merged Overview', 'v4 Snippets', 'Snippets from v4 input', 'merger_summary.total_v4_snippets', '38'],
    ['Merged Overview', 'Snippet Pairs', 'Paired snippets reviewed during merge', 'merger_summary.snippet_pairs', '26'],
    ['Merged Overview', 'AI Reviews', 'Automated merge review count', 'merger_summary.total_ai_reviews', '26'],
    ['Merged Overview', 'Human Flags', 'Snippets flagged for human follow-up', 'merger_summary.total_human_flags', '20'],
    ['Merged Overview', 'Questions Analyzed', 'Questions covered in merged dataset', 'completeness_summary.total_questions_analyzed', '14'],
    ['Merged Overview', 'Completeness Note', 'Context for merged coverage', 'completeness_summary.note', 'Summary statistics recalculated from merged results']
  ];

  // Add data rows
  columnData.forEach(([sheetName, column, description, calculation, example]) => {
    sheet.getCell(row, 1).value = sheetName;
    sheet.getCell(row, 2).value = column;
    sheet.getCell(row, 3).value = description;
    sheet.getCell(row, 4).value = calculation;
    sheet.getCell(row, 5).value = example;

    // Add subtle banding
    if (row % 2 === 0) {
      for (let col = 1; col <= 5; col++) {
        sheet.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    }

    row++;
  });

  // Column widths
  sheet.columns = [
    { key: 'A', width: 20 },  // Sheet
    { key: 'B', width: 25 },  // Column
    { key: 'C', width: 50 },  // Description
    { key: 'D', width: 60 },  // Calculation
    { key: 'E', width: 30 }   // Example
  ];

  // Enable auto-filter
  sheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: 5 }
  };

  // Add note at bottom
  row += 2;
  sheet.mergeCells(`A${row}:E${row}`);
  sheet.getCell(`A${row}`).value = 'Note: Use Excel\'s filter feature (dropdown arrows in header row) to find specific columns or sheets.';
  sheet.getCell(`A${row}`).font = { italic: true, color: { argb: 'FF666666' } };
  sheet.getCell(`A${row}`).alignment = { horizontal: 'left', wrapText: true };
}

// ============================================================================
// Sheet 9: Merged Overview (if applicable)
// ============================================================================

async function createMergedOverviewSheet(
  workbook: ExcelJS.Workbook,
  mergedData: CompanyYearData[]
) {
  const sheet = workbook.addWorksheet('Merged Overview', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  let row = 1;

  sheet.mergeCells(`A${row}:M${row}`);
  sheet.getCell(`A${row}`).value = 'Merged Evidence Overview';
  sheet.getCell(`A${row}`).font = { size: 16, bold: true };
  sheet.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row += 2;

  const totalDatasets = mergedData.length;
  const totalMergedSnippets = mergedData.reduce((sum, data) => {
    const summary = data.mergedMetadata?.mergerSummary;
    if (summary && typeof summary.total_merged_snippets === 'number') {
      return sum + summary.total_merged_snippets;
    }
    return sum + data.verified.summary_statistics?.total_disclosures_found ?? 0;
  }, 0);
  const totalAiReviews = mergedData.reduce((sum, data) => {
    const summary = data.mergedMetadata?.mergerSummary;
    return sum + (summary?.total_ai_reviews ?? 0);
  }, 0);
  const totalHumanFlags = mergedData.reduce((sum, data) => {
    const summary = data.mergedMetadata?.mergerSummary;
    return sum + (summary?.total_human_flags ?? 0);
  }, 0);

  const summaryStats: Array<[string, number]> = [
    ['Merged datasets', totalDatasets],
    ['Merged snippets (total)', totalMergedSnippets],
    ['AI reviews (total)', totalAiReviews],
    ['Human flags (total)', totalHumanFlags]
  ];

  summaryStats.forEach(([label, value]) => {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = value;
    row++;
  });

  row += 1;

  const headers = [
    'Company',
    'Year',
    'Merged Version',
    'Source Versions',
    'Source Files',
    'Merged Snippets',
    'v3 Snippets',
    'v4 Snippets',
    'Snippet Pairs',
    'AI Reviews',
    'Human Flags',
    'Questions Analyzed',
    'Completeness Note'
  ];

  headers.forEach((header, index) => {
    const cell = sheet.getCell(row, index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.font.color = { argb: 'FFFFFFFF' };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  row += 1;

  mergedData.forEach(data => {
    const metadata = data.mergedMetadata || {};
    const summary = metadata.mergerSummary || {};
    const completeness = metadata.completenessSummary || {};

    const sourceVersions = Array.isArray(metadata.sourceVersions)
      ? metadata.sourceVersions.join(', ')
      : '';
    const sourceFiles = metadata.sourceFiles
      ? Object.entries(metadata.sourceFiles)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ')
      : '';

    const rowValues = [
      data.company,
      data.year,
      data.version,
      sourceVersions || '—',
      sourceFiles || '—',
      summary.total_merged_snippets ?? '',
      summary.total_v3_snippets ?? '',
      summary.total_v4_snippets ?? '',
      summary.snippet_pairs ?? summary.total_snippet_pairs ?? '',
      summary.total_ai_reviews ?? '',
      summary.total_human_flags ?? '',
      completeness.total_questions_analyzed ?? '',
      completeness.note || ''
    ];

    rowValues.forEach((value, index) => {
      sheet.getCell(row, index + 1).value = value;
    });

    row++;
  });

  sheet.columns = [
    { key: 'A', width: 20 },  // Company
    { key: 'B', width: 10 },  // Year
    { key: 'C', width: 16 },  // Merged Version
    { key: 'D', width: 22 },  // Source Versions
    { key: 'E', width: 40 },  // Source Files
    { key: 'F', width: 18 },  // Merged Snippets
    { key: 'G', width: 15 },  // v3 Snippets
    { key: 'H', width: 15 },  // v4 Snippets
    { key: 'I', width: 15 },  // Snippet Pairs
    { key: 'J', width: 15 },  // AI Reviews
    { key: 'K', width: 15 },  // Human Flags
    { key: 'L', width: 18 },  // Questions Analyzed
    { key: 'M', width: 45 }   // Completeness Note
  ];

  sheet.autoFilter = {
    from: { row: row - mergedData.length - 1, column: 1 },
    to: { row: row - 1, column: headers.length }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCoverageStatusLabel(status: string): string {
  if (status === 'NOT_APPLICABLE') {
    return 'Not applicable to this sector';
  }
  if (status === 'NO_DISCLOSURE') {
    return 'No verified disclosure';
  }
  return 'Disclosure available';
}

/**
 * Save workbook to file
 */
export async function saveWorkbookToFile(
  workbook: ExcelJS.Workbook,
  filepath: string
): Promise<void> {
  await workbook.xlsx.writeFile(filepath);
}

/**
 * Get workbook as buffer (for browser download)
 */
export async function getWorkbookBuffer(
  workbook: ExcelJS.Workbook
): Promise<Buffer> {
  return await workbook.xlsx.writeBuffer() as Buffer;
}
