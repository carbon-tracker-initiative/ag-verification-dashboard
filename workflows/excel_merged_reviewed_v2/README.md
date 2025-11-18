# Excel Export Workflow v2: Merged & Reviewed Analysis

This workflow creates comprehensive Excel reports comparing merged files with deduped and reviewed files, including detailed analysis of what was removed during the review process.

## Output Files

1. **`merged_files_summary.xlsx`** - Summary of merged files only
2. **`deduped_reviewed_summary.xlsx`** - Summary of deduped and reviewed files only  
3. **`comprehensive_analysis.xlsx`** - Multi-sheet comparison with:
   - Original merged data
   - Deduped and reviewed data
   - Removed snippets analysis by company
   - Statistics comparison

## Usage

```bash
npm run export:excel-merged-reviewed-v2
```

## Requirements

- Merged files in `reports/merged/`
- Deduped and reviewed files in `reports/team_reviewed/`
- Review decisions file: `reports/files_for_deduped_and_reviewed/review_latest.jsonl`

## File Structure

```
workflows/excel_merged_reviewed_v2/
├── export_comprehensive.py    # Main script
├── config.py                 # Configuration settings
├── README.md                 # This file
└── run_export.bat           # Windows batch file
```

## Output Structure

### merged_files_summary.xlsx
- **Merged_Summary**: Question-level data for all merged files
- **Company_Overview**: Aggregated statistics by company

### deduped_reviewed_summary.xlsx  
- **Reviewed_Summary**: Question-level data for all reviewed files
- **Company_Overview**: Aggregated statistics including removal counts

### comprehensive_analysis.xlsx
- **Original_Merged**: Original merged file data
- **Deduped_Reviewed**: Post-review file data
- **Removed_Snippets**: Detailed list of removed snippets with rationales
- **Removal_Statistics**: Summary of removals by company and category
- **Comparison_Stats**: Side-by-side comparison showing retention rates

## Customization

Edit `config.py` to modify:
- Default file paths
- Excel formatting options
- Category mappings
- Classification priorities