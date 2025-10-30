# D-Rag Validation Dashboard
**Agricultural Document Analyzer - Visualization & Comparison System**

Version: 1.0 (Phase 6)
Last Updated: October 2025

---

## Overview

The Dark Doppler Dashboard provides interactive visualization and validation of AI-generated analysis results. It compares N-LLM (our system) results against D-Rag baseline data to validate accuracy and identify disclosure trends.

**Current Status:** Phase 6 - Multi-model comparison with timeline, matrix, and bar chart visualizations

**Key Features:**
- Multi-year trend analysis (timeline charts)
- Question × Year heatmap (matrix view)
- Classification distribution tracking (bar charts)
- N-LLM vs D-Rag comparison
- Canonical and variant question filtering
- Sector-aware question display

---

## Technology Stack

- **Framework:** Astro 5.14.5 with Node.js adapter
- **Styling:** Tailwind CSS 4.1.14
- **Charts:** Chart.js 4.5.1
- **Language:** TypeScript with Astro components
- **Build:** Static site generation with SSR capabilities

---

## Getting Started

### Installation

```bash
cd dashboard/dark-doppler

# Install dependencies
npm install

# Start development server
npm run dev
```

Access at: http://localhost:4321

### Build for Production

```bash
npm run build
npm run preview  # Preview built site
```

---

## Data Requirements

### Input Files

The dashboard loads analysis results from:

```
../../results/
├── Syngenta_2019_gemini-2-5-flash_20-10-2025_14-32-15.json
├── Syngenta_2019_gemini-2-5-flash_20-10-2025_14-32-15_consistency_applied.json
├── Syngenta_2019_DRAG_20-10-2025_14-00-00.json
└── ...
```

**File Selection Logic:**
- **N-LLM results**: Files with `_consistency_applied` suffix (corrected results)
- **D-Rag results**: Files with `DRAG` in filename
- **Deduplication**: Keeps only latest analysis per company/year/model/system

### Required Data Structure

JSON files must follow this structure:

```json
{
  "metadata": {
    "company": "Syngenta",
    "year": "2019",
    "fiscal_year": 2019,
    "model_used": "gemini-2.5-flash",
    "sector": "P"
  },
  "analysis_results": [
    {
      "question_id": "99901",
      "question_text": "Does the company...",
      "category": "Environmental Risk",
      "answer": {
        "classification": "PARTIAL",
        "classification_justification": "...",
        "financial_quantification": "Not disclosed",
        "evidence": [
          {
            "quote": "Verbatim text...",
            "source": "Annual Report 2019, Page 42",
            "financial_amounts": ["$180M"]
          }
        ],
        "summary": "..."
      }
    }
  ]
}
```

---

## Page Structure

### 1. Home Page (`/`)

**URL:** `/`

**Purpose:** Landing page with overview of all available comparisons

**Content:**
- Overview statistics (total analyses, companies, questions)
- Comparison cards for each company × model combination
- Shows: years analyzed, question counts, classification breakdown
- Displays "Common Canonical" count when D-Rag data exists
- Links to company detail pages

**Navigation:**
- Click company card → Company overview page

---

### 2. Company Overview (`/[company]/`)

**URL:** `/{company}?model={model}`

**Purpose:** Multi-year overview for a specific company

**Sections:**

#### A. Summary Statistics
- Total years analyzed
- Classification breakdown across all years
- Question applicability summary

#### B. Question Applicability Section
Shows which questions apply to this company:
- **Sector-applicable canonical questions** (based on company sector)
- **Company-specific variants** (e.g., Syngenta paraquat litigation)
- **Excluded questions** (not applicable to sector)
- **N-LLM vs D-Rag overlap analysis**
- Expandable lists for each category

#### C. Visualizations
- **MultiYearBarChart**: Year-over-year trends
- **TimelineChart**: Interactive time-series
- **MatrixView**: Questions × Years heatmap

#### D. Year-by-Year Cards
- Clickable cards for each year
- Shows classification distribution
- Links to year detail page

#### E. Category Breakdown
- Risk categories with statistics
- Environmental / Health / Transition risks

