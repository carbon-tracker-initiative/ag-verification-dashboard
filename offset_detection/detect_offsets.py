"""
Automated Page Offset Detection Script

Detects page number offsets for all company documents by:
1. Scanning company folders for PDFs
2. Sampling pages from each PDF
3. Using OCR to detect labeled page numbers
4. Calculating offsets
5. Generating mappings and evidence

Usage:
    python hallucination_verification/offset_detection/detect_offsets.py
"""

import os
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent))

from pdf_processor import (
    get_pdf_page_count,
    select_sample_pages,
    convert_pdf_page_to_image,
    save_evidence_image,
    get_pdf_info
)
from ocr_detector import detect_labeled_page_number
from offset_calculator import (
    OffsetSample,
    calculate_offset_from_samples,
    create_offset_mapping,
    generate_summary_statistics
)


# Configuration
SOURCE_DOCUMENTS_PATH = r"H:\D_and_M\Ag_project\ag-verification-dashboard\public\source_documents"
OUTPUT_DIR = Path(__file__).parent / "output"
EVIDENCE_DIR = OUTPUT_DIR / "evidence_images"
YEAR = "2024"

# Companies to process
COMPANIES = [
    "ADAMA", "BASF", "Bayer", "CF Industries", "Corteva", "Fertiglobe",
    "FMC", "Grupa Azoty", "ICL", "Mosaic", "Nutrien", "PhosAgro",
    "SABIC Agri-Nutrients", "Scotts Miracle-Gro", "SQM", "Syngenta",
    "Tessenderlo", "UPL", "Xinan", "Yara"
]


def find_pdfs_in_company_folder(company: str) -> List[Path]:
    """
    Find all PDF files in company's 2024 folder.

    Args:
        company: Company name

    Returns:
        List of Path objects for PDF files
    """
    company_path = Path(SOURCE_DOCUMENTS_PATH) / company / YEAR
    print(company_path)
    if not company_path.exists():
        print(f"WARNING: Path not found: {company_path}")
        return []

    pdfs = list(company_path.glob("*.pdf"))
    return pdfs


def process_single_pdf(
    pdf_path: Path,
    company: str,
    num_samples: int = 3,
    verbose: bool = False
) -> Optional[Dict]:
    """
    Process a single PDF to detect page offset.

    Args:
        pdf_path: Path to PDF file
        company: Company name
        num_samples: Number of sample pages (default: 3)
        verbose: Print detailed progress

    Returns:
        Offset mapping dictionary or None if processing failed
    """
    print(f"\n{'='*80}")
    print(f"Processing: {pdf_path.name}")
    print(f"Company: {company}")

    # Get page count
    total_pages = get_pdf_page_count(str(pdf_path))
    if total_pages == 0:
        print(f"ERROR: Could not read PDF or PDF has 0 pages")
        return None

    print(f"Total pages: {total_pages}")

    # Select sample pages
    sample_pages = select_sample_pages(total_pages, num_samples=num_samples)
    print(f"Sample pages: {sample_pages}")

    if not sample_pages:
        print(f"ERROR: No sample pages selected")
        return None

    # Process each sample
    samples = []
    evidence_images = []

    for i, pdf_page in enumerate(sample_pages, 1):
        print(f"\n  Sample {i}/{len(sample_pages)}: PDF page {pdf_page}")

        # Convert to image
        print(f"    Converting PDF page to image...")
        image = convert_pdf_page_to_image(str(pdf_path), pdf_page, dpi=200)

        if image is None:
            print(f"    WARNING: Failed to convert page {pdf_page}")
            samples.append(OffsetSample(pdf_page, None))
            continue

        # Detect page number
        print(f"    Running OCR to detect labeled page number...")
        detected_label = detect_labeled_page_number(image, verbose=verbose)

        if detected_label is None:
            print(f"    WARNING: No labeled page number detected")
        else:
            offset = pdf_page - detected_label
            print(f"    OK: Detected label: {detected_label}")
            print(f"    OK: Calculated offset: {offset} (PDF {pdf_page} - Label {detected_label})")

        # Save evidence image
        evidence_path = save_evidence_image(
            image,
            str(EVIDENCE_DIR),
            company,
            i,
            pdf_page,
            detected_label
        )

        if evidence_path:
            # Store relative path
            rel_path = os.path.relpath(evidence_path, OUTPUT_DIR)
            evidence_images.append(rel_path)
            print(f"    OK: Evidence saved: {rel_path}")

        # Record sample
        samples.append(OffsetSample(pdf_page, detected_label))

    # Calculate offset from samples
    print(f"\n  Calculating consensus offset...")
    offset_result = calculate_offset_from_samples(samples)

    print(f"\n  Results:")
    print(f"    Offset: {offset_result.get('offset', 'None')}")
    print(f"    Confidence: {offset_result['confidence']}")
    print(f"    Agreement: {offset_result['samples_agreed']}/{offset_result['samples_processed']}")

    if 'warning' in offset_result:
        print(f"    WARNING: {offset_result['warning']}")

    if 'message' in offset_result:
        print(f"    INFO: {offset_result['message']}")

    # Create mapping
    company_key = f"{company}_{YEAR}"
    mapping = create_offset_mapping(
        company,
        pdf_path.name,
        offset_result,
        evidence_images,
        method='ocr_auto'
    )

    mapping['company_key'] = company_key
    mapping['pdf_path'] = str(pdf_path)

    return mapping


