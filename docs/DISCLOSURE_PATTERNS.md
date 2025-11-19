# Disclosure Patterns Calculations (Binary: Disclosure vs No Disclosure)

This doc explains how the Analytics “Disclosure Patterns” tab computes every chart. All calculations use the data loaded via `loadAllCompanyData()`, which falls back to `results/team_reviewed_json/team_reviewed_combined_collapsed.json` when no `_verified` files are present.

## Inputs & Collapsing
- Source data: `analysis_results[*].disclosures[*]` from each `CompanyYearData.verified`.
- Collapsed classification: `Disclosure` if `classification` is `FULL_DISCLOSURE` or `PARTIAL`; otherwise `No Disclosure` (`UNCLEAR` or `NO_DISCLOSURE`).
- Normalizers: `normalizeTimeframeCategory` (timeframe) and `normalizeFinancialDisclosureType` (financial type).
- Dimensions used: Category (question.category), Timeframe (normalized), Framing (`Risk`, `Neutral`, `Opportunity`, `Both`), Financial Type (`Financial`, `Partial-type`, `Non-Financial`), Company (name + year), Question (ID/text).

## Aggregations (built in analytics page)
- `categoryMap`, `timeframeMap`, `framingMap`, `companyMap`: count Disclosure/No Disclosure per dimension.
- `categoryTimeframeMap`: for each (Category, Timeframe), Disclosure count and total.
- `categoryFramingMap`: for each (Category, Framing), Disclosure count and total.
- `categoryFinancialMap`: for each Category, counts of financial, partial, non‑financial snippets and total.
- `questionMap`: for each Question ID, how many company-year bundles had any Disclosure for that question and the total coverage.
- Overall Disclosure/No Disclosure totals.

## Chart Calculations
Percentages are `disclosure / (disclosure + noDisclosure) * 100` unless noted.

### Overall Disclosure
- Disclosure % = `overallDisclosure / (overallDisclosure + overallNoDisclosure)`.
- Counts shown: total Disclosure vs total No Disclosure snippets.

### Best Categories / Weak Spots / By Category
- For each Category: `pct = disclosure / (disclosure + noDisclosure)`.
- Sorted descending (best) or ascending (weak).

### Timeframe (Present vs Forward vs Other)
- For each normalized timeframe: `pct = disclosure / (disclosure + noDisclosure)`.

### Framing (Risk vs Neutral vs Opportunity)
- For each framing: `pct = disclosure / (disclosure + noDisclosure)`.

### Company Leaderboard
- For each company-year: `pct = disclosure / (disclosure + noDisclosure)`.
- Top 5 only.

### Category × Timeframe heat
- For each (Category, Timeframe): `pct = disclosure / total`.

### Category × Framing heat
- For each (Category, Framing): `pct = disclosure / total`.

### Financial Mix (Category-level)
- For each Category:
  - `full` = count where financial type normalizes to `Financial`.
  - `partial` = count where financial type normalizes to `Partial-type`.
  - `non` = count where financial type normalizes to `Non-Financial`.
  - `pctFull = full / total`, `pctPartial = partial / total`, `pctNon = non / total`.
- Rendered as a stacked bar per category.

### Framing Mix by Category (normalized)
- From the Category × Framing matrix per Category:
  - `risk = pctDisclosure(Category, Risk)`
  - `neutral = pctDisclosure(Category, Neutral)`
  - `opportunity = pctDisclosure(Category, Opportunity)`
- Normalized across the three to show the framing mix per category.

### Top Questions / Bottom Questions
- For each Question ID:
  - `coverage = total company-years`
  - `hasDisclosure` = whether that company-year had any Disclosure for the question.
  - `pct = disclosureCoveringCompanies / coverage`.
- Sorted highest/lowest `pct`.

### Most Covered Questions
- Same question coverage metric; sorted by `coverage` (ties can appear).
- Shows Disclosure % alongside coverage count.

## Fallback Data Path
- If no `_verified` files exist in `results/`, the loader imports `results/team_reviewed_json/team_reviewed_combined_collapsed.json` and uses those bundles. The log “Found 0 verified files” is informational; the charts still render from the team-reviewed data.

## Notes
- Empty buckets default to 0%.
- Timeframe normalization: Current/Present → Present day; Future/Planned → Forward-looking; Historical → Backward-looking; else Multiple or Unclear.
- Financial normalization: maps to `Financial`, `Partial-type`, or `Non-Financial`.
- Classification collapsing is binary for these charts; the granular classes are only used to derive the binary view.
