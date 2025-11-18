# Team-Reviewed Ingest Workflow

This workflow ingests the team-reviewed Excel file and produces:

- Dashboard-ready JSON (per company and combined).
- A collapsed-classification JSON (FULL+PARTIAL → Disclosure; UNCLEAR+NO_DISCLOSURE → No disclosure/unclear).
- A refreshed Excel with cleaned snippets and a collapsed view.

## Inputs
- Reviewed Excel: `reports/team_reviewed/2025-11-11 AG_Verification_Deduped_Reviewed v0_01NG.xlsx`
- Sheet: `Snippet Raw Data`
- New columns appended by the team:
  - `ANALYST`
  - `Relevant Risk?`
  - `Duplicate?`
  - `Correct Classification?`
  - `Notes`
  - `Remove from Analysis?`
  - `Highlight`

## Rules Applied
- Drop any row where `Remove from Analysis?` == `YES` (case-insensitive).
- Ignore `Duplicate?` for dropping.
- Use `Correct Classification?` as the final classification when present; otherwise keep the original `Classification` and flag that reviewer classification is missing.
- Preserve original classifications alongside the final ones.
- Collapsed classification view: FULL_DISCLOSURE + PARTIAL → `Disclosure`; UNCLEAR + NO_DISCLOSURE → `No disclosure/unclear`.

## Outputs
- JSON per company/year: `results/team_reviewed_json/<Company>_<Year>_team_reviewed.json`
- Combined JSON: `results/team_reviewed_json/team_reviewed_combined.json`
- Collapsed JSON per company/year: `results/team_reviewed_json/<Company>_<Year>_team_reviewed_collapsed.json`
- Collapsed combined JSON: `results/team_reviewed_json/team_reviewed_combined_collapsed.json`
- Refreshed Excel (cleaned + collapsed sheets): `reports/team_reviewed/team_reviewed_output.xlsx`

## Run

```bash
npm run ingest:team-review
```

The script lives here: `workflows/team_reviewed/processTeamReview.ts`.