def process_all_companies(
    companies: List[str],
    num_samples: int = 3,
    verbose: bool = False
) -> Dict[str, Dict]:
    """
    Process all companies to detect offsets.

    Args:
        companies: List of company names
        num_samples: Number of samples per PDF
        verbose: Print detailed progress

    Returns:
        Dictionary of all offset mappings
    """
    all_mappings = {}
    flagged_items = []

    print(f"\n{'='*80}")
    print(f"AUTOMATED PAGE OFFSET DETECTION")
    print(f"{'='*80}")
    print(f"Source: {SOURCE_DOCUMENTS_PATH}")
    print(f"Companies: {len(companies)}")
    print(f"Year: {YEAR}")
    print(f"Samples per PDF: {num_samples}")
    print(f"Output: {OUTPUT_DIR}")

    # Create output directories
    OUTPUT_DIR.mkdir(exist_ok=True)
    EVIDENCE_DIR.mkdir(exist_ok=True)

    # Process each company
    for company_idx, company in enumerate(companies, 1):
        print(f"\n{'='*80}")
        print(f"[{company_idx}/{len(companies)}] Processing company: {company}")
        print(f"{'='*80}")

        # Find PDFs
        pdfs = find_pdfs_in_company_folder(company)

        if not pdfs:
            print(f"WARNING: No PDFs found in {company}/2024/")
            continue

        print(f"Found {len(pdfs)} PDF(s)")

        # Process each PDF (usually just 1-2 per company)
        for pdf_path in pdfs:
            try:
                mapping = process_single_pdf(
                    pdf_path,
                    company,
                    num_samples=num_samples,
                    verbose=verbose
                )

                if mapping:
                    company_key = mapping['company_key']
                    all_mappings[company_key] = mapping

                    # Flag if low confidence
                    if mapping['confidence'] in ['LOW', 'NONE', 'MEDIUM']:
                        flagged_items.append({
                            'company': company,
                            'document': mapping['document_name'],
                            'confidence': mapping['confidence'],
                            'reason': mapping.get('warning') or mapping.get('message', 'Unknown')
                        })

            except Exception as e:
                print(f"\nERROR processing {pdf_path.name}: {e}")
                import traceback
                traceback.print_exc()

    return all_mappings, flagged_items


