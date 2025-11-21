import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import xlsx from "xlsx";
import { generateExcelWorkbook, saveWorkbookToFile } from "../../src/utils/excelGenerator";

type SnippetRow = Record<string, any>;

type CollapsedLabel = "Disclosure" | "No disclosure/unclear";

type ClassificationLabel = "FULL_DISCLOSURE" | "PARTIAL" | "UNCLEAR" | "NO_DISCLOSURE";

interface Snippet {
  snippet_id: string;
  quote: string;
  source: string;
  source_versions: string[];
  classification: ClassificationLabel;
  classification_justification: string;
  categorization: {
    framing?: string;
    framing_justification?: string;
    financial_type?: string;
    financial_justification?: string;
    timeframe?: string;
    timeframe_justification?: string;
  };
  financial_amounts: string[];
  verification_corrected?: boolean;
  comparison_status?: string;
  correction_note?: string;
  original_classification?: ClassificationLabel;
  reviewer_classification_missing?: boolean;
  annotations: {
    analyst?: string;
    relevant_risk?: string;
    duplicate?: string;
    notes?: string;
    remove_from_analysis?: string;
    highlight?: string;
    correct_classification?: string;
  };
}

interface Question {
  question_id: string;
  question_text: string;
  category: string;
  sub_category?: string;
  question_number?: number;
  disclosures: Snippet[];
  status?: string;
  applicability?: string;
}

interface SummaryStatistics {
  total_questions_analyzed: number;
  total_disclosure_snippets: number;
  classification_distribution: {
    FULL_DISCLOSURE: number;
    PARTIAL: number;
    UNCLEAR: number;
    NO_DISCLOSURE: number;
  };
  categories_covered: string[];
}

interface AnalysisResult {
  company_name: string;
  fiscal_year: number;
  version: string;
  model_used: string;
  analysis_date: string;
  schema_version: string;
  analysis_results: Question[];
  summary_statistics: SummaryStatistics;
  metadata?: Record<string, any>;
}

