# Verification Dashboard – AI Handoff Summary

## Purpose
- Dark-themed verification dashboard that mirrors the “Dark Doppler” aesthetic while presenting vetted agricultural risk disclosures.
- Focus on snippet-level evidence reviews and category drilldowns for each company/year analysis.

## Data Flow
- `utils/dataLoader.ts` pulls verified JSON outputs (with optional original/comparison files) and exposes helper loaders (e.g., `loadCompanyYear`, `loadAllCompanyData`).
- Metrics derived via `utils/metricsCalculator.ts`; verification deltas handled in `utils/verificationComparison.ts`.
- Pages are Astro templates under `src/pages/`, with shared layouts + components.

## UI Structure
- `src/pages/index.astro`: landing cards for global stats, categories, and companies.
- `src/pages/[company]/[year].astro`: detailed view with summary metrics, category cards, filterable question accordions.
- Key components: `SummaryDashboard`, `CategoryCard`, `CompanyCard`, `QuestionAccordion`, `SnippetCard`, `FiltersBar`, `ComparisonToggle`.

## Styling & UX
- Global styling in `src/styles/global.css` (system font stack, dark surfaces, subtle depth on hover, no gradients).
- Shared layout in `src/layouts/Layout.astro`; consistent header/footer.
- Grade badges sized in `GradeDisplay.astro`; cards use surface/glow classes; typography scaled up for parity with Dark Doppler.

## Current Wins
- Unified dark aesthetic without gradient overlays; iconography simplified.
- Category and company cards mimic Dark Doppler spacing/weighting.
- Question accordions show a single global “Expand All” control and embed snippet evidence with collapsible details.
- Total question counts now honor verified stats (`totalQuestionsAnalyzed`).

## Known Follow-ups
- Continue fine-tuning typography/spacing against the Dark Doppler reference (e.g., compare landing font sizing).
- Validate icons/emoji compatibility in all runtime environments; replace with SVG if required.
- Review “Top Questions” list presentation for overflow truncation and mobile spacing.
- Ensure data loaders cover every company/year combination expected in production datasets.

