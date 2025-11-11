"""
Configuration for Excel export workflow v2
"""

from pathlib import Path

# Default paths
DEFAULT_MERGED_DIR = Path("results/merged")
DEFAULT_REVIEWED_DIR = Path("results/deduped_and_reviewed") 
DEFAULT_REVIEW_JSONL = Path("results/files_for_dedudped_and_reviewed/review_latest.jsonl")
DEFAULT_OUTPUT_DIR = Path("results/excel_exports")

# Excel formatting options
EXCEL_OPTIONS = {
    "engine": "openpyxl",
    "date_format": "YYYY-MM-DD",
    "datetime_format": "YYYY-MM-DD HH:MM:SS"
}

# Categories and their display names
CATEGORY_MAPPING = {
    "Human Health Risk": "Human Health",
    "Environmental Risk": "Environmental", 
    "Regulatory/Financial Risk": "Regulatory/Financial",
    "Market/Business Risk": "Market/Business"
}

# Classification priority for sorting
CLASSIFICATION_PRIORITY = {
    "FULL_DISCLOSURE": 1,
    "PARTIAL": 2, 
    "UNCLEAR": 3,
    "NO_DISCLOSURE": 4
}