interface CompanyBundle {
  company: string;
  year: number;
  version: string;
  verified: AnalysisResult;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(
  process.cwd(),
  "reports",
  "team_reviewed",
  // "2025-11-11 AG_Verification_Deduped_Reviewed v0_01NG.xlsx",
  "AG_Verification_Deduped_Reviewed_and_fixed.xlsx"
);

const OUTPUT_JSON_DIR = path.join(process.cwd(), "results", "team_reviewed_json");
const OUTPUT_EXCEL_FILE = path.join(
  process.cwd(),
  "reports",
  "team_reviewed",
  "team_reviewed_output.xlsx"
);

const RAW_SHEET = "Snippet Raw Data";

const COLLAPSE_MAP: Record<string, CollapsedLabel> = {
  FULL_DISCLOSURE: "Disclosure",
  PARTIAL: "Disclosure",
  UNCLEAR: "No disclosure/unclear",
  NO_DISCLOSURE: "No disclosure/unclear"
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readRaw(): SnippetRow[] {
  const wb = xlsx.readFile(INPUT_FILE, { cellDates: false });
  const sheet = wb.Sheets[RAW_SHEET];
  if (!sheet) throw new Error(`Sheet "${RAW_SHEET}" not found in ${INPUT_FILE}`);
  return xlsx.utils.sheet_to_json(sheet, { defval: "" });
}

function normalizeClassification(value: string): ClassificationLabel {
  const val = (value || "").toUpperCase().trim().replace(/\s+/g, "_");
  if (val === "FULL_DISCLOSURE" || val === "PARTIAL" || val === "UNCLEAR" || val === "NO_DISCLOSURE") {
    return val;
  }
  return "UNCLEAR";
}

function toArray(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map(v => v.trim())
    .filter(Boolean);
}

function buildCompanyBundles(rawRows: SnippetRow[]): CompanyBundle[] {
  const filtered = rawRows.filter(
    row => String(row["Remove from Analysis?"] || "").trim().toUpperCase() !== "YES"
  );

  // Group by company/year/question based on raw snippet presence
  const byCompanyYearQuestion = new Map<string, Question>();

  filtered.forEach(row => {
    const company = String(row["Company"] || "").trim();
    const year = Number(row["Year"] || 0);
    const questionId = String(row["Question ID"] || "").trim();
    const questionText = String(row["Question Text"] || "").trim();
    const category = String(row["Category"] || "").trim();
    const status = String(row["Status"] || "").trim();
    const applicability = String(row["Applicability"] || "").trim();

    const qKey = `${company}::${year}::${questionId}`;
    if (!byCompanyYearQuestion.has(qKey)) {
      byCompanyYearQuestion.set(qKey, {
        question_id: questionId,
        question_text: questionText,
        category,
        status,
        applicability,
        sub_category: "",
        disclosures: []
      });
    }

    const originalClassification = normalizeClassification(String(row["Classification"] || ""));
    const reviewerClassificationRaw = String(row["Correct Classification?"] || "").trim();
    const reviewerClassification = reviewerClassificationRaw
      ? normalizeClassification(reviewerClassificationRaw)
      : "";
    const finalClassification = (reviewerClassification || originalClassification) as ClassificationLabel;
    const reviewerMissing = !reviewerClassification;

    const snippet: Snippet = {
      snippet_id: String(row["Snippet ID"] || "").trim(),
      quote: String(row["Quote"] || "").trim(),
      source: String(row["Source"] || "").trim(),
      source_versions: toArray(String(row["Source Versions"] || "")),
      classification: finalClassification,
      classification_justification: String(row["Classification Justification"] || "").trim(),
      categorization: {
        framing: String(row["Framing"] || "").trim(),
        framing_justification: String(row["Framing Justification"] || "").trim(),
        financial_type: String(row["Financial Type"] || "").trim(),
        financial_justification: String(row["Financial Justification"] || "").trim(),
        timeframe: String(row["Timeframe"] || "").trim(),
        timeframe_justification: String(row["Timeframe Justification"] || "").trim()
      },
      financial_amounts: toArray(String(row["Financial Amounts"] || "")),
      verification_corrected: String(row["Verification Corrected"] || "").trim().toLowerCase() === "yes",
      comparison_status: String(row["Comparison Status"] || "").trim(),
      correction_note: String(row["Correction Note"] || "").trim(),
      original_classification: originalClassification,
      reviewer_classification_missing: reviewerMissing,
      annotations: {
        analyst: String(row["ANALYST"] || "").trim(),
        relevant_risk: String(row["Relevant Risk?"] || "").trim(),
        duplicate: String(row["Duplicate?"] || "").trim(),
        notes: String(row["Notes"] || "").trim(),
        remove_from_analysis: String(row["Remove from Analysis?"] || "").trim().toUpperCase(),
        highlight: String(row["Highlight"] || "").trim(),
        correct_classification: reviewerClassificationRaw
      }
    };

    byCompanyYearQuestion.get(qKey)!.disclosures.push(snippet);
  });

  // Group by company/year
  const byCompanyYear = new Map<string, Question[]>();
  byCompanyYearQuestion.forEach((question, key) => {
    const [company, yearStr] = key.split("::");
    const year = Number(yearStr);
    const cyKey = `${company}::${year}`;
    if (!byCompanyYear.has(cyKey)) byCompanyYear.set(cyKey, []);
    byCompanyYear.get(cyKey)!.push(question);
  });

  const bundles: CompanyBundle[] = [];
  const now = new Date().toISOString();

  byCompanyYear.forEach((questionsArr, key) => {
    const [company, yearStr] = key.split("::");
    const year = Number(yearStr);

    const summary = (() => {
      const dist = {
        FULL_DISCLOSURE: 0,
        PARTIAL: 0,
        UNCLEAR: 0,
        NO_DISCLOSURE: 0
      } as Record<string, number>;
      let totalSnippets = 0;
      questionsArr.forEach(q => {
        q.disclosures.forEach(s => {
          totalSnippets += 1;
          if (s.classification in dist) {
            dist[s.classification] += 1;
          }
        });
      });
      return {
        total_questions_analyzed: questionsArr.length,
        total_disclosure_snippets: totalSnippets,
        classification_distribution: dist,
        categories_covered: Array.from(new Set(questionsArr.map(q => q.category).filter(Boolean)))
      } as SummaryStatistics;
    })();

    const analysisResult: AnalysisResult = {
      company_name: company,
      fiscal_year: year,
      version: "team-reviewed",
      model_used: "team-reviewed",
      analysis_date: now,
      schema_version: "team-reviewed-v1",
      analysis_results: questionsArr,
      summary_statistics: summary,
      metadata: {
        source_excel: path.basename(INPUT_FILE)
      }
    };

    bundles.push({
      company,
      year,
      version: "team-reviewed",
      verified: analysisResult
    });
  });

  return bundles;
}

function collapseClassification(cls: string): CollapsedLabel {
  const key = cls.toUpperCase().trim();
  return COLLAPSE_MAP[key] ?? "No disclosure/unclear";
}

function writeJsonFiles(bundles: CompanyBundle[]) {
  ensureDir(OUTPUT_JSON_DIR);

  const combined: any[] = [];
  const combinedCollapsed: any[] = [];

  bundles.forEach(bundle => {
    const baseName = `${bundle.company}_${bundle.year}_team_reviewed`;
    const outPath = path.join(OUTPUT_JSON_DIR, `${baseName}.json`);
    fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), "utf-8");
    combined.push(bundle);

    const collapsed = JSON.parse(JSON.stringify(bundle)) as CompanyBundle;
    collapsed.verified.analysis_results.forEach(q => {
      q.disclosures.forEach(s => {
        (s as any).collapsed_classification = collapseClassification(s.classification);
      });
    });
    const collapsedPath = path.join(OUTPUT_JSON_DIR, `${baseName}_collapsed.json`);
    fs.writeFileSync(collapsedPath, JSON.stringify(collapsed, null, 2), "utf-8");
    combinedCollapsed.push(collapsed);
  });

