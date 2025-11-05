/**
 * Excel export utility for AG Verification Dashboard
 * Generates comprehensive multi-sheet Excel workbooks
 */

import ExcelJS from 'exceljs';
import type { CompanyYearData } from '../types/analysis';
import type { CompanyMetrics } from '../types/metrics';
import {
  calculateCompanyMetrics,
  calculateQuestionMetrics,
  calculateCategoryMetrics,
  calculateSnippetScore,
  getSnippetScoreComponents,
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
  includeSnippetData?: boolean;
  includeVerificationReport?: boolean;
  includeColumnReference?: boolean;
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
    includeSnippetData: true,
    includeVerificationReport: true,
    includeColumnReference: true,
    ...options
  };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AG Verification Dashboard';
  workbook.created = new Date();

  // Calculate all metrics
  const companyMetrics = companyDataArray.map(cd => calculateCompanyMetrics(cd.verified));
  const crossCompanyMetrics = calculateCrossCompanyMetrics(companyMetrics, companyDataArray);

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

  if (opts.includeSnippetData) {
    await createSnippetDataSheet(workbook, companyDataArray);
  }

  if (opts.includeVerificationReport) {
    await createVerificationReportSheet(workbook, companyMetrics);
  }

  if (opts.includeColumnReference) {
    await createColumnReferenceSheet(workbook);
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
    ['Average Disclosure Score', `${stats.average_disclosure_score_all.toFixed(1)}%`],
    ['Average Financial Transparency', `${stats.average_financial_rate_all.toFixed(1)}%`],
    ['Average Forward-Looking Rate', `${stats.average_forward_looking_rate_all.toFixed(1)}%`]
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
  sheet.getCell(`E${row}`).value = 'Overall Score';
  sheet.getCell(`F${row}`).value = 'Grade';
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  });
  row++;

  companyMetrics.forEach((cm, index) => {
    sheet.getCell(`A${row}`).value = cm.company_name;
    sheet.getCell(`B${row}`).value = cm.fiscal_year;
    sheet.getCell(`C${row}`).value = companyDataArray[index].version;
    sheet.getCell(`D${row}`).value = cm.total_snippets;
    sheet.getCell(`E${row}`).value = cm.overall_disclosure_score.toFixed(1);
    sheet.getCell(`F${row}`).value = cm.overall_grade;

    // Conditional formatting for grades
    const gradeCell = sheet.getCell(`F${row}`);
    if (cm.overall_grade === 'A') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    else if (cm.overall_grade === 'B') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    else if (cm.overall_grade === 'C') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    else if (cm.overall_grade === 'D') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };
    else gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
    gradeCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    row++;
  });

  row += 2;

  // === SNIPPETS PER QUESTION (TOP 10) ===
  sheet.mergeCells(`A${row}:F${row}`);
  sheet.getCell(`A${row}`).value = 'Top 10 Questions by Average Score';
  sheet.getCell(`A${row}`).font = { size: 14, bold: true };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  sheet.getCell(`A${row}`).font.color = { argb: 'FFFFFFFF' };
  row += 1;

  sheet.getCell(`A${row}`).value = 'Rank';
  sheet.getCell(`B${row}`).value = 'Question ID';
  sheet.getCell(`C${row}`).value = 'Question Text';
  sheet.getCell(`D${row}`).value = 'Avg Score';
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
    sheet.getCell(`D${row}`).value = q.average_score_across_companies.toFixed(1);
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
    'Overall Score',
    'Grade',
    'Questions Analyzed',
    'Questions Answered',
    'Total Snippets',
    'Avg Snippets/Question',
    'Full Disclosure',
    'Partial',
    'Unclear',
    'No Disclosure',
    'Financial Transparency %',
    'Forward-Looking %',
    'Narrative Balance %',
    'Environmental Score',
    'Human Health Score',
    'Market/Business Score',
    'Regulatory/Financial Score',
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
    sheet.getCell(rowNum, 5).value = cm.overall_disclosure_score.toFixed(1);
    sheet.getCell(rowNum, 6).value = cm.overall_grade;
    sheet.getCell(rowNum, 7).value = cm.total_questions_analyzed;
    sheet.getCell(rowNum, 8).value = cm.total_questions_answered;
    sheet.getCell(rowNum, 9).value = cm.total_snippets;
    sheet.getCell(rowNum, 10).value = cm.average_snippets_per_question.toFixed(2);
    sheet.getCell(rowNum, 11).value = cm.snippets_by_classification.FULL_DISCLOSURE;
    sheet.getCell(rowNum, 12).value = cm.snippets_by_classification.PARTIAL;
    sheet.getCell(rowNum, 13).value = cm.snippets_by_classification.UNCLEAR;
    sheet.getCell(rowNum, 14).value = cm.snippets_by_classification.NO_DISCLOSURE;
    sheet.getCell(rowNum, 15).value = cm.financial_quantification_rate.toFixed(1);
    sheet.getCell(rowNum, 16).value = cm.forward_looking_rate.toFixed(1);
    sheet.getCell(rowNum, 17).value = cm.narrative_balance_rate.toFixed(1);

    // Category scores
    sheet.getCell(rowNum, 18).value = (cm.category_scores['Environmental Risk'] || 0).toFixed(1);
    sheet.getCell(rowNum, 19).value = (cm.category_scores['Human Health Risk'] || 0).toFixed(1);
    sheet.getCell(rowNum, 20).value = (cm.category_scores['Market/Business Risk'] || 0).toFixed(1);
    sheet.getCell(rowNum, 21).value = (cm.category_scores['Regulatory/Financial Risk'] || 0).toFixed(1);

    // Verification data
    if (cm.verification_metadata) {
      sheet.getCell(rowNum, 22).value = cm.verification_metadata.pass_rate.toFixed(1);
      sheet.getCell(rowNum, 23).value = cm.verification_metadata.snippets_removed;
      sheet.getCell(rowNum, 24).value = cm.verification_metadata.snippets_corrected;
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
    'Avg Score',
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
    sheet.getCell(rowNum, 5).value = q.average_score_across_companies.toFixed(1);
    sheet.getCell(rowNum, 6).value = q.companies_analyzed;
    sheet.getCell(rowNum, 7).value = q.total_snippets_across_companies;
    sheet.getCell(rowNum, 8).value = q.companies_with_full_disclosure;
    sheet.getCell(rowNum, 9).value = q.average_financial_rate.toFixed(1);

    // Conditional formatting for scores
    const scoreCell = sheet.getCell(rowNum, 5);
    const score = q.average_score_across_companies;
    if (score >= 90) scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    else if (score >= 80) scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    else if (score >= 70) scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    else if (score >= 60) scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };
    else scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
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
    'Avg Score',
    'Total Questions',
    'Questions Answered',
    'Total Snippets',
    'Avg Evidence Depth',
    'Financial Rate %',
    'Forward-Looking %',
    'Narrative Balance %',
    'Grade'
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
      sheet.getCell(rowNum, 5).value = categoryMetrics.average_question_score.toFixed(1);
      sheet.getCell(rowNum, 6).value = categoryMetrics.total_questions;
      sheet.getCell(rowNum, 7).value = categoryMetrics.questions_answered;
      sheet.getCell(rowNum, 8).value = categoryMetrics.total_snippets;
      sheet.getCell(rowNum, 9).value = categoryMetrics.average_evidence_depth.toFixed(2);
      sheet.getCell(rowNum, 10).value = categoryMetrics.average_financial_rate.toFixed(1);
      sheet.getCell(rowNum, 11).value = categoryMetrics.average_forward_looking_rate.toFixed(1);
      sheet.getCell(rowNum, 12).value = categoryMetrics.average_narrative_balance_rate.toFixed(1);
      sheet.getCell(rowNum, 13).value = categoryMetrics.category_grade;

      // Conditional formatting for grades
      const gradeCell = sheet.getCell(rowNum, 13);
      if (categoryMetrics.category_grade === 'A') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
      else if (categoryMetrics.category_grade === 'B') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
      else if (categoryMetrics.category_grade === 'C') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      else if (categoryMetrics.category_grade === 'D') gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };
      else gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
      gradeCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

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
// Sheet 5: Snippet Raw Data
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
    'Classification',
    'Classification Justification',
    'Framing',
    'Framing Justification',
    'Financial Type',
    'Financial Justification',
    'Timeframe',
    'Timeframe Justification',
    'Financial Score (0-3)',
    'Temporal Score (0-3)',
    'Narrative Score (1-3)',
    'Total Score (0-100)',
    'Financial Amounts'
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
        const scoreComponents = getSnippetScoreComponents(snippet);

        sheet.getCell(rowNum, 1).value = companyData.company;
        sheet.getCell(rowNum, 2).value = companyData.year;
        sheet.getCell(rowNum, 3).value = companyData.version;
        sheet.getCell(rowNum, 4).value = question.question_id;
        sheet.getCell(rowNum, 5).value = question.question_text;
        sheet.getCell(rowNum, 6).value = question.category;
        sheet.getCell(rowNum, 7).value = snippet.snippet_id;
        sheet.getCell(rowNum, 8).value = snippet.quote;
        sheet.getCell(rowNum, 9).value = snippet.source;
        sheet.getCell(rowNum, 10).value = snippet.classification;
        sheet.getCell(rowNum, 11).value = snippet.classification_justification;
        sheet.getCell(rowNum, 12).value = snippet.categorization.framing;
        sheet.getCell(rowNum, 13).value = snippet.categorization.framing_justification;
        sheet.getCell(rowNum, 14).value = snippet.categorization.financial_type;
        sheet.getCell(rowNum, 15).value = snippet.categorization.financial_justification;
        sheet.getCell(rowNum, 16).value = snippet.categorization.timeframe;
        sheet.getCell(rowNum, 17).value = snippet.categorization.timeframe_justification;
        sheet.getCell(rowNum, 18).value = scoreComponents.financial_score;
        sheet.getCell(rowNum, 19).value = scoreComponents.temporal_score;
        sheet.getCell(rowNum, 20).value = scoreComponents.narrative_score;
        sheet.getCell(rowNum, 21).value = scoreComponents.total_score.toFixed(1);

        // Financial amounts (concatenate)
        const amounts = snippet.financial_amounts.map(fa =>
          `${fa.currency} ${fa.amount} (${fa.context})`
        ).join('; ');
        sheet.getCell(rowNum, 22).value = amounts || 'None';

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
    { key: 'J', width: 20 }, // Classification
    { key: 'K', width: 60 }, // Classification Justification
    { key: 'L', width: 15 }, // Framing
    { key: 'M', width: 60 }, // Framing Justification
    { key: 'N', width: 18 }, // Financial Type
    { key: 'O', width: 60 }, // Financial Justification
    { key: 'P', width: 20 }, // Timeframe
    { key: 'Q', width: 60 }, // Timeframe Justification
    { key: 'R', width: 18 }, // Financial Score
    { key: 'S', width: 18 }, // Temporal Score
    { key: 'T', width: 18 }, // Narrative Score
    { key: 'U', width: 18 }, // Total Score
    { key: 'V', width: 40 }  // Financial Amounts
  ];

  // Enable auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };
}

