import ExcelJS from 'exceljs';
import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { CompanyYearData, Question, CrossQuestionReviewDecision } from '../types/analysis';

export interface ReviewDecisionDetail {
  key: string;
  company: string;
  year?: number;
  version?: string;
  model?: string;
  question_id: string;
  question_text: string;
  snippet_id: string;
  classification?: string;
  snippet_text: string;
  belongs: boolean;
  confidence?: number;
  rationale?: string;
  notes?: string;
  source_file?: string;
  other_questions: Array<{
    question_id: string;
    question_text: string;
    snippet_id?: string;
  }>;
}

export type ReviewDecisionLookup = Map<string, ReviewDecisionDetail>;

export interface CompanySummaryRow {
  company: string;
  year: number;
  model: string;
  mergedSnippets: number;
  reviewedSnippets: number;
  removedSnippets: number;
  removedPercentage: number;
  questionsImpacted: number;
  reviewStatusSummary: string;
  reviewAppliedAt?: string;
  sourceMergedFilename?: string;
  reviewedFilename?: string;
}

export interface RemovedSnippetRow {
  company: string;
  year: number;
  model: string;
  question_id: string;
  question_text: string;
  snippet_id: string;
  classification?: string;
  source: string;
  quote: string;
  reviewStatus?: string;
  reviewSummary?: string;
  decisionAction?: string;
  decisionBelongs?: boolean;
  decisionConfidence?: number;
  decisionRationale?: string;
  decisionNotes?: string;
  otherQuestionsNote?: string;
}

export interface ComparisonData {
  summaries: CompanySummaryRow[];
  removedSnippets: RemovedSnippetRow[];
  decisionLog: ReviewDecisionDetail[];
}

const DEFAULT_REVIEW_STATUS = 'clean';

function makeDecisionKey(company: string, questionId: string, snippetId: string): string {
  return `${company.toLowerCase()}::${questionId}::${snippetId}`;
}

function parseSourceMetadata(rawPath: string) {
  if (!rawPath) {
    return {};
  }

  const normalized = rawPath.replace(/\\/g, '/');
  const base = basename(normalized).replace(/\.json$/i, '');
  const cleanBase = base
    .replace('_deduped_and_reviewed', '')
    .replace('_deduped', '');

  const parts = cleanBase.split('_');
  const company = parts[0] || 'Unknown';
  const year = Number.parseInt(parts[1], 10);
  const version = parts[2];
  const model = parts[3];

  return {
    company,
    year: Number.isFinite(year) ? year : undefined,
    version,
    model
  };
}

export async function loadReviewDecisionLookup(filePath: string): Promise<ReviewDecisionLookup> {
  const lookup: ReviewDecisionLookup = new Map();

  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let entry: any;
      try {
        entry = JSON.parse(line);
      } catch (error) {
        console.warn(`[WARN] Failed to parse review JSONL line: ${error}`);
        continue;
      }

      const sourceMeta = parseSourceMetadata(entry.source_file || '');
      const decisions = new Map<string, any>(
        (entry.llm_output?.decisions || []).map((decision: any) => [decision.question_id, decision])
      );

      for (const question of entry.questions || []) {
        const decision = decisions.get(question.question_id);
        if (!decision) continue;

        const key = makeDecisionKey(sourceMeta.company || 'Unknown', question.question_id, question.snippet_id);
        lookup.set(key, {
          key,
          company: sourceMeta.company || 'Unknown',
          year: sourceMeta.year,
          version: sourceMeta.version,
          model: sourceMeta.model,
          question_id: question.question_id,
          question_text: question.question_text,
          snippet_id: question.snippet_id,
          classification: question.classification,
          snippet_text: entry.snippet,
          belongs: decision.belongs,
          confidence: decision.confidence,
          rationale: decision.rationale,
          notes: entry.llm_output?.notes,
          source_file: entry.source_file,
          other_questions: (entry.questions || [])
            .filter((other: any) => other.question_id !== question.question_id)
            .map((other: any) => ({
              question_id: other.question_id,
              question_text: other.question_text,
              snippet_id: other.snippet_id
            }))
        });
      }
    }
  } catch (error: any) {
    console.warn(`[WARN] Could not read review log "${filePath}": ${error?.message || error}`);
  }

  return lookup;
}

function countSnippets(dataset: CompanyYearData): number {
  return dataset.verified.analysis_results.reduce(
    (sum, question) => sum + question.disclosures.length,
    0
  );
}

function buildQuestionMap(dataset: CompanyYearData): Map<string, Question> {
  const map = new Map<string, Question>();
  dataset.verified.analysis_results.forEach(question => {
    map.set(question.question_id, question);
  });
  return map;
}

function countReviewStatuses(dataset: CompanyYearData): string {
  const statusCounts = new Map<string, number>();
  dataset.verified.analysis_results.forEach(question => {
    const status = question.cross_question_review?.status || DEFAULT_REVIEW_STATUS;
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });

  return Array.from(statusCounts.entries())
    .map(([status, count]) => `${status}: ${count}`)
    .join(' | ');
}

