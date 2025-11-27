"""
OCR Page Number Detection Module

Detects labeled page numbers from PDF page images using OCR.
"""

import re
from typing import Optional, List, Dict, Tuple
from PIL import Image
import pytesseract


# Common page number patterns
PAGE_PATTERNS = [
    # "Page 42", "Page: 42", "P. 42"
    r'\bPage[\s:\.]*(\d+)\b',
    r'\bP[\s:\.]+(\d+)\b',

    # "- 42 -", "| 42 |"
    r'[-|]\s*(\d+)\s*[-|]',

    # Just isolated numbers (likely page numbers if in footer/header)
    r'^\s*(\d+)\s*$',  # Standalone number on a line

    # "42 of 100", "42/100"
    r'\b(\d+)\s*(?:of|/)\s*\d+\b',
]


def detect_labeled_page_number(
    image: Image.Image,
    verbose: bool = False
) -> Optional[int]:
    """
    Detect labeled page number from PDF page image using OCR.

    Args:
        image: PIL Image of PDF page
        verbose: Print debug information

    Returns:
        Detected page number (int) or None if not found
    """
    try:
        # Run OCR on full page
        text = pytesseract.image_to_string(image)

        if verbose:
            print(f"OCR Text (first 200 chars):\n{text[:200]}\n")

        # Also get OCR data with coordinates to identify footer/header numbers
        ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

        # Method 1: Look for patterns in full text
        pattern_matches = find_page_number_patterns(text, verbose=verbose)

        # Method 2: Look for isolated numbers in footer/header regions
        positional_matches = find_positional_page_numbers(ocr_data, image.size, verbose=verbose)

        # Combine results (prioritize positional matches as they're more reliable)
        all_candidates = positional_matches + pattern_matches

        if not all_candidates:
            if verbose:
                print("No page number candidates found")
            return None

        # Return most likely candidate (first positional match, or first pattern match)
        result = all_candidates[0]

        if verbose:
            print(f"Selected page number: {result}")

        return result

    except Exception as e:
        print(f"Error during OCR: {e}")
        return None


def find_page_number_patterns(text: str, verbose: bool = False) -> List[int]:
    """
    Find page numbers using regex patterns.

    Args:
        text: OCR text
        verbose: Print debug info

    Returns:
        List of candidate page numbers
    """
    candidates = []

    for pattern in PAGE_PATTERNS:
        matches = re.finditer(pattern, text, re.MULTILINE | re.IGNORECASE)
        for match in matches:
            try:
                page_num = int(match.group(1))
                # Reasonable page number (1-9999)
                if 1 <= page_num <= 9999:
                    candidates.append(page_num)
                    if verbose:
                        print(f"Pattern match: '{match.group(0)}' → {page_num}")
            except (ValueError, IndexError):
                continue

    return candidates


def find_positional_page_numbers(
    ocr_data: Dict,
    image_size: Tuple[int, int],
    verbose: bool = False
) -> List[int]:
    """
    Find page numbers based on position (footer/header regions).

    Args:
        ocr_data: Pytesseract OCR data dictionary
        image_size: (width, height) of image
        verbose: Print debug info

    Returns:
        List of candidate page numbers from footer/header regions
    """
    candidates = []
    width, height = image_size

    # Define footer/header regions (top 10% and bottom 10% of page)
    header_threshold = height * 0.10
    footer_threshold = height * 0.90

    # Look through OCR results
    for i, word in enumerate(ocr_data['text']):
        # Skip empty words
        if not word.strip():
            continue

        # Get position
        try:
            top = ocr_data['top'][i]
            conf = ocr_data['conf'][i]
        except (IndexError, KeyError):
            continue

        # Check if in footer or header
        in_footer = top >= footer_threshold
        in_header = top <= header_threshold

        if not (in_footer or in_header):
            continue

        # Check if word is a number
        if word.strip().isdigit():
            try:
                page_num = int(word.strip())
                # Reasonable page number
                if 1 <= page_num <= 9999 and conf > 50:  # Confidence threshold
                    candidates.append(page_num)
                    if verbose:
                        region = "footer" if in_footer else "header"
                        print(f"Positional match in {region}: '{word}' → {page_num} (conf: {conf})")
            except ValueError:
                continue

    return candidates


def extract_page_numbers_from_region(
    image: Image.Image,
    region: str = 'footer',
    height_fraction: float = 0.15
) -> List[int]:
    """
    Extract page numbers from specific region of page (footer/header).

    Args:
        image: PIL Image
        region: 'footer' or 'header'
        height_fraction: Fraction of page height to include in region (default: 0.15 = 15%)

    Returns:
        List of detected page numbers
    """
    width, height = image.size

    # Crop to region
    if region == 'footer':
        # Bottom 15% of page
        crop_box = (0, int(height * (1 - height_fraction)), width, height)
    elif region == 'header':
        # Top 15% of page
        crop_box = (0, 0, width, int(height * height_fraction))
    else:
        crop_box = (0, 0, width, height)

    cropped = image.crop(crop_box)

    # OCR on cropped region
    try:
        text = pytesseract.image_to_string(cropped)

        # Look for numbers
        numbers = re.findall(r'\b(\d+)\b', text)
        page_numbers = []

        for num_str in numbers:
            try:
                num = int(num_str)
                if 1 <= num <= 9999:
                    page_numbers.append(num)
            except ValueError:
                continue

        return page_numbers

    except Exception as e:
        print(f"Error extracting from {region}: {e}")
        return []


def validate_page_number(
    detected: int,
    pdf_page: int,
    max_offset: int = 50
) -> bool:
    """
    Validate that detected page number is reasonable given PDF page.

    Args:
        detected: Detected labeled page number
        pdf_page: PDF page number
        max_offset: Maximum allowed offset (default: 50 pages)

    Returns:
        True if valid, False otherwise
    """
    # Page number should be within reasonable offset of PDF page
    offset = abs(pdf_page - detected)
    return offset <= max_offset


# Test function
def test_ocr_detector():
    """
    Test OCR detector with sample image.
    """
    print("OCR Detector Module Loaded Successfully")
    print("Available functions:")
    print("  - detect_labeled_page_number(image)")
    print("  - find_page_number_patterns(text)")
    print("  - find_positional_page_numbers(ocr_data, image_size)")
    print("  - extract_page_numbers_from_region(image, region='footer')")
    print("  - validate_page_number(detected, pdf_page)")


if __name__ == "__main__":
    test_ocr_detector()
