# Excel Export Guide

Complete guide for generating Excel reports from the AG Verification Dashboard data.

---

## Table of Contents

- [Quick Start](#quick-start)
- [What Gets Exported](#what-gets-exported)
- [Command-Line Usage](#command-line-usage)
- [Sheet Descriptions](#sheet-descriptions)
- [Use Cases & Examples](#use-cases--examples)
- [Understanding the Data](#understanding-the-data)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

---

## Quick Start

### Generate a Complete Report

```bash
npm run export:excel
```

This creates a comprehensive Excel file at:
```
reports/AG_Verification_Summary_YYYY-MM-DD.xlsx
```

The file contains all companies, all versions (v3, v4, etc.), and all available data across **7 sheets**.

---

## What Gets Exported

### Data Included

- **Companies**: All analyzed companies (ICL, Nutrien, SQM, Syngenta, Xinan, etc.)
- **Versions**: All schema versions (v3, v4, etc.)
- **Snippets**: All disclosure evidence snippets with full scoring
- **Questions**: All analyzed questions with cross-company performance
- **Categories**: Risk category breakdowns (Environmental, Human Health, Market/Business, Regulatory/Financial)
- **Metrics**: Comprehensive scoring across all dimensions

### What Your Colleague Asked For

✅ **Total snippets overall** - Executive Summary sheet
✅ **How they rated** - Classification distribution (Full/Partial/Unclear/No Disclosure)
✅ **Snippets per prompt** - Question Performance sheet
✅ **Snippets per company** - Company Details sheet

### Bonus Features Included

✅ Financial transparency metrics
✅ Temporal analysis (current/future/historical)
✅ Narrative framing breakdown
✅ Verification quality reports
✅ Category performance analysis
✅ Raw snippet-level data for custom analysis

---

## Command-Line Usage

### Basic Commands

```bash
# Export all data
npm run export:excel

# Export specific company
npm run export:excel -- --company Syngenta

# Export specific year
npm run export:excel -- --year 2024

# Export specific version only
npm run export:excel -- --version v4

# Combine filters
npm run export:excel -- --company Syngenta --version v4

# Custom output path
npm run export:excel -- --output reports/my-custom-report.xlsx
```

### Command-Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--company <name>` | Filter by company name (case-insensitive) | `--company Syngenta` |
| `--year <year>` | Filter by fiscal year | `--year 2024` |
| `--version <version>` | Filter by schema version | `--version v4` |
| `--output <path>` | Custom output file path | `--output reports/q4-report.xlsx` |
| `--help` or `-h` | Show help message | `--help` |

### Examples

```bash
# Compare v3 vs v4 data
npm run export:excel -- --version v3
npm run export:excel -- --version v4 --output reports/v4-analysis.xlsx

# Export single company for presentation
npm run export:excel -- --company Nutrien --output reports/nutrien-presentation.xlsx

# Export all 2024 data
npm run export:excel -- --year 2024

# Monthly report
npm run export:excel -- --output reports/monthly-report-$(date +%Y-%m).xlsx
```

---

## Sheet Descriptions

### Sheet 1: Executive Summary

**Purpose**: High-level overview for executives and stakeholders.

**Contains**:
- **Overall Statistics**
  - Total companies, questions, and snippets
  - Average disclosure scores
  - Average financial transparency rates
  - Average forward-looking disclosure rates

- **Rating Distribution**
  - Breakdown by classification type
  - Counts and percentages for Full/Partial/Unclear/No Disclosure

- **Snippets Per Company**
  - Company name, year, version
  - Total snippets count
  - Overall score and grade
  - Color-coded grades (Green=A, Yellow=C, Red=F)

- **Top 10 Questions**
  - Highest performing questions across all companies
  - Average scores and snippet counts

**Best For**: Executive presentations, board meetings, summary reports

---

### Sheet 2: Company Details

**Purpose**: Complete metrics for each company-year-version combination.

**Contains** (24 columns):
- Basic info: Company, Year, Version, Model
- Overall performance: Score, Grade
- Question metrics: Questions analyzed/answered
- Snippet metrics: Total snippets, average per question
- Classification breakdown: Full, Partial, Unclear, No Disclosure counts
- Transparency metrics: Financial %, Forward-looking %, Narrative balance %
- Category scores: Individual scores for all 4 risk categories
- Verification data: Pass rate, snippets removed/corrected

**Features**:
- Auto-filter enabled on all columns
- Conditional formatting for easy pattern recognition
- Sortable by any metric

**Best For**: Detailed company analysis, benchmarking, trend identification

---

### Sheet 3: Question Performance

**Purpose**: Cross-company question rankings and analysis.

**Contains**:
- Question ranking (1 = best performing)
- Question ID and full text
- Category assignment
- Average score across all companies
- Number of companies that analyzed this question
- Total snippets across all companies
- Full disclosure count (companies with perfect evidence)
- Average financial quantification rate

**Features**:
- Color-coded scores (Green ≥90%, Red <60%)
- Sortable by performance
- Identifies best practices and improvement areas

**Best For**: Identifying strong vs. weak disclosure areas, best practice benchmarking

---

### Sheet 4: Category Analysis

**Purpose**: Risk category performance breakdown by company.

**Contains**:
- Company, Year, Version
- Category name (Environmental, Human Health, Market/Business, Regulatory/Financial)
- Average score for category
- Total questions and questions answered
- Total snippets in category
- Average evidence depth
- Financial transparency rate
- Forward-looking disclosure rate
- Narrative balance rate
- Category grade

**Features**:
- Pivot-table friendly structure
- Color-coded grades
- Auto-filter enabled

**Best For**: Category-specific analysis, risk area prioritization, regulatory reporting

---

### Sheet 5: Snippet Raw Data

**Purpose**: Complete granular data for all snippets (power users).

**Contains** (22 columns per snippet):
- **Identification**: Company, Year, Version, Question ID, Snippet ID
- **Content**: Quote text, source document/page/section
- **Classification**: Type and justification
- **Scoring Dimensions**:
  - Framing (Risk/Opportunity/Neutral/Both) + justification
  - Financial Type (Full/Partial/Non-Financial) + justification
  - Timeframe (Current/Future/Historical/Unclear) + justification
- **Scores**:
  - Financial score (0-3)
  - Temporal score (0-3)
  - Narrative score (1-3)
  - Total score (0-100)
- **Financial Amounts**: Extracted monetary values with currency and context

**Features**:
- All raw data for custom analysis
- Perfect for pivot tables
- Enables statistical analysis in R, Python, etc.
- Auto-filter enabled

**Best For**: Deep-dive analysis, statistical modeling, custom reporting, data science

---

### Sheet 6: Verification Report

**Purpose**: Quality assurance and verification metrics.

**Contains**:
- Company and year
- Verification date
- Verification model used (e.g., gemini-2.5-pro)
- Pass rate percentage
- Snippets removed (quality issues)
- Snippets corrected
- Questions modified (list)
- Original snippet count
- Final snippet count after verification

**Features**:
- Color-coded pass rates (Green ≥95%, Yellow ≥90%, Orange ≥80%)
- Shows quality improvement process
- Documents AI verification process

**Best For**: Quality reporting, methodology documentation, audit trails

---

### Sheet 7: Column Reference

**Purpose**: Self-service documentation for understanding all column meanings and calculations.

**Contains**:
- **Sheet Name**: Which sheet the column appears in
- **Column Name**: Exact name of the column
- **Description**: Plain English explanation of what the column represents
- **Calculation/Source**: How the value is calculated or where it comes from
- **Example Value**: Sample data to illustrate typical values

**Coverage** (55+ columns explained):
- Executive Summary: All summary statistics and metrics
- Company Details: All 24 company-level columns
- Question Performance: Cross-company question metrics
- Category Analysis: Risk category performance measures
- Snippet Raw Data: All 22 snippet-level data points
- Verification Report: Quality assurance metrics

**Features**:
- Auto-filter enabled for easy searching
- Organized by sheet name
- Searchable reference for all metrics
- No need to ask what columns mean - it's all documented

**Best For**: Understanding the data model, training new team members, clarifying metric definitions

**Example entries**:
- "Companies Analyzed" in Question Performance = "Number of companies that answered this question"
- "Financial Quantification Rate" = "Percentage of snippets with explicit monetary amounts"
- "Pass Rate" in Verification = "Percentage of original snippets that passed quality review"

---

## Understanding the Data

### Scoring System

Each snippet is scored across **3 dimensions** (max 9 points total):

1. **Financial Transparency** (0-3 points)
   - **3 points**: Explicit amounts ("$10M investment")
   - **2 points**: Partial/qualitative ("significant cost")
   - **1 point**: Non-financial (no monetary detail)

2. **Temporal Specificity** (0-3 points)
   - **3 points**: Present day/current
   - **2 points**: Forward-looking/future
   - **1 point**: Backward-looking/historical
   - **0 points**: Multiple/unclear timeframe

3. **Narrative Framing** (1-3 points)
   - **3 points**: Both risk AND opportunity discussed
   - **2 points**: Risk OR opportunity (single-sided)
   - **1 point**: Neutral/factual only

**Final Score**: `((Financial + Temporal + Narrative) / 9) × 100`

### Grading Scale

| Grade | Range | Meaning |
|-------|-------|---------|
| **A** | 90-100% | Comprehensive evidence with financial detail, specific timing, balanced narratives |
| **B** | 80-89% | Strong performance with minor gaps |
| **C** | 70-79% | Adequate coverage but noticeable gaps |
| **D** | 60-69% | Limited specificity or inconsistent coverage |
| **F** | 0-59% | Few snippets meet standards |

### Classifications

- **FULL_DISCLOSURE**: Complete, clear evidence addressing the question
- **PARTIAL**: Incomplete or indirect evidence
- **UNCLEAR**: Ambiguous or difficult to assess
- **NO_DISCLOSURE**: No evidence found for this question

### Versions Explained

- **v3**: Earlier schema version
- **v4**: Latest schema version (may have improved question text, categorization, etc.)
- Companies may have data for multiple versions
- Later versions typically represent refined analysis

---

## Use Cases & Examples

### Use Case 1: Executive Summary Report

**Goal**: Present high-level findings to leadership

**Steps**:
```bash
npm run export:excel
```

**What to use**:
- Sheet 1 (Executive Summary) only
- Focus on overall statistics and top performers
- Share grade distribution chart

---

### Use Case 2: Deep Dive on Specific Company

**Goal**: Comprehensive analysis of Syngenta's v4 disclosures

**Steps**:
```bash
npm run export:excel -- --company Syngenta --version v4 --output reports/syngenta-v4-analysis.xlsx
```

**What to use**:
- Sheet 2: Company metrics and category scores
- Sheet 3: Question performance for benchmarking
- Sheet 5: Raw snippets for evidence review

---

### Use Case 3: Version Comparison

**Goal**: Compare v3 vs v4 results for same company

**Steps**:
```bash
# Export v3 data
npm run export:excel -- --version v3 --output reports/all-companies-v3.xlsx

# Export v4 data
npm run export:excel -- --version v4 --output reports/all-companies-v4.xlsx
```

**What to use**:
- Sheet 2: Compare overall scores between versions
- Sheet 3: Identify question-level differences
- Sheet 6: Review verification improvements

---

### Use Case 4: Category-Specific Analysis

**Goal**: Analyze Environmental Risk disclosures across all companies

**Steps**:
```bash
npm run export:excel
```

**What to use**:
- Sheet 4: Filter for "Environmental Risk" category
- Create pivot table: Company vs. Score
- Identify leaders and laggards

---

### Use Case 5: Statistical Analysis

**Goal**: Perform regression analysis on disclosure quality factors

**Steps**:
```bash
npm run export:excel
```

**What to use**:
- Sheet 5 (Snippet Raw Data): Export to R/Python
- Analyze correlations between financial type, timeframe, and total scores
- Build predictive models

---

### Use Case 6: Regulatory Reporting

**Goal**: Demonstrate disclosure quality for compliance

**Steps**:
```bash
npm run export:excel -- --company YourCompany --output reports/compliance-report-Q4-2024.xlsx
```

**What to use**:
- Sheet 2: Overall metrics and grades
- Sheet 4: Category-level compliance
- Sheet 6: Verification documentation
- Add to compliance package

---

## Troubleshooting

### Error: "No data found in results folder"

**Cause**: No verified JSON files found

**Solution**:
```bash
# Check that results folder exists and has files
ls results/*_verified.json

# Verify you're in the correct directory
pwd
# Should output: .../ag-verification-dashboard
```

---

### Error: "No data matches the specified filters"

**Cause**: Filter combination returns no results

**Solution**:
```bash
# Check available companies
npm run export:excel
# Look at the output to see available companies/versions

# Adjust your filter
npm run export:excel -- --company syngenta  # lowercase works too
```

---

### Warning: "Module not found: exceljs"

**Cause**: Dependencies not installed

**Solution**:
```bash
npm install
```

---

### Issue: Excel file is too large or slow to open

**Cause**: Too much raw snippet data

**Solution**:
- Filter to specific company/version
- Use Sheet 1-4 only (avoid Sheet 5 for large datasets)
- Split into multiple reports

---

### Issue: Formatting looks wrong in Excel

**Cause**: Excel version compatibility

**Solution**:
- File is in .xlsx format (Excel 2007+)
- Try opening in Google Sheets or LibreOffice
- Use Excel 2016 or later for best results

---

## Advanced Usage

### Automating Regular Reports

**Weekly Report Script**:
```bash
#!/bin/bash
# Save as: generate-weekly-report.sh

DATE=$(date +%Y-%m-%d)
OUTPUT="reports/weekly-report-${DATE}.xlsx"

npm run export:excel -- --output "$OUTPUT"

echo "Weekly report generated: $OUTPUT"
# Optional: email or upload to SharePoint
```

**Cron Job** (Linux/Mac):
```bash
# Run every Monday at 9 AM
0 9 * * 1 cd /path/to/ag-verification-dashboard && ./generate-weekly-report.sh
```

---

### Custom Analysis Workflow

**Example: Python + Pandas**:
```python
import pandas as pd

# Read the Excel file
excel_file = 'reports/AG_Verification_Summary_2025-11-04.xlsx'

# Load specific sheets
company_details = pd.read_excel(excel_file, sheet_name='Company Details')
snippet_data = pd.read_excel(excel_file, sheet_name='Snippet Raw Data')

# Analysis
avg_score_by_version = company_details.groupby('Version')['Overall Score'].mean()
print(f"Average scores by version:\n{avg_score_by_version}")

# Custom visualization
import matplotlib.pyplot as plt
company_details.plot(x='Company', y='Overall Score', kind='bar')
plt.title('Disclosure Quality by Company')
plt.show()
```

---

### Integrating with Other Tools

**Power BI**:
1. Import Excel file into Power BI
2. Use relationships: Company Details (Company+Year+Version) → Snippet Raw Data
3. Create interactive dashboards

**Tableau**:
1. Connect to Excel data source
2. Join sheets on Company/Year/Version
3. Build visualizations

**Google Sheets**:
1. Upload Excel file to Google Drive
2. Open with Google Sheets
3. Use for collaborative analysis

---

## File Output Details

### Default Output Location
```
ag-verification-dashboard/
└── reports/
    └── AG_Verification_Summary_YYYY-MM-DD.xlsx
```

### File Naming Convention
- Default: `AG_Verification_Summary_YYYY-MM-DD.xlsx`
- Custom: Whatever you specify with `--output`

### File Size
- Typical: 200KB - 2MB
- Depends on number of snippets
- Sheet 5 (Raw Data) is largest

### Compatibility
- Format: Excel 2007+ (.xlsx)
- Compatible with: Excel, Google Sheets, LibreOffice, Numbers

---

## Summary Statistics (Example Output)

When you run the export, you'll see:

```
✅ Excel report generated successfully!
📄 File saved to: reports/AG_Verification_Summary_2025-11-04.xlsx

📊 Report contains:
   • Executive Summary - High-level statistics
   • Company Details - Full metrics for each company
   • Question Performance - Cross-company question rankings
   • Category Analysis - Category-level breakdown
   • Snippet Raw Data - All snippets with full details
   • Verification Report - Quality assurance metrics

📈 Summary:
   • Companies: ICL, Nutrien, SQM, Syngenta, Xinan
   • Versions: v3, v4
   • Total Snippets: 235
   • Total Questions: 88

🎉 Done!
```

---

## Getting Help

### Command-Line Help
```bash
npm run export:excel -- --help
```

### Common Questions

**Q: Can I export to CSV instead of Excel?**
A: Not yet, but you can open the Excel file and save individual sheets as CSV.

**Q: Can I schedule automatic exports?**
A: Yes! See [Automating Regular Reports](#automating-regular-reports) section.

**Q: How do I add charts to the Excel file?**
A: The current version includes conditional formatting. Charts can be added manually or through future enhancement.

**Q: Can I customize which sheets are included?**
A: Not via command line, but you can modify `src/scripts/generateExcelReport.ts` to adjust the options passed to `generateExcelWorkbook()`.

**Q: Is there a browser-based export?**
A: Not yet - this is a planned future enhancement. Current version is CLI-only.

---

## Related Documentation

- [Dashboard README](../README.md) - Main project documentation
- [Data Schema](./DATA_SCHEMA.md) - JSON data structure reference (if exists)
- [Scoring Methodology](./SCORING_METHODOLOGY.md) - Detailed scoring explanation (if exists)

---

## Version History

### v1.0.0 (November 2025)
- Initial release
- 6-sheet Excel export
- Command-line filtering
- Support for multiple versions (v3, v4, etc.)
- Comprehensive metrics across all dimensions

---

**Need more help?** Check the [main README](../README.md) or open an issue on GitHub.