function getDatasetKey(dataset: CompanyYearData): string {
  return `${dataset.company.toLowerCase()}::${dataset.year}::${(dataset.model || '').toLowerCase()}`;
}

function buildDecisionLookupFromQuestion(question?: Question | null) {
  const map = new Map<string, CrossQuestionReviewDecision>();
  if (!question?.cross_question_review?.decisions) {
    return map;
  }

  question.cross_question_review.decisions.forEach(decision => {
    if (decision?.snippet_id) {
      map.set(decision.snippet_id, decision);
    }
  });

  return map;
}

function formatOtherQuestions(detail?: ReviewDecisionDetail): string | undefined {
  if (!detail || detail.other_questions.length === 0) {
    return undefined;
  }

  return detail.other_questions
    .map(other => `${other.question_id}: ${other.question_text}`)
    .join(' | ');
}

export function buildMergedReviewedComparisonData(
  mergedData: CompanyYearData[],
  reviewedData: CompanyYearData[],
  decisionLookup: ReviewDecisionLookup
): ComparisonData {
  const reviewedMap = new Map<string, CompanyYearData>();
  reviewedData.forEach(dataset => reviewedMap.set(getDatasetKey(dataset), dataset));

  const summaries: CompanySummaryRow[] = [];
  const removedSnippets: RemovedSnippetRow[] = [];
  const decisionCompanies = new Set<string>();

  mergedData.forEach(mergedDataset => {
    const reviewedDataset = reviewedMap.get(getDatasetKey(mergedDataset));
    if (!reviewedDataset) {
      return;
    }

    decisionCompanies.add(mergedDataset.company.toLowerCase());

    const mergedQuestions = buildQuestionMap(mergedDataset);
    const reviewedQuestions = buildQuestionMap(reviewedDataset);

    const mergedSnippetCount = countSnippets(mergedDataset);
    const reviewedSnippetCount = countSnippets(reviewedDataset);
    let removedCount = 0;
    const impactedQuestions = new Set<string>();

    mergedQuestions.forEach((question, questionId) => {
      const reviewedQuestion = reviewedQuestions.get(questionId);
      const reviewedSnippetIds = new Set(
        (reviewedQuestion?.disclosures || []).map(snippet => snippet.snippet_id)
      );
      const questionDecisionLookup = buildDecisionLookupFromQuestion(reviewedQuestion);

      question.disclosures.forEach(snippet => {
        if (reviewedSnippetIds.has(snippet.snippet_id)) {
          return;
        }

        removedCount += 1;
        impactedQuestions.add(questionId);

        const localDecision = questionDecisionLookup.get(snippet.snippet_id);
        const decisionKey = makeDecisionKey(mergedDataset.company, questionId, snippet.snippet_id);
        const reviewDecision = localDecision ? undefined : decisionLookup.get(decisionKey);
        const rationale = localDecision?.rationale || reviewDecision?.rationale;
        const confidence = localDecision?.confidence ?? reviewDecision?.confidence;
        const action = localDecision?.action || (localDecision ? (localDecision.belongs ? 'kept' : 'removed') : undefined);

        removedSnippets.push({
          company: mergedDataset.company,
          year: mergedDataset.year,
          model: mergedDataset.model,
          question_id: questionId,
          question_text: question.question_text,
          snippet_id: snippet.snippet_id,
          classification: snippet.classification,
          source: snippet.source,
          quote: snippet.quote,
          reviewStatus: reviewedQuestion?.cross_question_review?.status || DEFAULT_REVIEW_STATUS,
          reviewSummary: reviewedQuestion?.cross_question_review?.summary,
          decisionAction: action,
          decisionBelongs: localDecision?.belongs ?? reviewDecision?.belongs,
          decisionConfidence: confidence,
          decisionRationale: rationale,
          decisionNotes: reviewDecision?.notes,
          otherQuestionsNote: formatOtherQuestions(reviewDecision)
        });
      });
    });

    summaries.push({
      company: mergedDataset.company,
      year: mergedDataset.year,
      model: mergedDataset.model,
      mergedSnippets: mergedSnippetCount,
      reviewedSnippets: reviewedSnippetCount,
      removedSnippets: removedCount,
      removedPercentage: mergedSnippetCount === 0 ? 0 : removedCount / mergedSnippetCount,
      questionsImpacted: impactedQuestions.size,
      reviewStatusSummary: countReviewStatuses(reviewedDataset),
      reviewAppliedAt: reviewedDataset.reviewMetadata?.reviewAppliedAt || reviewedDataset.verified.metadata?.analysis_date,
      sourceMergedFilename: mergedDataset.mergedMetadata?.mergedFilename,
      reviewedFilename: reviewedDataset.reviewMetadata?.reviewedFilename
    });
  });

  const decisionLog = Array.from(decisionLookup.values()).filter(detail =>
    decisionCompanies.has(detail.company.toLowerCase())
  );

  return {
    summaries,
    removedSnippets,
    decisionLog
  };
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5F5' } }
    };
  });
}