def save_results(all_mappings: Dict, flagged_items: List):
    """
    Save results to output files.

    Args:
        all_mappings: Dictionary of all offset mappings
        flagged_items: List of items needing review
    """
    print(f"\n{'='*80}")
    print(f"SAVING RESULTS")
    print(f"{'='*80}")

    # Save JSON mappings
    mappings_file = OUTPUT_DIR / "page_offset_mappings.json"
    with open(mappings_file, 'w') as f:
        json.dump(all_mappings, f, indent=2)
    print(f"OK: Saved mappings: {mappings_file}")

    # Generate summary statistics
    stats = generate_summary_statistics(all_mappings)

    # Save detection report
    report_file = OUTPUT_DIR / "detection_report.txt"
    with open(report_file, 'w') as f:
        f.write("="*80 + "\n")
        f.write("PAGE OFFSET DETECTION REPORT\n")
        f.write("="*80 + "\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Source: {SOURCE_DOCUMENTS_PATH}\n")
        f.write(f"Year: {YEAR}\n\n")

        f.write("SUMMARY STATISTICS\n")
        f.write("-"*80 + "\n")
        f.write(f"Total documents processed: {stats['total_documents']}\n\n")

        f.write("Confidence Distribution:\n")
        for conf, count in stats['confidence_distribution'].items():
            f.write(f"  {conf:10s}: {count:3d} ({count/stats['total_documents']*100:5.1f}%)\n")

        f.write(f"\nDocuments with offset: {stats['documents_with_offset']}\n")
        f.write(f"Documents without offset: {stats['documents_no_offset']}\n\n")

        if 'offset_statistics' in stats:
            f.write("Offset Statistics:\n")
            f.write(f"  Min: {stats['offset_statistics']['min']}\n")
            f.write(f"  Max: {stats['offset_statistics']['max']}\n")
            f.write(f"  Mean: {stats['offset_statistics']['mean']:.2f}\n")
            f.write(f"  Median: {stats['offset_statistics']['median']}\n")
            f.write(f"  Mode: {stats['offset_statistics']['mode']}\n\n")

        f.write("\nDETAILED RESULTS\n")
        f.write("="*80 + "\n\n")

        for company_key, mapping in sorted(all_mappings.items()):
            f.write(f"{company_key}\n")
            f.write(f"  Document: {mapping['document_name']}\n")
            f.write(f"  Offset: {mapping.get('offset', 'None')}\n")
            f.write(f"  Confidence: {mapping['confidence']}\n")
            f.write(f"  Samples: {mapping['samples_agreed']}/{mapping['samples_processed']} agreed\n")

            if 'warning' in mapping:
                f.write(f"  WARNING: {mapping['warning']}\n")

            if 'message' in mapping:
                f.write(f"  INFO: {mapping['message']}\n")

            f.write(f"\n")

    print(f"OK: Saved report: {report_file}")

    # Save flagged items
    if flagged_items:
        flagged_file = OUTPUT_DIR / "flagged_for_review.txt"
        with open(flagged_file, 'w') as f:
            f.write("="*80 + "\n")
            f.write("ITEMS FLAGGED FOR MANUAL REVIEW\n")
            f.write("="*80 + "\n\n")
            f.write(f"Total flagged: {len(flagged_items)}\n\n")

            for item in flagged_items:
                f.write(f"Company: {item['company']}\n")
                f.write(f"Document: {item['document']}\n")
                f.write(f"Confidence: {item['confidence']}\n")
                f.write(f"Reason: {item['reason']}\n")
                f.write(f"\n")

        print(f"OK: Saved flagged items: {flagged_file}")
        print(f"  {len(flagged_items)} item(s) need manual review")
    else:
        print(f"OK: No items flagged for review")

    print(f"\n{'='*80}")
    print(f"COMPLETE!")
    print(f"{'='*80}")
    print(f"Results saved to: {OUTPUT_DIR}")
    print(f"Evidence images: {EVIDENCE_DIR}")
    print(f"\nNext steps:")
    print(f"  1. Review detection_report.txt")
    print(f"  2. Check flagged_for_review.txt (if any)")
    print(f"  3. Examine evidence images for validation")
    print(f"  4. Integrate page_offset_mappings.json into verification system")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description='Automated Page Offset Detection')
    parser.add_argument('--companies', nargs='+', help='Specific companies to process (default: all)')
    parser.add_argument('--samples', type=int, default=3, help='Number of sample pages per PDF (default: 3)')
    parser.add_argument('--verbose', action='store_true', help='Print detailed OCR output')

    args = parser.parse_args()

    companies_to_process = args.companies if args.companies else COMPANIES

    # Run detection
    all_mappings, flagged_items = process_all_companies(
        companies_to_process,
        num_samples=args.samples,
        verbose=args.verbose
    )

    # Save results
    save_results(all_mappings, flagged_items)


if __name__ == "__main__":
    main()