// ============================================================================
// Sheet 6: Verification Report
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
// Sheet 7: Column Reference
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
    ['Executive Summary', 'Average Disclosure Score', 'Average quality score across all snippets', 'Mean of all snippet scores (0-100%)', '52.6%'],
    ['Executive Summary', 'Average Financial Transparency', 'Percentage of snippets with financial data', 'Snippets with financial amounts / Total snippets', '36.1%'],
    ['Executive Summary', 'Average Forward-Looking Rate', 'Percentage of future-oriented disclosures', 'Forward-looking snippets / Total snippets', '32.8%'],
    ['Executive Summary', 'Classification', 'Type of disclosure quality', 'FULL_DISCLOSURE, PARTIAL, UNCLEAR, or NO_DISCLOSURE', 'PARTIAL'],
    ['Executive Summary', 'Version', 'Schema version used for analysis', 'Extracted from filename (v3, v4, etc.)', 'v4'],

    // Company Details
    ['Company Details', 'Overall Score', 'Company\'s average disclosure quality', 'Average of all snippet scores for this company (0-100%)', '48.0'],
    ['Company Details', 'Grade', 'Letter grade for overall performance', 'A: 90-100%, B: 80-89%, C: 70-79%, D: 60-69%, F: <60%', 'F'],
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
    ['Company Details', 'Environmental Score', 'Score for Environmental Risk category', 'Average snippet score for this category', '55.3'],
    ['Company Details', 'Verification Pass Rate %', 'Quality assurance pass rate', '(Original - Removed - Corrected) / Original × 100', '94.7%'],

    // Question Performance
    ['Question Performance', 'Rank', 'Ranking by average score (1 = best)', 'Sorted by average score descending', '1'],
    ['Question Performance', 'Question ID', 'Unique identifier for the question', 'From canonical question set', '99918'],
    ['Question Performance', 'Category', 'Risk category classification', 'Environmental, Human Health, Market/Business, or Regulatory/Financial', 'Environmental Risk'],
    ['Question Performance', 'Avg Score', 'Average score across all companies', 'Mean of scores from companies that answered this question', '66.7'],
    ['Question Performance', 'Companies Analyzed', 'Number of companies that answered this question', 'Count of companies with evidence for this question', '4'],
    ['Question Performance', 'Total Snippets', 'Total evidence snippets across all companies', 'Sum of snippets from all companies for this question', '12'],
    ['Question Performance', 'Full Disclosure Count', 'Companies with complete evidence', 'Count of companies with at least one FULL_DISCLOSURE snippet', '2'],
    ['Question Performance', 'Avg Financial Rate %', 'Average financial transparency', 'Mean financial quantification rate across companies', '45.0%'],

    // Category Analysis
    ['Category Analysis', 'Category', 'Risk category name', 'One of four risk categories', 'Environmental Risk'],
    ['Category Analysis', 'Avg Score', 'Average score for this category', 'Mean of all question scores in category', '58.6'],
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
    ['Snippet Raw Data', 'Classification', 'Quality of evidence', 'FULL_DISCLOSURE, PARTIAL, UNCLEAR, or NO_DISCLOSURE', 'PARTIAL'],
    ['Snippet Raw Data', 'Framing', 'Narrative perspective', 'Risk, Opportunity, Neutral, or Both', 'Risk'],
    ['Snippet Raw Data', 'Financial Type', 'Level of financial detail', 'Full (explicit $), Partial (relative terms), or Non-Financial', 'Partial'],
    ['Snippet Raw Data', 'Timeframe', 'Temporal orientation', 'Current, Future, Historical, or Multiple/Unclear', 'Forward-looking'],
    ['Snippet Raw Data', 'Financial Score (0-3)', 'Points for financial transparency', '3=Full, 2=Partial, 1=Non-Financial', '2'],
    ['Snippet Raw Data', 'Temporal Score (0-3)', 'Points for time specificity', '3=Current, 2=Future, 1=Historical, 0=Unclear', '2'],
    ['Snippet Raw Data', 'Narrative Score (1-3)', 'Points for framing balance', '3=Both, 2=Risk or Opportunity, 1=Neutral', '2'],
    ['Snippet Raw Data', 'Total Score (0-100)', 'Composite quality score', '(Financial + Temporal + Narrative) / 9 × 100', '66.7'],
    ['Snippet Raw Data', 'Financial Amounts', 'Extracted monetary values', 'Currency, amount, and context', 'USD 10000000 (investment cost)'],

    // Verification Report
    ['Verification Report', 'Verified Date', 'When verification was performed', 'ISO date from verification process', '2025-11-04'],
    ['Verification Report', 'Verification Model', 'AI model used for verification', 'Model name and version', 'gemini-2.5-pro'],
    ['Verification Report', 'Pass Rate %', 'Percentage of snippets that passed verification', '(Total - Removed - Corrected) / Total × 100', '94.7%'],
    ['Verification Report', 'Snippets Removed', 'Low-quality snippets removed', 'Count of snippets deleted during verification', '1'],
    ['Verification Report', 'Snippets Corrected', 'Snippets with corrections', 'Count of snippets modified during verification', '6'],
    ['Verification Report', 'Questions Modified', 'Questions affected by verification', 'List of question IDs that had changes', '99903, 99911'],
    ['Verification Report', 'Total Original Snippets', 'Count before verification', 'Original snippet count + Removed', '39'],
    ['Verification Report', 'Total Final Snippets', 'Count after verification', 'Current snippet count in verified file', '38']
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
// Helper Functions
// ============================================================================

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
