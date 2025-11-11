#!/usr/bin/env python3
"""
Comprehensive Excel export workflow for merged and deduped+reviewed files analysis.
Creates multiple Excel files comparing the data evolution and tracking removed snippets.
"""

import json
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import argparse

class ComprehensiveExcelExporter:
    def __init__(self, 
                 merged_dir: Path, 
                 reviewed_dir: Path, 
                 review_jsonl: Path,
                 output_dir: Path):
        self.merged_dir = merged_dir
        self.reviewed_dir = reviewed_dir
        self.review_jsonl = review_jsonl
        self.output_dir = output_dir
        self.output_dir.mkdir(exist_ok=True)
        
        # Load review decisions
        self.review_decisions = self._load_review_decisions()
        
    def _load_review_decisions(self) -> Dict[str, Any]:
        """Load and parse the review JSONL file."""
        decisions = {}
        removed_snippets = []
        
        if not self.review_jsonl.exists():
            print(f"Warning: Review file not found at {self.review_jsonl}")
            return {"decisions": {}, "removed_snippets": []}
            
        with open(self.review_jsonl, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entry = json.loads(line)
                    snippet_text = entry.get("snippet", "")
                    source_file = entry.get("source_file", "")
                    
                    # Extract company name from source file
                    company = self._extract_company_name(source_file)
                    
                    for decision in entry.get("llm_output", {}).get("decisions", []):
                        question_id = decision.get("question_id")
                        belongs = decision.get("belongs", True)
                        confidence = decision.get("confidence", 0.0)
                        rationale = decision.get("rationale", "")
                        
                        # Find original question info
                        question_info = next(
                            (q for q in entry.get("questions", []) if q.get("question_id") == question_id),
                            {}
                        )
                        
                        key = f"{company}_{question_id}"
                        decisions[key] = decision
                        
                        # Track removed snippets
                        if not belongs:
                            removed_snippets.append({
                                "company": company,
                                "question_id": question_id,
                                "question_text": question_info.get("question_text", ""),
                                "category": question_info.get("category", ""),
                                "snippet_id": question_info.get("snippet_id", ""),
                                "snippet_text": snippet_text[:200] + "..." if len(snippet_text) > 200 else snippet_text,
                                "rationale": rationale,
                                "confidence": confidence,
                                "source_file": source_file
                            })
        
        return {"decisions": decisions, "removed_snippets": removed_snippets}
    
    def _extract_company_name(self, file_path: str) -> str:
        """Extract company name from file path."""
        path = Path(file_path)
        name = path.name
        # Remove common suffixes
        for suffix in ["_merged", "_deduped", "_deduped_and_reviewed"]:
            if suffix in name:
                name = name.split(suffix)[0]
                break
        # Remove year and other patterns
        parts = name.split("_")
        if len(parts) > 1 and parts[1].isdigit():
            return parts[0]
        return parts[0]
    
    def _process_file_data(self, file_path: Path) -> Dict[str, Any]:
        """Process a single JSON file and extract summary data."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            return {}
        
        company_name = self._extract_company_name(str(file_path))
        analysis_results = data.get("analysis_results", [])
        
        summary_data = []
        
        for question in analysis_results:
            question_id = question.get("question_id", "")
            question_text = question.get("question_text", "")
            category = question.get("category", "")
            disclosures = question.get("disclosures", [])
            
            # Filter out placeholder disclosures
            real_disclosures = [
                d for d in disclosures 
                if not d.get("snippet_text", "").startswith("No disclosure found")
            ]
            
            disclosure_count = len(real_disclosures)
            classifications = [d.get("classification", "") for d in real_disclosures]
            
            # Count classifications
            full_count = classifications.count("FULL_DISCLOSURE")
            partial_count = classifications.count("PARTIAL")
            unclear_count = classifications.count("UNCLEAR")
            
            # Check if this question was affected by review process
            review_info = question.get("cross_question_review", {})
            review_status = review_info.get("status", "no_review")
            removed_count = len([
                d for d in review_info.get("decisions", []) 
                if not d.get("belongs", True)
            ])
            
            summary_data.append({
                "Company": company_name,
                "Question_ID": question_id,
                "Question_Text": question_text,
                "Category": category,
                "Total_Disclosures": disclosure_count,
                "Full_Disclosure": full_count,
                "Partial_Disclosure": partial_count,
                "Unclear": unclear_count,
                "Review_Status": review_status,
                "Snippets_Removed": removed_count,
                "File_Type": "merged" if "_merged" in str(file_path) else "reviewed"
            })
        
        return {
            "company": company_name,
            "summary_data": summary_data,
            "total_questions": len(analysis_results),
            "total_disclosures": sum(len(q.get("disclosures", [])) for q in analysis_results)
        }
    
    def create_merged_only_excel(self) -> Path:
        """Create Excel file with merged files summary only."""
        print("Creating merged files summary...")
        
        all_data = []
        merged_files = list(self.merged_dir.glob("*_merged*.json"))
        
        for file_path in merged_files:
            file_data = self._process_file_data(file_path)
            all_data.extend(file_data.get("summary_data", []))
        
        df = pd.DataFrame(all_data)
        output_path = self.output_dir / "merged_files_summary.xlsx"
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Merged_Summary', index=False)
            
            # Create company overview
            company_stats = df.groupby('Company').agg({
                'Total_Disclosures': 'sum',
                'Full_Disclosure': 'sum',
                'Partial_Disclosure': 'sum',
                'Unclear': 'sum'
            }).reset_index()
            company_stats.to_excel(writer, sheet_name='Company_Overview', index=False)
        
        print(f"Created: {output_path}")
        return output_path
    
    def create_reviewed_only_excel(self) -> Path:
        """Create Excel file with deduped and reviewed files summary only."""
        print("Creating deduped and reviewed files summary...")
        
        all_data = []
        reviewed_files = list(self.reviewed_dir.glob("*_deduped_and_reviewed.json"))
        
        for file_path in reviewed_files:
            file_data = self._process_file_data(file_path)
            all_data.extend(file_data.get("summary_data", []))
        
        df = pd.DataFrame(all_data)
        output_path = self.output_dir / "deduped_reviewed_summary.xlsx"
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Reviewed_Summary', index=False)
            
            # Create company overview
            company_stats = df.groupby('Company').agg({
                'Total_Disclosures': 'sum',
                'Full_Disclosure': 'sum',
                'Partial_Disclosure': 'sum',
                'Unclear': 'sum',
                'Snippets_Removed': 'sum'
            }).reset_index()
            company_stats.to_excel(writer, sheet_name='Company_Overview', index=False)
        
        print(f"Created: {output_path}")
        return output_path
    
    def create_comprehensive_excel(self) -> Path:
        """Create comprehensive comparison Excel file."""
        print("Creating comprehensive analysis...")
        
        # Process merged files
        merged_data = []
        merged_files = list(self.merged_dir.glob("*_merged*.json"))
        for file_path in merged_files:
            if not any(skip in str(file_path) for skip in ["_deduped", "_reviewed"]):
                file_data = self._process_file_data(file_path)
                merged_data.extend(file_data.get("summary_data", []))
        
        # Process reviewed files
        reviewed_data = []
        reviewed_files = list(self.reviewed_dir.glob("*_deduped_and_reviewed.json"))
        for file_path in reviewed_files:
            file_data = self._process_file_data(file_path)
            reviewed_data.extend(file_data.get("summary_data", []))
        
        # Create comparison statistics
        merged_df = pd.DataFrame(merged_data)
        reviewed_df = pd.DataFrame(reviewed_data)
        
        output_path = self.output_dir / "comprehensive_analysis.xlsx"
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Original merged data
            merged_df.to_excel(writer, sheet_name='Original_Merged', index=False)
            
            # Reviewed data
            reviewed_df.to_excel(writer, sheet_name='Deduped_Reviewed', index=False)
            
            # Removed snippets analysis
            removed_df = pd.DataFrame(self.review_decisions["removed_snippets"])
            if not removed_df.empty:
                removed_df.to_excel(writer, sheet_name='Removed_Snippets', index=False)
                
                # Removal statistics by company and category
                removal_stats = removed_df.groupby(['company', 'category']).agg({
                    'question_id': 'count',
                    'confidence': 'mean'
                }).rename(columns={'question_id': 'snippets_removed', 'confidence': 'avg_confidence'}).reset_index()
                removal_stats.to_excel(writer, sheet_name='Removal_Statistics', index=False)
            
            # Overall comparison
            comparison_stats = self._create_comparison_stats(merged_df, reviewed_df)
            comparison_stats.to_excel(writer, sheet_name='Comparison_Stats', index=False)
        
        print(f"Created: {output_path}")
        return output_path
    
    def _create_comparison_stats(self, merged_df: pd.DataFrame, reviewed_df: pd.DataFrame) -> pd.DataFrame:
        """Create comparison statistics between merged and reviewed data."""
        if merged_df.empty or reviewed_df.empty:
            return pd.DataFrame()
        
        merged_stats = merged_df.groupby('Company').agg({
            'Total_Disclosures': 'sum'
        }).rename(columns={'Total_Disclosures': 'Merged_Disclosures'})
        
        reviewed_stats = reviewed_df.groupby('Company').agg({
            'Total_Disclosures': 'sum',
            'Snippets_Removed': 'sum'
        }).rename(columns={'Total_Disclosures': 'Reviewed_Disclosures'})
        
        comparison = pd.merge(merged_stats, reviewed_stats, left_index=True, right_index=True, how='outer')
        comparison['Disclosures_Lost'] = comparison['Merged_Disclosures'] - comparison['Reviewed_Disclosures']
        comparison['Retention_Rate'] = (comparison['Reviewed_Disclosures'] / comparison['Merged_Disclosures'] * 100).round(2)
        
        return comparison.reset_index()
    
    def run_all(self):
        """Run all Excel generation workflows."""
        print(f"Starting comprehensive Excel export at {datetime.now()}")
        
        self.create_merged_only_excel()
        self.create_reviewed_only_excel()
        self.create_comprehensive_excel()
        
        print(f"All Excel files created in: {self.output_dir}")

def parse_args():
    parser = argparse.ArgumentParser(description="Generate comprehensive Excel reports for merged and reviewed data")
    parser.add_argument("--merged-dir", type=Path, default=Path("results/merged"),
                      help="Directory containing merged JSON files")
    parser.add_argument("--reviewed-dir", type=Path, default=Path("results/deduped_and_reviewed"),
                      help="Directory containing deduped and reviewed JSON files")
    parser.add_argument("--review-jsonl", type=Path, 
                      default=Path("results/files_for_dedudped_and_reviewed/review_latest.jsonl"),
                      help="Path to review decisions JSONL file")
    parser.add_argument("--output-dir", type=Path, default=Path("results/excel_exports"),
                      help="Output directory for Excel files")
    return parser.parse_args()

def main():
    args = parse_args()
    
    exporter = ComprehensiveExcelExporter(
        merged_dir=args.merged_dir,
        reviewed_dir=args.reviewed_dir,
        review_jsonl=args.review_jsonl,
        output_dir=args.output_dir
    )
    
    exporter.run_all()

if __name__ == "__main__":
    main()