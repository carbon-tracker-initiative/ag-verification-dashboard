# Cross-Question LLM Workflow

This workflow reviews the already **deduplicated** merger outputs and uses an
LLM to decide whether snippets that appear under multiple questions are truly
valid for each question.

## Goals

1. **Surface questionable mappings:** Identify snippets that were copied across
   unrelated questions (e.g., marketing statements or compliance boilerplate).
2. **Preserve true overlaps:** Keep disclosures that legitimately span multiple
   risk prompts (e.g., a litigation disclosure that affects both human health
   and class-action questions).
3. **Produce auditable decisions:** Emit a structured JSONL file that records
   the model’s "keep/remove" vote and rationale for every question/snippet
   pair so analysts can review and override if needed.

## How It Works

1. **Collect duplicates:** `review_duplicates.py` scans every
   `*_deduped.json` file in `results/merged/`. Snippets are normalized by
   collapsing whitespace/lowercasing. Any snippet that appears under multiple
   `question_id`s becomes a "duplicate group".
2. **Build LLM prompts:** For each group, the script sends the snippet text and
   the full metadata for every question it appears in (ID, category,
   question text) to Gemini via `ai_core.call_ai_with_caching`.
3. **LLM decision:** The model must return JSON containing one entry per
   question with:
   - `belongs` (bool): should this snippet stay on that question?
   - `confidence` (0‑1 float)
   - `rationale`: concise justification referencing the question language.
4. **Output:** Results are written to JSON Lines (default
   `workflows/cross_question_llm/output/review_{timestamp}.jsonl`). Each line
   contains the snippet, the question metadata, and the LLM’s decision. This
   file powers the second stage (`apply_review.py`) that generates the final
   reviewed JSON.

### Applying the Review

`apply_review.py` reads the JSONL decisions and writes new
`*_deduped_and_reviewed.json` files next to the originals. For each question it:

- Removes snippets where `belongs=false` (honoring optional confidence or
  approval filters).
- Adds a `cross_question_review` block summarizing the outcome, e.g.

```json
"cross_question_review": {
  "status": "needs_attention",
  "summary": "Snippet 99907-004 removed: mentions reputation, no water-contamination context.",
  "decisions": [
    {
      "snippet_id": "99907-004",
      "belongs": false,
      "confidence": 0.31,
      "rationale": "Only references reputation risk."
    }
  ]
}
```

Questions with no flagged snippets receive `status: "clean"` and an empty
`decisions` array so dashboards can highlight which answers changed.

## Running the Workflow

```bash
.\ag-env\Scripts\Activate.ps1
python workflows/cross_question_llm/review_duplicates.py \
  --input-dir results/merged \
  --output workflows/cross_question_llm/output/review_latest.jsonl \
  --limit 200
```

Key options:

| Option | Description |
| --- | --- |
| `--input-dir` | Directory with merged JSON files (defaults to `results/merged`). |
| `--pattern` | Glob for files (defaults to `*_deduped.json`). |
| `--skip-placeholder` | Ignore snippets that start with “No disclosure found” (default `True`). |
| `--limit` | Cap the number of duplicate groups reviewed in a single run. |
| `--resume-from` | Skip ahead to a particular group ID if re-running. |
| `--dry-run` | Print planned groups without calling the LLM. |

The script never mutates the source JSON. It only emits review data so humans
can decide which snippets to remove or reclassify.

To apply a review JSONL:

```bash
python workflows/cross_question_llm/apply_review.py \
  --input-dir results/merged \
  --review workflows/cross_question_llm/output/review_latest.jsonl \
  --confidence-threshold 0.5
```

This writes `*_deduped_and_reviewed.json` files and reports how many snippets
were removed or annotated per company.

For a one-command batch run with defaults (input = `results/merged`,
output = `results/deduped_and_reviewed`, review file =
`workflows/cross_question_llm/output/review_latest.jsonl`), run from the repo
root:

```
python apply_review_to_all_companies.py
```

Use `--removal-threshold` to control how confident the LLM must be before a
snippet is actually removed (default 0.7). Snippets below the threshold stay in
place but are flagged in `cross_question_review`.

## Next Steps

1. Feed the JSONL output into a simple triage UI (or spreadsheet) so analysts
   can batch-accept or override the LLM decisions.
2. Schedule the reviewer + apply pipeline nightly so new merger outputs are
   flagged and cleaned automatically once approved.