  fs.writeFileSync(
    path.join(OUTPUT_JSON_DIR, `team_reviewed_combined.json`),
    JSON.stringify(combined, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(OUTPUT_JSON_DIR, `team_reviewed_combined_collapsed.json`),
    JSON.stringify(combinedCollapsed, null, 2),
    "utf-8"
  );
}

async function writeExcel(
  bundles: CompanyBundle[],
  rawRows: SnippetRow[],
  reclassStats: ReturnType<typeof computeReclassStats>
) {
  // Prepare data for the multi-sheet generator
  const companyDataArray = bundles.map(b => ({
    company: b.company,
    year: b.year,
    version: b.version,
    model: b.verified.model_used,
    verified: b.verified,
    hasComparison: false
  })) as any[];

  const workbook = await generateExcelWorkbook(companyDataArray);

  // Reviewer annotations sheet
  const flatRows: any[] = [];
  bundles.forEach(bundle => {
    bundle.verified.analysis_results.forEach(q => {
      q.disclosures.forEach(s => {
        flatRows.push({
          Company: bundle.company,
          Year: bundle.year,
          Version: bundle.version,
          "Question ID": q.question_id,
          "Question Text": q.question_text,
          Category: q.category,
          Status: q.status,
          Applicability: q.applicability,
          "Snippet ID": s.snippet_id,
          Quote: s.quote,
          Source: s.source,
          "Source Versions": (s.source_versions || []).join(", "),
          Classification: s.original_classification || s.classification,
          "Classification Justification": s.classification_justification,
          Framing: s.categorization.framing,
          "Framing Justification": s.categorization.framing_justification,
          "Financial Type": s.categorization.financial_type,
          "Financial Justification": s.categorization.financial_justification,
          Timeframe: s.categorization.timeframe,
          "Timeframe Justification": s.categorization.timeframe_justification,
          "Financial Amounts": (s.financial_amounts || []).join(", "),
          "Verification Corrected": s.verification_corrected ? "Yes" : "",
          "Comparison Status": s.comparison_status || "",
          "Correction Note": s.correction_note || "",
          ANALYST: s.annotations.analyst || "",
          "Relevant Risk?": s.annotations.relevant_risk || "",
          "Duplicate?": s.annotations.duplicate || "",
          "Correct Classification?": s.annotations.correct_classification || "",
          Notes: s.annotations.notes || "",
          "Remove from Analysis?": s.annotations.remove_from_analysis || "",
          Highlight: s.annotations.highlight || "",
          FinalClassification: s.classification,
          CollapsedClassification: collapseClassification(s.classification)
        });
      });
    });
  });

  const annotationsSheet = workbook.addWorksheet("Reviewer Annotations", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 1 }]
  });
  if (flatRows.length > 0) {
    annotationsSheet.columns = Object.keys(flatRows[0]).map(key => ({ header: key, key }));
    flatRows.forEach(row => annotationsSheet.addRow(row));
  }

  // Reviewer summary sheet (based on raw rows and bundle stats)
  const summarySheet = workbook.addWorksheet("Reviewer Summary", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 1 }]
  });

  const qSetByCompanyYear = new Map<string, Set<string>>();
  filteredQuestionsFromRaw(rawRows).forEach((set, key) => qSetByCompanyYear.set(key, set));

  const removedCounts = new Map<string, number>();
  rawRows.forEach(r => {
    const key = `${String(r["Company"] || "").trim()}::${Number(r["Year"] || 0)}`;
    if (String(r["Remove from Analysis?"] || "").trim().toUpperCase() === "YES") {
      removedCounts.set(key, (removedCounts.get(key) || 0) + 1);
    }
  });

  summarySheet.columns = [
    { header: "Company", key: "Company" },
    { header: "Year", key: "Year" },
    { header: "Canonical Questions", key: "Canonical" },
    { header: "Questions Answered", key: "Answered" },
    { header: "Questions w/ No Disclosure", key: "NoDisclosureQs" },
    { header: "Total Snippets", key: "TotalSnippets" },
    { header: "Highlights", key: "Highlights" },
    { header: "Duplicates", key: "Duplicates" },
    { header: "Snippets Removed", key: "Removed" }
  ];

  bundles.forEach(bundle => {
    const key = `${bundle.company}::${bundle.year}`;
    const canonical = qSetByCompanyYear.get(key)?.size || 0;

    let answered = 0;
    let noDisclosureQs = 0;
    let totalSnippets = 0;
    let highlights = 0;
    let duplicates = 0;

    bundle.verified.analysis_results.forEach(q => {
      const hasReal = q.disclosures.some(d => !d.snippet_id.endsWith("-NO-DISCLOSURE"));
      if (hasReal) answered += 1; else noDisclosureQs += 1;
      totalSnippets += q.disclosures.length;
      q.disclosures.forEach(s => {
        if ((s.annotations.highlight || "").toUpperCase() === "YES") highlights += 1;
        if ((s.annotations.duplicate || "").toUpperCase() === "YES") duplicates += 1;
      });
    });

    summarySheet.addRow({
      Company: bundle.company,
      Year: bundle.year,
      Canonical: canonical,
      Answered: answered,
      NoDisclosureQs: noDisclosureQs,
      TotalSnippets: totalSnippets,
      Highlights: highlights,
      Duplicates: duplicates,
      Removed: removedCounts.get(key) || 0
    });
  });

  addReclassSheet(workbook, reclassStats);

  await saveWorkbookToFile(workbook, OUTPUT_EXCEL_FILE);
}