**Navigation:**
- Click year card → Year detail page
- Click matrix cell → Year detail page (compare mode)
- Double-click timeline point → Year detail page

---

### 3. Year Detail Page (`/[company]/[year]`)

**URL:** `/{company}/{year}?model={model}&mode={mode}#question-{id}`

**Purpose:** Detailed question-by-question analysis for a specific year

**Modes:**
- **N-LLM mode**: Show only N-LLM results
- **D-RAG mode**: Show only D-Rag results
- **Compare mode**: Side-by-side comparison with disagreement highlighting

**Sections:**

#### A. Header
- System toggle buttons (N-LLM / D-Rag / Compare)
- Classification distribution bars for each system
- Sorting options: Category, Score, Question ID, Disagreement
- Metadata: Model, sector, analysis date, documents, processing time

#### B. Question Cards
Each question displays:
- Classification badge (color-coded)
- Justification text
- Financial quantification (if available)
- Evidence quotes with sources
- Summary
- In compare mode: Split view (N-LLM left, D-Rag right)
- Disagreement indicator (when classifications differ)

**URL Hash Support:**
- Direct links: `#question-99901`
- URL mode parameter: `?mode=compare`

**Navigation:**
- Click question card → Expand details
- Click classification bar segment → Jump to matching questions
- Sort dropdown → Reorder questions

---

## Visualizations

### 1. TimelineChart

**Most Complex Component** - Interactive time-series visualization

#### Features

**System Selection:**
- N-LLM only
- D-Rag only
- Both (overlaid for comparison)

**Grouping Modes:**
- **By Category**: Environmental / Health / Transition risks (stacked areas)
- **By Question**: Individual question trends (stacked lines with distinct colors)

**View Modes:**
- **Absolute**: Raw scores (sum of classification scores)
- **Normalized**: Percentage using D-Rag alignment method: `score / (num_questions × 3) × 100`

**Question Filters:**
- **All Questions**: Canonical + Variants (N-LLM) or All Canonical (D-Rag)
- **Common Canonical**: Only questions both systems answered (sector-filtered)

**Y-Axis Zoom:**
- Auto
- 0-25%
- 0-50%
- 0-100%
(Only in normalized mode)

**Interactive Features:**
- Single-click legend items to toggle visibility
- Double-click legend in "Both + Question" mode to isolate question pairs
- Double-click chart points to navigate to year detail page with comparison
- Hover for tooltips with exact values

**Data Tables:**
- Category mode: Shows scores by category per year
- Question mode: Shows scores per question per year
- Table filters: Top 10, All Questions, Environmental, Health, Transition

#### Scoring System

- YES = 3
- PARTIAL = 2
- UNCLEAR = 1
- NONE = 0

**Normalized score formula:**
```
normalized_score = (total_score / (num_questions × 3)) × 100
```

