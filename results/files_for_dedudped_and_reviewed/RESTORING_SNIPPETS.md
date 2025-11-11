# Restoring Snippets Removed by the Cross-Question Review

Use this procedure when you want to reinsert a snippet that the auto-review
workflow removed (or flagged) inside the `_deduped_and_reviewed` files.

## Files to reference

1. **Review decisions** – `workflows/cross_question_llm/output/review_latest.jsonl`
   * Each line contains the snippet text, the affected questions, and the LLM’s
     `decisions` array (`belongs`, `confidence`, `rationale`, `action`).
2. **Original deduped JSON** – `results/merged/<Company>_..._deduped.json`
   * Contains the full snippet objects exactly as they appeared before review.
3. **Reviewed JSON** – `results/deduped_and_reviewed/<Company>_..._deduped_and_reviewed.json`
   * Contains the surviving disclosures plus the `cross_question_review` block
     that documents what changed.

## Step-by-step reinstatement

1. **Locate the decision entry**
   * Search the JSONL for the snippet’s `question_id` and `snippet_id`. Confirm
     why it was removed (check `action` and `rationale`).

2. **Copy the original snippet payload**
   * Open the corresponding `_deduped.json`.
   * Copy the entire disclosure object (everything inside that snippet’s dict,
     not just the text).

3. **Insert into the reviewed JSON**
   * Open the `_deduped_and_reviewed.json` version.
   * Paste the snippet object back into the `disclosures` array for that
     question. Preserve the original `snippet_id` if you want to cross-reference
     the review log later; optionally adjust `snippet_rank` to keep ordering
     consistent.

4. **Update the `cross_question_review` block**
   * Within the same question, find `cross_question_review.decisions`.
   * Locate the entry for the snippet you just restored and:
     - change `action` to `"manually_restored"` (or another tag your tooling
       expects),
     - add a short note to the question-level `summary`, e.g.
       `"Snippet 99907-004 restored on 2025-11-10 after manual review."`

5. **(Optional) Re-run numbering**
   * If you need contiguous snippet ranks, renumber `snippet_id` /
     `snippet_rank` across the question after the insertion. Otherwise leave the
     original IDs so they still match the review log.

6. **Save and track**
   * Save the updated reviewed JSON.
   * If you’re exporting to Excel, ensure the exporter points to the
     `_deduped_and_reviewed` file so the reinstated snippet is included.

## Tips for tooling automation

* **CSV/Excel exporter:** read the JSONL decisions to flag which snippets were
  removed. Provide a “restore” button that, when clicked, copies the snippet
  from the corresponding `_deduped.json` back into the reviewed JSON and updates
  `cross_question_review` as described above.
* **Audit trail:** keep the JSONL file untouched. It acts as the authoritative
  record of every decision (removed, flagged, or kept), even after manual
  restores.