function autoFilter(sheet: ExcelJS.Worksheet, range: string) {
  sheet.autoFilter = {
    from: {
      row: 1,
      column: 1
    },
    to: {
      row: sheet.rowCount,
      column: sheet.columnCount
    }
  };
  sheet.autoFilter.from = { row: 1, column: 1 };
  sheet.autoFilter.to = { row: sheet.rowCount, column: sheet.columnCount };
}

export function createMergedReviewedComparisonWorkbook(data: ComparisonData): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AG Verification Dashboard';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Company Overview', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  summarySheet.columns = [
    { header: 'Company', key: 'company', width: 22 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Model', key: 'model', width: 18 },
    { header: 'Merged Snippets', key: 'mergedSnippets', width: 18 },
    { header: 'Reviewed Snippets', key: 'reviewedSnippets', width: 20 },
    { header: 'Removed Snippets', key: 'removedSnippets', width: 18 },
    { header: '% Removed', key: 'removedPercentage', width: 14 },
    { header: 'Questions Impacted', key: 'questionsImpacted', width: 20 },
    { header: 'Review Status Summary', key: 'reviewStatusSummary', width: 40 },
    { header: 'Review Applied At', key: 'reviewAppliedAt', width: 22 },
    { header: 'Source Merged File', key: 'sourceMergedFilename', width: 32 },
    { header: 'Reviewed File', key: 'reviewedFilename', width: 32 }
  ];
  styleHeader(summarySheet.getRow(1));

  data.summaries.forEach(row => {
    summarySheet.addRow({
      ...row,
      removedPercentage: row.removedPercentage
    });
  });

  summarySheet.getColumn('removedPercentage').numFmt = '0.00%';
  autoFilter(summarySheet, `A1:L${summarySheet.rowCount}`);

  const removedSheet = workbook.addWorksheet('Removed Snippets', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  removedSheet.columns = [
    { header: 'Company', key: 'company', width: 20 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Model', key: 'model', width: 16 },
    { header: 'Question ID', key: 'question_id', width: 14 },
    { header: 'Question Text', key: 'question_text', width: 40 },
    { header: 'Snippet ID', key: 'snippet_id', width: 14 },
    { header: 'Classification', key: 'classification', width: 16 },
    { header: 'Source', key: 'source', width: 30 },
    { header: 'Quote', key: 'quote', width: 60 },
    { header: 'Review Status', key: 'reviewStatus', width: 18 },
    { header: 'Review Summary', key: 'reviewSummary', width: 40 },
    { header: 'Decision Action', key: 'decisionAction', width: 18 },
    { header: 'Belongs?', key: 'decisionBelongs', width: 10 },
    { header: 'Confidence', key: 'decisionConfidence', width: 12 },
    { header: 'Rationale', key: 'decisionRationale', width: 50 },
    { header: 'Other Questions', key: 'otherQuestionsNote', width: 40 },
    { header: 'Notes', key: 'decisionNotes', width: 30 }
  ];
  styleHeader(removedSheet.getRow(1));

  data.removedSnippets.forEach(row => {
    removedSheet.addRow(row);
  });
  autoFilter(removedSheet, `A1:P${removedSheet.rowCount}`);
  removedSheet.getColumn('quote').alignment = { wrapText: true };
  removedSheet.getColumn('decisionRationale').alignment = { wrapText: true };
  removedSheet.getColumn('reviewSummary').alignment = { wrapText: true };

  const decisionsSheet = workbook.addWorksheet('Decision Log', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  decisionsSheet.columns = [
    { header: 'Company', key: 'company', width: 20 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Question ID', key: 'question_id', width: 14 },
    { header: 'Question Text', key: 'question_text', width: 40 },
    { header: 'Snippet ID', key: 'snippet_id', width: 14 },
    { header: 'Belongs', key: 'belongs', width: 10 },
    { header: 'Confidence', key: 'confidence', width: 12 },
    { header: 'Rationale', key: 'rationale', width: 50 },
    { header: 'Snippet Text', key: 'snippet_text', width: 60 },
    { header: 'Source File', key: 'source_file', width: 40 },
    { header: 'Other Questions', key: 'other_questions', width: 40 },
    { header: 'Notes', key: 'notes', width: 30 }
  ];
  styleHeader(decisionsSheet.getRow(1));

  data.decisionLog.forEach(detail => {
    decisionsSheet.addRow({
      company: detail.company,
      year: detail.year,
      question_id: detail.question_id,
      question_text: detail.question_text,
      snippet_id: detail.snippet_id,
      belongs: detail.belongs,
      confidence: detail.confidence,
      rationale: detail.rationale,
      snippet_text: detail.snippet_text,
      source_file: detail.source_file,
      other_questions: formatOtherQuestions(detail),
      notes: detail.notes
    });
  });
  decisionsSheet.getColumn('rationale').alignment = { wrapText: true };
  decisionsSheet.getColumn('snippet_text').alignment = { wrapText: true };
  autoFilter(decisionsSheet, `A1:L${decisionsSheet.rowCount}`);

  return workbook;
}
