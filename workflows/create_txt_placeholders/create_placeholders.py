import argparse
from pathlib import Path
import sys

def find_pdf_files(source_root: Path, year: str, extensions=(".pdf", ".PDF")):
    """Yield tuples (company_dir, pdf_path) for pdfs under source_root/*/year/"""
    if not source_root.exists():
        print(f"Source root not found: {source_root}")
        return

    for company_dir in sorted(source_root.iterdir()):
        if not company_dir.is_dir():
            continue
        year_dir = company_dir / year
        if not year_dir.exists() or not year_dir.is_dir():
            continue
        for file in sorted(year_dir.iterdir()):
            if file.suffix in extensions and file.is_file():
                yield company_dir, file

def create_txt_for_pdf(pdf_path: Path, dry_run: bool = False):
    txt_path = pdf_path.with_suffix(".txt")
    if txt_path.exists():
        # If file exists but empty, update; if non-empty, skip to be safe
        if txt_path.stat().st_size == 0:
            if dry_run:
                print(f"[DRY] Would (ensure) create empty file: {txt_path}")
            else:
                txt_path.write_text("", encoding="utf-8")
                print(f"Updated (empty) file: {txt_path}")
            return True
        else:
            print(f"Skipped (already exists, non-empty): {txt_path}")
            return False
    else:
        if dry_run:
            print(f"[DRY] Would create: {txt_path}")
        else:
            try:
                txt_path.write_text("", encoding="utf-8")
                print(f"Created: {txt_path}")
            except Exception as e:
                print(f"Error creating {txt_path}: {e}")
                return False
        return True

def main():
    parser = argparse.ArgumentParser(description="Create .txt placeholders next to PDF files under public/source_documents/*/<year>/")
    parser.add_argument("--year", default="2024", help="Target year folder to scan (default: 2024)")
    parser.add_argument("--source-root", default=None, help="Optional override for public/source_documents path")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be created without writing files")
    parser.add_argument("--extensions", default=".pdf,.PDF", help="Comma-separated list of file extensions to consider (default: .pdf,.PDF)")
    args = parser.parse_args()

    # Determine repo root relative to this script
    repo_root = Path(__file__).resolve().parents[2]
    default_source = repo_root / "public" / "source_documents"
    source_root = Path(args.source_root) if args.source_root else default_source

    exts = tuple(ext.strip() for ext in args.extensions.split(","))

    print(f"Repo root: {repo_root}")
    print(f"Scanning source root: {source_root}")
    print(f"Target year: {args.year}")
    print(f"Dry run: {args.dry_run}")
    print()

    total_pdfs = 0
    created_count = 0
    skipped_count = 0
    error_count = 0

    for company_dir, pdf in find_pdf_files(source_root, args.year, exts):
        total_pdfs += 1
        try:
            ok = create_txt_for_pdf(pdf, dry_run=args.dry_run)
            if ok:
                created_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"Error processing {pdf}: {e}")
            error_count += 1

    print()
    print("Summary:")
    print(f"  PDFs found:       {total_pdfs}")
    print(f"  Txt files created: {created_count}")
    print(f"  Skipped (existing non-empty): {skipped_count}")
    print(f"  Errors:            {error_count}")

if __name__ == "__main__":
    main()
