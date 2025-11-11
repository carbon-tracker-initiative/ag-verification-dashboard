#!/usr/bin/env python3
"""
Apply cross-question LLM review decisions to deduped merger outputs.

Reads a JSONL file produced by review_duplicates.py and writes new
*_deduped_and_reviewed.json files that remove snippets flagged as not belonging
and annotate each question with a cross_question_review summary.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List


def load_review_file(path: Path) -> Dict[str, Dict[str, Dict]]:
    mapping: Dict[str, Dict[str, Dict]] = defaultdict(dict)
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            record = json.loads(line)
            snippet_text = record["snippet"]
            for decision in record["llm_output"].get("decisions", []):
                qid = decision["question_id"]
                mapping[qid].setdefault(snippet_text, decision)
                mapping[qid][snippet_text]["source_file"] = record["source_file"]
    return mapping


def summarize_decisions(decisions: List[Dict]) -> Dict:
    if not decisions:
        return {
            "status": "clean",
            "summary": "All snippets retained; no cross-question conflicts detected.",
            "decisions": [],
        }
    removed = [d for d in decisions if not d["belongs"]]
    if removed:
        summary = (
            f"{len(removed)} snippet(s) removed after cross-question review."
        )
        status = "needs_attention"
    else:
        summary = "All reviewed snippets retained."
        status = "clean"
    return {
        "status": status,
        "summary": summary,
        "decisions": decisions,
    }


def process_file(
    file_path: Path,
    output_suffix: str,
    review_map: Dict[str, Dict[str, Dict]],
    confidence_threshold: float,
) -> Dict[str, int]:
    data = json.loads(file_path.read_text(encoding="utf-8"))
    counts = {"questions_modified": 0, "snippets_removed": 0}

    for question in data.get("analysis_results", []):
        qid = question.get("question_id") or question.get("question_number")
        if not qid or qid not in review_map:
            continue
        question_decisions: List[Dict] = []
        disclosures = question.get("disclosures", [])
        filtered_disclosures = []
        for snippet in disclosures:
            text = (snippet.get("text") or snippet.get("quote") or "").strip()
            decision = review_map[qid].get(text)
            if not decision:
                filtered_disclosures.append(snippet)
                continue
            decision_entry = {
                "snippet_id": snippet.get("snippet_id"),
                "belongs": decision.get("belongs", True),
                "confidence": decision.get("confidence"),
                "rationale": decision.get("rationale", ""),
            }
            question_decisions.append(decision_entry)
            if decision_entry["belongs"] or (
                decision_entry["confidence"] is not None
                and decision_entry["confidence"] < confidence_threshold
            ):
                filtered_disclosures.append(snippet)
            else:
                counts["snippets_removed"] += 1
        if question_decisions:
            question["disclosures"] = filtered_disclosures
            question["cross_question_review"] = summarize_decisions(
                question_decisions
            )
            counts["questions_modified"] += 1
    output_path = file_path.with_name(
        file_path.name.replace("_deduped", output_suffix)
    )
    output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return counts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply LLM review decisions to deduped merger JSON files."
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path("results/merged"),
        help="Directory containing *_deduped.json files",
    )
    parser.add_argument(
        "--pattern",
        default="*_deduped.json",
        help="Glob pattern within input-dir (default: *_deduped.json)",
    )
    parser.add_argument(
        "--review",
        type=Path,
        required=True,
        help="Path to review JSONL produced by review_duplicates.py",
    )
    parser.add_argument(
        "--confidence-threshold",
        type=float,
        default=0.0,
        help="Minimum confidence required to remove a snippet (default: 0)",
    )
    parser.add_argument(
        "--output-suffix",
        default="_deduped_and_reviewed",
        help="Suffix inserted before .json in the output files",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    review_map = load_review_file(args.review)
    files = sorted(args.input_dir.glob(args.pattern))
    total_questions = total_removed = 0

    for file_path in files:
        counts = process_file(
            file_path,
            args.output_suffix,
            review_map,
            args.confidence_threshold,
        )
        total_questions += counts["questions_modified"]
        total_removed += counts["snippets_removed"]
        print(
            f"[apply] {file_path.name}: "
            f"questions modified={counts['questions_modified']}, "
            f"snippets removed={counts['snippets_removed']}"
        )

    print(
        f"\nCompleted review application. Questions updated: {total_questions}. "
        f"Snippets removed: {total_removed}."
    )


if __name__ == "__main__":
    main()