function filteredQuestionsFromRaw(rawRows: SnippetRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  rawRows.forEach(r => {
    if (String(r["Remove from Analysis?"] || "").trim().toUpperCase() === "YES") return;
    const key = `${String(r["Company"] || "").trim()}::${Number(r["Year"] || 0)}`;
    const qid = String(r["Question ID"] || "").trim();
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(qid);
  });
  return map;
}

type TransitionBucket = {
  orig: ClassificationLabel;
  final: ClassificationLabel;
  count: number;
};

function deriveFinalClassification(row: SnippetRow): { orig: ClassificationLabel; final: ClassificationLabel } {
  const original = normalizeClassification(String(row["Classification"] || ""));
  const reviewerRaw = String(row["Correct Classification?"] || "").trim();
  const reviewer = reviewerRaw ? normalizeClassification(reviewerRaw) : "";
  return {
    orig: original,
    final: (reviewer || original) as ClassificationLabel
  };
}

function computeReclassStats(rawRows: SnippetRow[]) {
  const kept = rawRows.filter(
    row => String(row["Remove from Analysis?"] || "").trim().toUpperCase() !== "YES"
  );

  const origTotals = new Map<ClassificationLabel, number>();
  const changeTotals = new Map<ClassificationLabel, number>();
  const transitions = new Map<string, number>();
  const categoryChanges = new Map<string, number>();
  const framingChanges = new Map<string, number>();
  const timeframeChanges = new Map<string, number>();
  const collapsedCounts = new Map<string, number>();

  kept.forEach(row => {
    const { orig, final } = deriveFinalClassification(row);
    const cat = String(row["Category"] || "Unknown").trim() || "Unknown";
    const framing = String(row["Framing"] || "Unknown").trim() || "Unknown";
    const timeframe = String(row["Timeframe"] || "Unknown").trim() || "Unknown";

    origTotals.set(orig, (origTotals.get(orig) || 0) + 1);
    const transKey = `${orig}__${final}`;
    transitions.set(transKey, (transitions.get(transKey) || 0) + 1);
    collapsedCounts.set(collapseClassification(final), (collapsedCounts.get(collapseClassification(final)) || 0) + 1);

    if (orig !== final) {
      changeTotals.set(orig, (changeTotals.get(orig) || 0) + 1);
      categoryChanges.set(cat, (categoryChanges.get(cat) || 0) + 1);
      framingChanges.set(framing, (framingChanges.get(framing) || 0) + 1);
      timeframeChanges.set(timeframe, (timeframeChanges.get(timeframe) || 0) + 1);
    }
  });

  const totalRemoved = rawRows.length - kept.length;

  const transitionBuckets: TransitionBucket[] = [];
  transitions.forEach((count, key) => {
    const [orig, final] = key.split("__") as [ClassificationLabel, ClassificationLabel];
    transitionBuckets.push({ orig, final, count });
  });

  return {
    keptCount: kept.length,
    removedCount: totalRemoved,
    origTotals,
    changeTotals,
    transitionBuckets,
    categoryChanges,
    framingChanges,
    timeframeChanges,
    collapsedCounts
  };
}

