# Verification Dashboard User Guide

**Version:** 1.0.0

Welcome to the Verification Dashboard! This guide will help you navigate the dashboard and understand how to interpret the disclosure quality scores.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Scoring System](#understanding-the-scoring-system)
3. [Navigating the Dashboard](#navigating-the-dashboard)
4. [Home Page](#home-page)
5. [Company-Year Detail Page](#company-year-detail-page)
6. [Analytics Page](#analytics-page)
7. [Interpreting Results](#interpreting-results)
8. [Frequently Asked Questions](#frequently-asked-questions)
9. [Tips and Best Practices](#tips-and-best-practices)

## Getting Started

### Accessing the Dashboard

1. Open your web browser
2. Navigate to the dashboard URL
3. The home page displays an overview of all analyzed companies

### Navigation Bar

At the top of every page, you'll find:
- **Home** - Returns to the main overview
- **Analytics** - Cross-company analytics and insights
- Links to individual company pages

## Understanding the Scoring System

### How Scores Are Calculated

Each disclosure snippet (a specific statement from a company document) is evaluated on three dimensions:

#### 1. Financial Transparency (0-3 points)

**What it measures:** How specific is the financial information?

- **Full (3 points):** "We invested $50 million in sustainable agriculture"
- **Partial (2 points):** "We made significant investments in sustainability"
- **Non-Financial (1 point):** "We support sustainable farming practices"

#### 2. Temporal Specificity (0-3 points)

**What it measures:** How current is the information?

- **Current (3 points):** "In 2024, we are implementing..."
- **Future (2 points):** "We plan to reduce emissions by 2030..."
- **Historical (1 point):** "In 2022, we reduced water use..."
- **Unclear (0 points):** "We work to minimize environmental impact"

#### 3. Narrative Framing (1-3 points)

**What it measures:** How balanced is the perspective?

- **Both (3 points):** Discusses both risks AND opportunities
- **Risk or Opportunity (2 points):** Focuses on only one perspective
- **Neutral (1 point):** Purely factual, no risk/opportunity framing

### Composite Score Formula

```
Score = (Financial + Temporal + Narrative) / 9 × 100%
```

**Example:**
- Financial: Full (3 points)
- Temporal: Current (3 points)
- Narrative: Both (3 points)
- **Total:** (3 + 3 + 3) / 9 × 100 = **100%** (Grade A)

### Letter Grades

| Grade | Score Range | Interpretation |
|-------|-------------|----------------|
| A | 90-100% | Excellent disclosure quality |
| B | 80-89% | Good disclosure quality |
| C | 70-79% | Fair disclosure quality |
| D | 60-69% | Poor disclosure quality |
| F | Below 60% | Failing disclosure quality |

### Classification Badges

Snippets are also classified by completeness:

- **FULL_DISCLOSURE** (Green) - Complete, detailed disclosure
- **PARTIAL** (Yellow) - Some information provided
- **UNCLEAR** (Orange) - Ambiguous or vague
- **NO_DISCLOSURE** (Red) - No meaningful disclosure

## Navigating the Dashboard

### Keyboard Shortcuts

- **Tab** - Move between interactive elements
- **Enter/Space** - Activate buttons and links
- **Skip to Main Content** - Press Tab when page loads, then Enter

### Accessibility Features

- All text meets contrast requirements
- Images have descriptive alt text
- Can be navigated entirely by keyboard
- Compatible with screen readers

## Home Page

### Overview

The home page provides a cross-company comparison with three main sections:

### 1. Company Cards

**What you see:**
- Company name
- Fiscal year analyzed
- Overall grade (A-F)
- Overall score percentage
- Number of questions analyzed
- "View Details" button

**How to use:**
- Click "View Details" to see full analysis for that company
- Compare grades across companies at a glance
- Identify top and bottom performers

### 2. Category Performance

Four risk category cards showing average scores:
- Environmental Risk
- Human Health Risk
- Market/Business Risk
- Regulatory/Financial Risk

**Interpretation:**
- Higher percentages = better disclosure quality
- Green (>70%) = good category performance
- Yellow (50-70%) = moderate performance
- Red (<50%) = poor performance

### 3. Question Rankings

**Top Performers:** Questions with highest average scores across all companies
**Bottom Performers:** Questions with lowest average scores

**What this tells you:**
- Which topics are well-disclosed industry-wide
- Which topics need improvement across the board
- Industry-wide disclosure patterns

## Company-Year Detail Page

### Getting There

- Click "View Details" on any company card from the home page
- Use the navigation bar to select a specific company

### Page Sections

#### 1. Summary Dashboard

**Key Metrics Displayed:**
- Overall disclosure score and grade
- Total questions analyzed
- Total disclosure snippets
- Average snippets per question
- Category breakdowns

**How to interpret:**
- Higher overall score = better comprehensive disclosure
- More snippets per question = more thorough disclosure
- Category scores show strengths and weaknesses

#### 2. Filters Bar

**Filter by Category:**
- Click "All Categories" or specific category buttons
- Narrows questions to selected category

**Filter by Classification:**
- Select "All", "Full Disclosure", "Partial", "Unclear", or "No Disclosure"
- Shows only snippets matching classification

**Tip:** Use filters to focus on specific areas of interest

#### 3. Question Accordion

Each question card shows:
- Question text
- Category tag
- Priority level (High/Medium/Low)
- Average score for this question
- Grade (A-F)
- Number of disclosure snippets

**How to use:**
- Click to expand and see all disclosure snippets
- Collapsed by default to reduce clutter
- Expand multiple questions for comparison

#### 4. Snippet Cards

Within each expanded question, you'll see individual snippets:

**Information shown:**
- Direct quote from the document
- Source (document and page number)
- Classification badge
- Individual score and grade
- Financial amounts (if any)
- Categorization breakdown

**Understanding the categorization:**
- **Financial Type:** Full / Partial / Non-Financial
- **Timeframe:** Current / Future / Historical / Unclear
- **Framing:** Both / Risk / Opportunity / Neutral

### Comparison Mode

**If available, you'll see a "Compare with Original" toggle:**

- Switch between verified and original analysis
- Compare how verification changed the results
- See differences in scoring and classification

## Analytics Page

### Purpose

Cross-company insights and benchmarking across all analyzed companies.

### Four Main Tabs

#### 1. Key Insights

**Auto-generated findings:**
- Financial quantification rates
- Temporal clarity patterns
- Evidence depth analysis
- Actionable recommendations

**How to use:**
- Read insights top to bottom
- Note recommendations for improvement
- Identify industry-wide trends

#### 2. Question Benchmark

**Three sub-tabs:**

**Top Performers:**
- Questions with highest average scores
- Industry best practices
- Topics with strong disclosure

**Bottom Performers:**
- Questions with lowest average scores
- Improvement opportunities
- Industry-wide gaps

**High Variance:**
- Questions with inconsistent scores across companies
- Shows where companies differ most
- Competitive differentiation opportunities

**How to use:**
- Identify questions to prioritize for improvement
- Learn from top-performing disclosures
- Understand industry baselines

#### 3. Company Comparison

**5-Dimensional Radar Chart:**

Compares companies on:
1. **Financial Transparency** - Specificity of monetary amounts
2. **Temporal Clarity** - Time-relevance of disclosures
3. **Narrative Balance** - Risk/opportunity framing
4. **Evidence Depth** - Number of supporting snippets
5. **Disclosure Breadth** - Coverage across question categories

**How to interpret:**
- Larger area = better overall performance
- Compare shapes to see different strengths
- Industry average shown for context

**Strengths/Weaknesses:**
- Listed below each company's radar chart
- Based on comparison to industry average
- Actionable insights for improvement

#### 4. Category Deep Dive

**For each risk category:**

**Classification Distribution:**
- Pie chart showing breakdown by classification type
- Percentages for Full/Partial/Unclear/No Disclosure

**Company Rankings:**
- Top companies in this category
- Scores and grades
- Comparative performance

**Question Performance:**
- Best and worst questions within category
- Category-specific insights

**How to use:**
- Focus on categories relevant to your interests
- Identify category-specific leaders
- Understand disclosure patterns per risk type

## Interpreting Results

### What Makes a High-Quality Disclosure?

**Excellent (Grade A: 90-100%):**
- Specific financial amounts ("$X million")
- Current timeframe ("in 2024")
- Balanced risk/opportunity perspective
- Multiple supporting snippets
- Clear, unambiguous language

**Good (Grade B: 80-89%):**
- Some financial specificity
- Generally current information
- Reasonable framing
- Adequate evidence

**Fair (Grade C: 70-79%):**
- Limited financial detail
- Mix of current and unclear timeframes
- Some one-sided framing
- Basic evidence

**Poor (Grade D: 60-69%):**
- Vague financial information
- Mostly unclear or historical
- Heavily one-sided or neutral
- Minimal evidence

**Failing (Grade F: Below 60%):**
- No financial quantification
- No clear timeframe
- Purely factual or missing information
- Little to no supporting evidence

### Red Flags

Watch for:
- **High "No Disclosure" percentages** - Missing information
- **Low temporal clarity** - Outdated information
- **Very low snippet counts** - Insufficient evidence
- **Inconsistent category scores** - Uneven disclosure practices

### Positive Indicators

Look for:
- **High full disclosure rates** - Comprehensive reporting
- **Strong financial transparency** - Specific, quantified data
- **Current timeframes** - Up-to-date information
- **Balanced framing** - Risk and opportunity discussion
- **High evidence depth** - Multiple supporting statements

## Frequently Asked Questions

### Q: What does "verified" mean?

A: Verified results have been reviewed and potentially corrected through a verification process. Original results are the initial analysis before verification.

### Q: Why do some questions have no snippets?

A: This indicates no disclosure was found for that question in the analyzed documents. This itself is meaningful - it shows a disclosure gap.

### Q: How are categories assigned?

A: Categories are predefined based on risk type:
- Environmental Risk (climate, water, biodiversity, etc.)
- Human Health Risk (pesticides, food safety, etc.)
- Market/Business Risk (market volatility, competition, etc.)
- Regulatory/Financial Risk (compliance, litigation, etc.)

### Q: What's the difference between classification and score?

A: **Classification** (Full/Partial/Unclear/None) is a qualitative assessment of disclosure completeness. **Score** (0-100%) is a quantitative measure based on three dimensions. A disclosure can be classified as "Full" but still score low if it lacks financial detail or current timeframes.

### Q: Can I export the data?

A: Currently, the dashboard is view-only. For data export, contact your system administrator.

### Q: Why do grades vary within a company?

A: Different questions address different topics. A company may excel at disclosing some risks (e.g., environmental) while underperforming on others (e.g., regulatory). Question-level grades show this variation.

### Q: What does "Multiple or Unclear" timeframe mean?

A: The disclosure mentions multiple time periods without clarity, or provides no temporal context. This receives 0 points for temporal specificity.

## Tips and Best Practices

### For Analysts

1. **Start with the Overview**
   - Get a high-level sense from the home page
   - Identify outliers (best and worst performers)
   - Note category-wide patterns

2. **Deep-Dive Strategically**
   - Focus on relevant companies/categories
   - Use filters to narrow scope
   - Compare similar companies

3. **Look for Patterns**
   - Which questions consistently score low?
   - Which companies lead in specific areas?
   - Are there industry-wide gaps?

4. **Use Analytics for Context**
   - Benchmarks show what's possible
   - Insights reveal systemic issues
   - Comparisons highlight differentiation

### For Company Representatives

1. **Identify Improvement Areas**
   - Focus on low-scoring questions
   - Note missing disclosures (no snippets)
   - Compare to top performers

2. **Learn from Leaders**
   - What makes top-scoring disclosures effective?
   - How do they frame risk and opportunity?
   - What level of detail do they provide?

3. **Track Over Time**
   - If multiple years available, look for trends
   - Has disclosure quality improved?
   - Are gaps being addressed?

4. **Balance Perspectives**
   - Low narrative framing scores suggest one-sidedness
   - Aim for balanced risk/opportunity discussion
   - Provide context for both positive and negative aspects

### For Researchers

1. **Export Key Findings**
   - Take screenshots of relevant charts
   - Note specific snippet examples
   - Record overall statistics

2. **Document Methodology**
   - Understand the three-dimensional scoring
   - Note how aggregation works
   - Recognize limitations

3. **Cross-Reference**
   - Verify snippets against source documents
   - Check for context not captured in snippets
   - Consider qualitative factors beyond scores

---

## Need Help?

- **Technical Issues:** See README.md
- **Architecture Details:** See DASHBOARD.md
- **API Documentation:** See API.md
- **Testing:** See tests/README.md

**Version:** 1.0.0
**Last Updated:** 2025-10-30