This ensures fair comparison despite different question counts (N-LLM has variants, D-Rag doesn't).

---

### 2. MatrixView

**Display Format:**
- **Rows**: Questions (filtered to common canonicals when D-Rag exists)
- **Columns**: Years
- **Cells**: Classification with color coding

#### Features

**Single System View:**
- Full cell colored by classification

**Dual System View (when D-Rag exists):**
- Diagonal split cells
- Upper-left triangle: N-LLM classification
- Lower-right triangle: D-Rag classification
- Easy visual disagreement detection

**Interactions:**
- Hover: Shows tooltip with justifications for both systems
- Click cell: Navigate to detailed question view in compare mode

**Trend Column:**
- Shows ↑ (improving), → (stable), ↓ (declining)
- Based on N-LLM scores

**Legend:**
- Classification colors
- Trend indicators

---

### 3. MultiYearBarChart

**Display:** Grouped bar charts showing percentage breakdown per year

#### Features

**Charts:**
- Separate chart for each classification (YES, PARTIAL, UNCLEAR, NONE)
- Bars show percentage of questions in each classification

**Filter Toggle (when enabled):**
- "Canonical + Variants" / "All Canonical Questions" (for N-LLM/D-Rag)
- "Common Canonical" (default - fair comparison subset)

**Interactions:**
- Hover for percentage tooltips
- Legend with click-to-isolate functionality
- Color-coded bars matching classification colors

**Configuration:**
- `showCanonicalFilter`: Enables/disables filter toggle
- `systemType`: 'nllm' or 'drag' for appropriate button labels
- Dynamically updates when filter changes

---

### 4. ClassificationBar

**Display:** Horizontal stacked bar showing classification distribution

#### Features

- Percentage-based width for each classification
- Hover tooltips with counts and percentages
- Click segment to jump to and highlight matching questions
- Legend grid with counts and percentages
- Color scheme: YES (green), PARTIAL (amber), UNCLEAR (gray), NONE (red)

---

## Data Loading & Processing

### Core Logic (`dataLoader.ts`)

#### Load All Results

```typescript
loadAllResults()
```

**Process:**
1. Reads JSON files from `../../results/`
2. Filters for: (a) Files with "DRAG" OR (b) Files with "consistency_applied"
3. Extracts model name from filename pattern
4. Deduplicates (keeps latest per company/year/model/system)
5. Normalizes structure:
   - Renames `analysis_results` → `questions`
   - Converts `UNSURE` → `UNCLEAR`
   - Maps D-Rag's `year` → `fiscal_year`

#### Load Questions Metadata

```typescript
loadQuestionsMetadata()
```

**Loads from:** `../../prompts/questions.json`

**Provides:**
- Canonical questions list
- Company-specific variants
- Sector applicability (P/F/PF tags)

### Question Handling

**Canonical Questions:**
- Base questions (e.g., "99901")
- Applicable by sector (P/F/PF)

**Variants:**
- Company-specific adaptations (e.g., "99908-A", "99908-B")
- Only used by N-LLM

**Common Canonical Filtering:**
- When comparing N-LLM vs D-Rag
- Identifies questions both systems answered
- Excludes non-applicable sector questions
- Strips variant suffixes for matching (99901-A → 99901)

### Sector Inference

Automatically determines company sector from questions used:
- If has pesticide-specific questions → Sector P
- If has fertilizer-specific questions → Sector F
- If has both → Sector PF

---

## Configuration

### Category Mapping (`category_mapping.json`)

**Structure:**

```json
{
  "category_groups": {
    "Environmental Risks": {
      "icon": "🌱",
      "color": "green",
      "description": "...",
      "categories": [
        "Environmental Risk",
        "Operational Risk"
      ]
    },
    "Human Health Risks": {
      "icon": "🏥",
      "color": "red",
      "categories": ["Health Risk", "Legal Risk"]
    },
    "Transition Risks": {
      "icon": "⚡",
      "color": "amber",
      "categories": ["Regulatory Risk", "Market Risk", "Reputational Risk"]
    }
  },
  "classification_colors": {
    "YES": { "score": 3, "color": "green-600", "bg": "bg-green-100" },
    "PARTIAL": { "score": 2, "color": "amber-600", "bg": "bg-amber-100" },
    "UNCLEAR": { "score": 1, "color": "gray-500", "bg": "bg-gray-100" },
    "NONE": { "score": 0, "color": "red-600", "bg": "bg-red-100" }
  }
}
```

### Utilities (`categoryMapper.ts`)

**Functions:**
- `getCategoryGroup()`: Maps granular categories to 3 main risk groups
- `getClassificationInfo()`: Returns score, colors, and labels
- `groupQuestionsByCategory()`: Groups questions by category
- `calculateCategoryStats()`: Computes classification distribution

---

## Key Features & Design Decisions

### 1. Multi-Model Comparison

**N-LLM System:**
- Multiple models: gemini-2-5-flash, gemini-2-5-pro, etc.
- Uses canonical questions + company-specific variants

**D-Rag Baseline:**
- Canonical questions only (no variants)
- Provides ground truth for validation

**Comparison:**
- Side-by-side views
- Disagreement highlighting
- Model selection via URL parameter

### 2. Canonical vs Variant Questions

**N-LLM uses both:**
- Canonical questions (e.g., 99901)
- Company-specific variants (e.g., 99917-A, 99917-B)

**D-Rag uses only:**
- Canonical questions

**Common Canonical filter:**
- Ensures apples-to-apples comparison
- Shows only questions both systems answered
- Visual indicators show which questions are being compared

### 3. Sector-Based Question Filtering

**Automatic sector determination:**
- From company profile or question usage
- Shows only applicable canonical questions
- Displays excluded questions with reasons
- Filters common canonicals by sector applicability

### 4. Normalization & Scoring

**D-Rag alignment method:**
```
normalized_score = (score / (num_questions × 3)) × 100
```

**Benefits:**
- Fair comparison despite different question counts
- Used in timeline normalized view
- Used in bar charts

### 5. Interactive Navigation

**URL-based state:**
- Model selection: `?model=gemini-2-5-flash`
- Mode selection: `?mode=compare`
- Direct question links: `#question-99901`

**Click interactions:**
- Matrix cells → Year detail page (compare mode)
- Timeline points → Year detail page (compare mode, specific question)
- Legend items → Toggle visibility, isolate pairs
- Classification bar segments → Jump to matching questions

### 6. Data Deduplication

**Automatic handling:**
- Removes duplicate analysis files (keeps latest)
- Removes duplicate questions within results
- Question ID-based matching with variant support

---

## Important Caveats

### 1. "Canonical Only" vs "All Questions" Filtering

- When D-Rag data exists, default view uses "Common Canonical" filter
- Ensures fair comparison (same question set for both systems)
- "All Questions" mode shows canonical + variants for N-LLM (comparison is unfair)

### 2. Question ID Matching

- N-LLM questions may include variants (99908-A, 99908-B)
- D-Rag questions are always canonical (99908)
- Matching uses base ID extraction (strips -A, -B suffixes)
- Matrix view and comparisons handle this gracefully

### 3. Model Selection

- Model is optional URL parameter
- If not specified, uses default priority: flash > pro > first available
- Model affects only N-LLM data; D-Rag data always loaded if available

### 4. Evidence Format Support

**N-LLM format:**
```json
{
  "quote": "Verbatim text",
  "source": "Annual Report 2019, Page 42",
  "page": 42,
  "financial_amounts": ["$180M"]
}
```

**D-Rag format:**
```json
{
  "evidence_number": 1,
  "source_url": "document.pdf",
  "text": "Evidence text"
}
```

Dashboard renders both formats correctly.

### 5. Scoring Method

- Timeline uses D-Rag alignment method (normalized by max possible score)
- Different from simple percentage of total questions
- Allows comparing systems with different question counts

### 6. Category Grouping

- Granular categories (9 types) mapped to 3 main risk groups
- Defined in category_mapping.json
- Icons and colors consistent across all visualizations

---

## File Structure

```
dashboard/dark-doppler/
├── src/
│   ├── pages/
│   │   ├── index.astro                 # Home page
│   │   └── [company]/
│   │       ├── index.astro             # Company overview
│   │       └── [year].astro            # Year detail
│   ├── components/
│   │   ├── TimelineChart.astro         # Time-series visualization
│   │   ├── MatrixView.astro            # Question × Year heatmap
│   │   ├── MultiYearBarChart.astro     # Percentage bar charts
│   │   ├── ClassificationBar.astro     # Distribution bar
│   │   ├── DonutChart.astro            # (exists but not used)
│   │   └── Welcome.astro               # (exists but not used)
│   ├── layouts/
│   │   └── Layout.astro                # Base layout
│   ├── utils/
│   │   ├── dataLoader.ts               # Core data loading logic
│   │   ├── categoryMapper.ts           # Category utilities
│   │   └── currencyConverter.ts        # (exists but not used)
│   └── config/
│       └── category_mapping.json       # Category & classification config
├── package.json
├── astro.config.mjs
└── tailwind.config.mjs
```

---

## Development Workflow

### Running Locally

```bash
cd dashboard/dark-doppler

# Install dependencies (first time)
npm install

# Start dev server
npm run dev
```

Access at: http://localhost:4321

### Making Changes

**Hot reload is enabled:**
- Edit `.astro` files → Page refreshes automatically
- Edit `.ts` files → Page refreshes automatically
- Edit `category_mapping.json` → Restart dev server

### Adding New Companies

1. Run analysis for company using main.py
2. Refresh dashboard (auto-detects new JSON files)
3. Company appears in home page automatically

### Adding New Visualizations

1. Create new component in `src/components/`
2. Import in page where needed
3. Pass data via props
4. Use Tailwind CSS for styling
5. Use Chart.js for charts (if applicable)

---

## Troubleshooting

### Issue: No data showing on home page

**Cause:** No JSON files in `../../results/` or files don't match filter criteria

**Solution:**
```bash
# Check if results exist
ls ../../results/

# Run an analysis
cd ../..
python main.py --company Syngenta --year 2019
```

### Issue: Dashboard shows outdated data

**Cause:** Astro build cache

**Solution:**
```bash
# Clear cache and restart
rm -rf .astro
npm run dev
```

### Issue: Charts not rendering

**Cause:** Chart.js not loading or data format issues

**Solution:**
1. Check browser console for errors
2. Verify data structure matches expected format
3. Check if `chart.js` is installed: `npm list chart.js`

### Issue: Comparison view shows no D-Rag data

**Cause:** No D-Rag JSON files in results directory

**Solution:**
```bash
# Import D-Rag baseline data
python scripts/import_drag_results.py \
  --csv path/to/d-rag-results.csv \
  --output results/ \
  --company Syngenta
```

### Issue: Timeline shows incorrect percentages

**Cause:** Normalization formula not applied correctly

**Solution:**
- Check if "Normalized" view mode is selected
- Verify `numQuestions` calculation in component
- Review D-Rag alignment formula implementation

---

## Best Practices

### 1. Use Consistent File Naming

Ensure analysis result files follow pattern:
```
{Company}_{Year}_{model}_{timestamp}.json
{Company}_{Year}_{model}_{timestamp}_consistency_applied.json
{Company}_{Year}_DRAG_{timestamp}.json
```

### 2. Always Use Consistency-Applied Files

For N-LLM data, prefer `_consistency_applied` files:
- More accurate (errors corrected)
- Better for comparison with D-Rag
- Dashboard automatically prefers these

### 3. Filter by Common Canonical for Fair Comparison

When comparing N-LLM vs D-Rag:
- Use "Common Canonical" filter
- Ensures same question set
- Avoids bias from variant questions

### 4. Use Normalized View for Trends

When analyzing trends over time:
- Use normalized view (percentage)
- More stable than absolute scores
- Better for comparing across companies

### 5. Validate with Matrix View

For quick quality check:
- Look at matrix diagonal split cells
- Green/green = agreement
- Green/red or red/green = disagreement (needs investigation)

---

## Future Enhancements

### Planned Features

1. **Export Functionality**
   - Export charts as PNG/SVG
   - Export data tables as CSV
   - Export comparison reports as PDF

2. **Advanced Filters**
   - Filter by classification (show only YES, hide NONE)
   - Filter by financial quantification presence
   - Filter by evidence quality

3. **Comparative Analytics**
   - Cross-company comparison views
   - Sector benchmarking
   - Disclosure quality scores

4. **Search & Navigation**
   - Full-text search across questions
   - Search within evidence quotes
   - Advanced filtering UI

5. **Performance Optimizations**
   - Lazy loading for large datasets
   - Virtualized question lists
   - Optimized Chart.js configurations

---

## Related Documentation

- [LLM_WORKFLOW.md](../../docs/LLM_WORKFLOW.md) - Main analysis workflow
- [CONSISTENCY_WORKFLOW.md](../../docs/CONSISTENCY_WORKFLOW.md) - Quality assurance layer
- [README.md](../../README.md) - Project overview

---

**Maintainer:** Carbon Tracker Initiative
**Version:** 1.0 (Phase 6 Complete)
**Status:** Production-ready for N-LLM vs D-Rag comparison