function addReclassSheet(workbook: any, stats: ReturnType<typeof computeReclassStats>) {
  const sheet = workbook.addWorksheet("Reclassification Stats", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 1 }]
  });

  sheet.addRow(["Total rows (kept)", stats.keptCount]);
  sheet.addRow(["Rows removed", stats.removedCount]);
  stats.collapsedCounts.forEach((v, k) => sheet.addRow([`Final ${k}`, v]));
  sheet.addRow([]);

  const classOrder: ClassificationLabel[] = ["FULL_DISCLOSURE", "PARTIAL", "UNCLEAR", "NO_DISCLOSURE"];
  const matrixHeader = ["orig/final", ...classOrder];
  sheet.addRow(matrixHeader);
  classOrder.forEach(orig => {
    const row: (string | number)[] = [orig];
    classOrder.forEach(final => {
      const found = stats.transitionBuckets.find(t => t.orig === orig && t.final === final);
      row.push(found ? found.count : 0);
    });
    sheet.addRow(row);
  });
  sheet.addRow([]);

  sheet.addRow(["Orig bucket", "Total", "Changed", "% Changed"]);
  classOrder.forEach(orig => {
    const total = stats.origTotals.get(orig) || 0;
    const changed = stats.changeTotals.get(orig) || 0;
    const pct = total ? (changed / total) * 100 : 0;
    sheet.addRow([orig, total, changed, Number(pct.toFixed(1))]);
  });
  sheet.addRow([]);

  sheet.addRow(["Changes by Category", "Count"]);
  Array.from(stats.categoryChanges.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => sheet.addRow([cat, count]));
  sheet.addRow([]);

  sheet.addRow(["Changes by Framing", "Count"]);
  Array.from(stats.framingChanges.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([framing, count]) => sheet.addRow([framing, count]));
  sheet.addRow([]);

  sheet.addRow(["Changes by Timeframe", "Count"]);
  Array.from(stats.timeframeChanges.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([time, count]) => sheet.addRow([time, count]));
}

function main() {
  console.log("[INFO] Team-reviewed ingest starting...");
  const rawRows = readRaw();
  const bundles = buildCompanyBundles(rawRows);
  writeJsonFiles(bundles);
  const reclassStats = computeReclassStats(rawRows);
  writeExcel(bundles, rawRows, reclassStats);
  console.log("[SUCCESS] Outputs written to:");
  console.log(` - JSON dir: ${OUTPUT_JSON_DIR}`);
  console.log(` - Excel: ${OUTPUT_EXCEL_FILE}`);
}

main();
