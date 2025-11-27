"""
PDF Processing Module for Page Offset Detection

Handles PDF page extraction and conversion to images for OCR processing.
"""

import os
from typing import List, Optional, Tuple
from pdf2image import convert_from_path
from PIL import Image
import fitz  # PyMuPDF - For page count (faster than pdf2image)


def get_pdf_page_count(pdf_path: str) -> int:
    """
    Get total number of pages in a PDF.

    Args:
        pdf_path: Path to PDF file

    Returns:
        Total number of pages
    """
    try:
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        doc.close()
        return page_count
    except Exception as e:
        print(f"Error getting page count for {pdf_path}: {e}")
        return 0


def select_sample_pages(total_pages: int, num_samples: int = 3, skip_first: int = 5) -> List[int]:
    """
    Select sample pages from a PDF for offset detection.

    Selects pages from middle section of document to ensure they have
    labeled page numbers (skipping cover, TOC, etc.).

    Args:
        total_pages: Total number of pages in PDF
        num_samples: Number of sample pages to select (default: 3)
        skip_first: Number of pages to skip from beginning (default: 5)

    Returns:
        List of page numbers to sample (1-indexed)
    """
    if total_pages <= skip_first:
        # Document too short, just sample middle page
        return [total_pages // 2] if total_pages > 0 else []

    # Calculate positions: 33%, 50%, 66% of usable pages
    usable_start = skip_first + 1
    usable_end = total_pages
    usable_range = usable_end - usable_start

    if usable_range < num_samples:
        # Not enough pages, sample what we can
        return list(range(usable_start, usable_end + 1))

    # Select evenly distributed samples
    positions = []
    for i in range(num_samples):
        fraction = (i + 1) / (num_samples + 1)  # 0.25, 0.5, 0.75 for num_samples=3
        page = int(usable_start + (usable_range * fraction))
        positions.append(page)

    return positions


def convert_pdf_page_to_image(
    pdf_path: str,
    page_number: int,
    dpi: int = 200
) -> Optional[Image.Image]:
    """
    Convert a single PDF page to PIL Image.

    Args:
        pdf_path: Path to PDF file
        page_number: Page number to convert (1-indexed)
        dpi: Resolution for conversion (default: 200, higher = better OCR but slower)

    Returns:
        PIL Image object, or None if conversion fails
    """
    try:
        # Convert specific page (pdf2image uses 1-indexed pages)
        images = convert_from_path(
            pdf_path,
            dpi=dpi,
            first_page=page_number,
            last_page=page_number,
            thread_count=1  # Single thread to avoid issues
        )

        if images:
            return images[0]
        else:
            print(f"No image generated for page {page_number} of {pdf_path}")
            return None

    except Exception as e:
        print(f"Error converting page {page_number} of {pdf_path}: {e}")
        return None


def save_evidence_image(
    image: Image.Image,
    output_path: str,
    company: str,
    sample_num: int,
    pdf_page: int,
    detected_label: Optional[int] = None
) -> str:
    """
    Save evidence image with descriptive filename.

    Args:
        image: PIL Image to save
        output_path: Directory to save image
        company: Company name
        sample_num: Sample number (1, 2, 3, etc.)
        pdf_page: PDF page number
        detected_label: Detected labeled page number (if known)

    Returns:
        Path to saved image
    """
    os.makedirs(output_path, exist_ok=True)

    # Generate filename
    if detected_label is not None:
        filename = f"{company}_2024_sample{sample_num}_pdf{pdf_page}_detected{detected_label}.png"
    else:
        filename = f"{company}_2024_sample{sample_num}_pdf{pdf_page}_nodetection.png"

    filepath = os.path.join(output_path, filename)

    try:
        image.save(filepath, 'PNG')
        return filepath
    except Exception as e:
        print(f"Error saving image to {filepath}: {e}")
        return ""


def get_pdf_info(pdf_path: str) -> dict:
    """
    Get PDF metadata and info.

    Args:
        pdf_path: Path to PDF file

    Returns:
        Dictionary with PDF info (title, pages, size, etc.)
    """
    try:
        doc = fitz.open(pdf_path)
        info = {
            'path': pdf_path,
            'filename': os.path.basename(pdf_path),
            'pages': len(doc),
            'size_mb': os.path.getsize(pdf_path) / (1024 * 1024),
            'metadata': doc.metadata
        }
        doc.close()
        return info
    except Exception as e:
        return {
            'path': pdf_path,
            'filename': os.path.basename(pdf_path),
            'error': str(e)
        }


# Test functions
def test_pdf_processor():
    """
    Test PDF processor functions with sample PDF.
    """
    # This would be run with actual PDF path for testing
    print("PDF Processor Module Loaded Successfully")
    print("Available functions:")
    print("  - get_pdf_page_count(pdf_path)")
    print("  - select_sample_pages(total_pages, num_samples=3)")
    print("  - convert_pdf_page_to_image(pdf_path, page_number)")
    print("  - save_evidence_image(image, output_path, ...)")
    print("  - get_pdf_info(pdf_path)")


if __name__ == "__main__":
    test_pdf_processor()
