# Create .txt placeholders for source PDFs

Usage (from repository root or using the included .bat):

- Dry run (preview):
  python workflows/create_txt_placeholders/create_placeholders.py --dry-run

- Create .txt files for 2024:
  python workflows/create_txt_placeholders/create_placeholders.py --year 2024

- Specify a different source root:
  python workflows/create_txt_placeholders/create_placeholders.py --source-root "h:\path\to\public\source_documents"

Notes:
- The script will create empty .txt files next to PDFs (e.g., ADAMA-Annual-Report-2024.txt).
- It will not overwrite existing non-empty .txt files.
- Default folder scanned: public/source_documents/*/<year>/
