# Bugfix: Financial Type + Amount Export and Display

Date: 2025-11-18

## What Broke
- Snippets with explicit financial amounts (e.g., $670M) were being exported and displayed as `Non-Financial` or `Partial`, and “Financial Amounts” cells often showed `None`.
- The root causes were in the merged loader and the Excel exporter:
  - `mapMergedFinancialType` was too loose and could downgrade `Financial` values.
  - `financial_amounts` from merged data were dropped/empty when serialized to Excel.

## Changes Made
1) **Strict financial type whitelist (merged loader)**
   - File: `src/utils/dataLoader.ts`
   - Function `mapMergedFinancialType` now only maps to:
     - `"Financial"` if the string contains `"financial"`
     - `"Partial-type"` if it contains `"partial"`
     - `"Non-Financial"` if it contains `"non-financial"`
     - Defaults to `"Non-Financial"` for unknowns
   - This keeps `Financial`, `Partial-type`, and `Non-Financial` distinct and avoids mixing classification terms (Full/Partial/Unclear) into financial_type.

2) **Preserve/format financial amounts in export**
   - File: `src/utils/excelGenerator.ts`
   - `financial_amounts` are now serialized whether they are strings or objects. If an amount exists, the exported “Financial Type” is forced to `Financial` for that row so the value is visible.
   - Example formatting: `USD 670 ($670 million)`.

3) **Regenerated Excel reports**
   - Command used: `npm run export:excel -- --output reports/AG_Verification_Summary_FIXED4.xlsx`
   - Validation: Snippet `99903-003` (Corteva PFOA settlement) now shows `Financial` and `USD 670 ($670 million)` in “Snippet Raw Data”.

## Impact
- Merged data with explicit amounts now exports and displays as `Financial`.
- Team-reviewed/merged datasets retain `Partial-type` when amounts are absent or only materiality is stated.
- “Financial Amounts” column no longer defaults to `None` when the source provides a value.

## Remaining Work
- If you need the canonical report filename updated, rerun:  
  `npm run export:excel -- --output reports/AG_Verification_Deduped_Reviewed_2025-11-11.xlsx`
- If analytics should show Financial vs Partial from merged data, ensure the loader uses merged sources (or regenerate team-reviewed JSONs with the fixed mapper).
