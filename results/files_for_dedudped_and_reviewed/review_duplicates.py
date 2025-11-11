#!/usr/bin/env python3
"""
LLM-assisted cross-question snippet reviewer.

Scans deduplicated merger outputs, finds snippets that appear under multiple
questions, and asks Gemini to decide whether each snippet truly belongs on
every question it is attached to.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:  # noqa: E402
    from ai_core import call_ai_with_caching
    import config
    AI_IMPORT_ERROR: ModuleNotFoundError | None = None
except ModuleNotFoundError as exc:  # pragma: no cover - fallback for missing deps
    call_ai_with_caching = None  # type: ignore
    config = None  # type: ignore
    AI_IMPORT_ERROR = exc


def normalize_text(text: str) -> str:
    return " ".join(text.split()).lower()


def iter_duplicate_groups(
    files: Iterable[Path], skip_placeholder: bool = True
) -> Iterable[Dict]:
    for file_path in files:
        data = json.loads(file_path.read_text(encoding="utf-8"))
        snippet_map: Dict[str, Dict] = {}
        for question in data.get("analysis_results", []):
            qid = question.get("question_id") or question.get("question_number")
            if not qid:
                continue
            question_text = question.get("question_text", "").strip()
            category = question.get("category", "")
            for snip in question.get("disclosures", []):
                text = (snip.get("text") or snip.get("quote") or "").strip()
                if not text:
                    continue
                if skip_placeholder and text.lower().startswith("no disclosure found"):
                    continue
                key = normalize_text(text)
                snippet_map.setdefault(
                    key,
                    {
                        "text": text,
                        "file": str(file_path),
                        "entries": [],
                    },
                )
                snippet_map[key]["entries"].append(
                    {
                        "question_id": str(qid),
                        "question_text": question_text,
                        "category": category,
                        "snippet_id": snip.get("snippet_id"),
                        "classification": snip.get("classification"),
                    }
                )
        for group in snippet_map.values():
            if len({entry["question_id"] for entry in group["entries"]}) > 1:
                yield group


PROMPT_TEMPLATE = """You are reviewing evidence snippets for a disclosure QA dataset.

Snippet:
<<<{snippet}>>>

Questions:
{question_block}

For each question decide if this snippet truly belongs in that question's evidence.
Respond with JSON in the following structure (no backticks):
{{
  "decisions": [
    {{"question_id": "...", "belongs": true/false, "confidence": 0.0-1.0, "rationale": "short justification"}}
  ],
  "notes": "optional reviewer notes or empty string"
}}

Make the rationale specific to the question wording (cite clauses such as "mentions lawsuits" or
"only discusses product marketing, not water pollution").
"""


def build_question_block(entries: List[Dict]) -> str:
    lines = []
    for idx, entry in enumerate(entries, start=1):
        question_text = entry["question_text"].replace("\n", " ").strip()
        lines.append(
            f"{idx}) {entry['question_id']} [{entry['category']}] "
            f"- {question_text}"
        )
    return "\n".join(lines)


def review_group(snippet_text: str, entries: List[Dict], model: str) -> Dict:
    if call_ai_with_caching is None:
        raise RuntimeError(
            "ai_core (and its dependencies) are not available in this environment. "
            "Install requirements or activate the virtualenv before running without --dry-run."
        ) from AI_IMPORT_ERROR
    prompt = PROMPT_TEMPLATE.format(
        snippet=snippet_text,
        question_block=build_question_block(entries),
    )
    original_model = config.AI_MODEL if config else None
    if config:
        config.AI_MODEL = model or config.AI_MODEL
    try:
        task_id = f"cross_question_{abs(hash(snippet_text)) % 10_000_000}"
        response = call_ai_with_caching(
            prompt,
            task_id=task_id,
            doc_set_id="cross_question_review",
            max_retries=2,
            operation_type="cross_question_review",
        )
    finally:
        if config and original_model is not None:
            config.AI_MODEL = original_model

    if not isinstance(response, dict):
        raise ValueError(
            f"LLM response was not JSON for task {task_id}: {response}"
        )
    parsed = response
    decisions = parsed.get("decisions", [])
    return {
        "snippet": snippet_text,
        "questions": entries,
        "llm_output": parsed,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="LLM workflow to validate duplicated snippets across questions"
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=ROOT / "results" / "merged",
        help="Directory containing merged JSON files (default: results/merged)",
    )
    parser.add_argument(
        "--pattern",
        default="*_deduped.json",
        help="Glob pattern relative to input-dir (default: *_deduped.json)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Path to JSONL output (default: workflows/cross_question_llm/output/review_<timestamp>.jsonl)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Maximum number of duplicate groups to review",
    )
    parser.add_argument(
        "--skip-placeholder",
        dest="skip_placeholder",
        action="store_true",
        help="Skip snippets that start with 'No disclosure found' (default)",
    )
    parser.add_argument(
        "--include-placeholder",
        dest="skip_placeholder",
        action="store_false",
        help="Include 'No disclosure found' snippets in the review",
    )
    parser.set_defaults(skip_placeholder=True)
    parser.add_argument(
        "--model",
        default="gemini-2.5-pro",
        help="LLM model name (default: gemini-2.5-pro)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List duplicate groups without calling the LLM",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    files = sorted(args.input_dir.glob(args.pattern))
    if not files:
        raise SystemExit(f"No files found in {args.input_dir} matching {args.pattern}")

    output_path = args.output
    if not output_path:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output_dir = ROOT / "workflows" / "cross_question_llm" / "output"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"review_{timestamp}.jsonl"
    else:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    groups = iter_duplicate_groups(files, skip_placeholder=args.skip_placeholder)
    processed = 0
    groups_seen = 0
    with output_path.open("w", encoding="utf-8") as writer:
        for group_idx, group in enumerate(groups, start=1):
            if args.limit and groups_seen >= args.limit:
                break
            groups_seen += 1
            if args.dry_run:
                print(
                    f"[dry-run] Group {group_idx}: snippet='{group['text'][:80]}...' "
                    f"(questions={len(group['entries'])})"
                )
                continue
            review = review_group(group["text"], group["entries"], args.model)
            review["source_file"] = group["file"]
            writer.write(json.dumps(review, ensure_ascii=False) + "\n")
            processed += 1
            print(
                f"[reviewed] Group {group_idx} "
                f"(questions={len(group['entries'])}) -> {output_path.name}"
            )

    if args.dry_run:
        print(f"Dry run complete (previewed {groups_seen} group(s)).")
    else:
        print(f"Wrote {processed} review records to {output_path}")


if __name__ == "__main__":
    main()
