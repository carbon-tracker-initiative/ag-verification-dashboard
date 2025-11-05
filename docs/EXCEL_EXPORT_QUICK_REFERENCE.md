# Excel Export - Quick Reference Card

**AG Verification Dashboard**

---

## Basic Commands

```bash
# Export everything (recommended)
npm run export:excel

# Get help
npm run export:excel -- --help
```

---

## Filtering Options

| Filter | Example | What it does |
|--------|---------|--------------|
| `--company` | `npm run export:excel -- --company Syngenta` | Export one company only |
| `--year` | `npm run export:excel -- --year 2024` | Export one year only |
| `--version` | `npm run export:excel -- --version v4` | Export one version only |
| `--output` | `npm run export:excel -- --output reports/custom.xlsx` | Save to custom path |

**Combine filters:**
```bash
npm run export:excel -- --company Syngenta --version v4
```

---

## What You Get (7 Sheets)

| Sheet # | Name | Use For |
|---------|------|---------|
| 1 | Executive Summary | Board presentations, high-level stats |
| 2 | Company Details | Benchmarking, company comparisons |
| 3 | Question Performance | Identifying disclosure gaps |
| 4 | Category Analysis | Risk category deep-dives |
| 5 | Snippet Raw Data | Statistical analysis, pivot tables |
| 6 | Verification Report | Quality assurance, audit trails |
| 7 | Column Reference | Understanding what all columns mean |

---

## Output Location

**Default:** `reports/AG_Verification_Summary_YYYY-MM-DD.xlsx`

**Custom:** Whatever you specify with `--output`

---

## Quick Tips

✅ **DO:**
- Use Sheet 1 for quick overviews
- Filter data before complex analysis
- Enable Excel's auto-filter on all sheets
- Use Sheet 5 for pivot tables

❌ **DON'T:**
- Modify the Excel file and expect to re-import it
- Delete columns - filter/hide instead
- Forget to check version (v3 vs v4)

---

## Common Use Cases

**Monthly Report:**
```bash
npm run export:excel -- --output reports/monthly-$(date +%Y-%m).xlsx
```

**Single Company Deep Dive:**
```bash
npm run export:excel -- --company Nutrien
```

**Version Comparison:**
```bash
npm run export:excel -- --version v3 --output reports/v3-data.xlsx
npm run export:excel -- --version v4 --output reports/v4-data.xlsx
```

---

## Troubleshooting

**"No data found"**
→ Check that `results/` folder has `*_verified.json` files

**"No matches"**
→ Check company name spelling (case-insensitive)

**File won't open**
→ Requires Excel 2007+ (.xlsx format)

---

## Need More Help?

📖 **Full Guide:** [docs/EXCEL_EXPORT_GUIDE.md](EXCEL_EXPORT_GUIDE.md)

💬 **Questions?** Open an issue on GitHub

---

**Print this card for easy reference!**
