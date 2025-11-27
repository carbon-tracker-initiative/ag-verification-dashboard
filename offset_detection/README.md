# Automated Page Offset Detection Pipeline

## Overview

This pipeline automatically detects page number offsets between PDF page numbers (physical position in PDF) and document-labeled page numbers (numbers printed on the pages).

**Problem**: Citations reference document page numbers (e.g., "Page 8"), but PDF chunks use PDF page numbers (e.g., "PAGE 12"), causing verification failures.

**Solution**: Automatically detect offsets by sampling pages from each PDF, using OCR to read labeled page numbers, and calculating the difference.

## Quick Start

### 1. Run Offset Detection

```bash
python hallucination_verification/offset_detection/detect_offsets.py
```

This will:
- Scan all company folders in `source_documents/{Company}/2024/`
- Process each PDF document
- Extract sample pages and detect labeled page numbers via OCR
- Calculate offsets and generate mappings
- Save evidence images for validation

### 2. Review Results

Check the output files:
- `output/page_offset_mappings.json` - Final offset mappings (use in verification)
- `output/detection_report.txt` - Human-readable summary
- `output/flagged_for_review.txt` - Items needing manual review
- `output/evidence_images/` - Sample page screenshots

### 3. Review Flagged Items

If any documents are flagged for manual review:
1. Check `flagged_for_review.txt`
2. Look at evidence images in `evidence_images/`
3. Manually verify or override offsets in `page_offset_mappings.json`

## Output Format

### page_offset_mappings.json

```json
{
  "FMC_2024": {
    "document_name": "FMC CORP files (ARS) Annual report...",
    "offset": 4,
    "confidence": "HIGH",
    "samples_processed": 3,
    "samples_agreed": 3,
    "method": "ocr_auto",
    "evidence": {
      "sample_1": {"pdf_page": 25, "detected_label": 21, "offset": 4},
      "sample_2": {"pdf_page": 50, "detected_label": 46, "offset": 4},
      "sample_3": {"pdf_page": 75, "detected_label": 71, "offset": 4}
    },
    "evidence_images": [
      "evidence_images/FMC_2024_sample1_pdf25_detected21.png",
      "evidence_images/FMC_2024_sample2_pdf50_detected46.png",
      "evidence_images/FMC_2024_sample3_pdf75_detected71.png"
    ]
  }
}
```

### Confidence Levels

- **HIGH**: All samples agree on offset (3/3 or 2/2)
- **MEDIUM**: Majority agree (2/3)
- **LOW**: Samples disagree or OCR failed
- **NONE**: No labeled page numbers detected (offset assumed = 0)

## How It Works

1. **Document Discovery**: Scans `source_documents/{Company}/2024/` for PDF files

2. **Page Sampling**: For each PDF, selects 2-3 sample pages:
   - Skips first 5 pages (cover, TOC)
   - Takes pages at 33%, 50%, 66% positions
   - Example: For 100-page PDF → pages 33, 50, 66

3. **OCR Detection**: For each sample:
   - Converts PDF page to image
   - Runs OCR to extract text
   - Searches for labeled page number patterns:
     - Isolated numbers in footer/header
     - "Page X" format
     - "- X -" format
     - Numbers in margins

4. **Offset Calculation**:
   - For each sample: `offset = pdf_page - detected_labeled_page`
   - Example: PDF page 25, detected label "21" → offset = 4
   - Uses consensus (most common offset)

5. **Confidence Scoring**:
   - All samples agree → HIGH confidence
   - Majority agree → MEDIUM confidence
   - No agreement → LOW confidence (flag for review)

6. **Evidence Generation**:
   - Saves sample page images as PNG
   - Names: `{Company}_2024_sample{N}_pdf{PDF}_detected{LABEL}.png`
   - You can visually verify OCR detection

## Integration with Verification System

Once offsets are detected, integrate into verification:

1. **Load mappings** in `snippet_matcher.py` and `llm_verifier.py`:
   ```python
   with open('hallucination_verification/offset_detection/output/page_offset_mappings.json') as f:
       offset_mappings = json.load(f)
   ```

2. **Apply offset** in `extract_context_around_page()`:
   ```python
   company_key = f"{company}_2024"
   if company_key in offset_mappings:
       offset = offset_mappings[company_key]['offset']
       pdf_page = cited_page + offset
   ```

3. **Re-verify** companies with high issue rates (FMC, Mosaic, etc.)

## Manual Override

To manually set or override an offset:

1. Edit `output/page_offset_mappings.json`
2. Update offset value
3. Change `confidence` to `"MANUAL"`
4. Add `"verified_by": "your_name"`

Example:
```json
{
  "Corteva_2024": {
    "offset": 13,
    "confidence": "MANUAL",
    "method": "manual_override",
    "verified_by": "user",
    "notes": "Verified by checking sample pages manually"
  }
}
```

## Troubleshooting

### OCR Not Detecting Page Numbers

**Problem**: OCR fails to find labeled page numbers

**Solutions**:
- Check evidence images - are page numbers visible and clear?
- Document may use PDF pages directly (offset = 0)
- Try manual verification of a few pages
- Override offset manually in JSON

### High Disagreement Between Samples

**Problem**: Different offsets detected for different pages

**Possible Causes**:
- Document has multiple sections with different numbering
- OCR misreading numbers
- Document uses Roman numerals for some sections

**Solutions**:
- Check evidence images
- Manually verify which offset is correct
- May need separate offsets for different sections (future enhancement)

### Missing Dependencies

**Problem**: `pdf2image` or `pytesseract` not found

**Solutions**:
```bash
pip install pdf2image pytesseract Pillow

# Windows: Install Tesseract OCR
# Download from: https://github.com/UB-Mannheim/tesseract/wiki

# Windows: Install Poppler
# Download from: https://github.com/oschwartz10612/poppler-windows
# Add to PATH

# Mac:
brew install tesseract poppler

# Linux:
sudo apt-get install tesseract-ocr poppler-utils
```

## Files

- `detect_offsets.py` - Main script
- `pdf_processor.py` - PDF to image conversion
- `ocr_detector.py` - Page number detection via OCR
- `offset_calculator.py` - Offset calculation and consensus
- `output/` - Results and evidence

## Support

For issues or questions, check:
1. Evidence images in `output/evidence_images/`
2. Detection report in `output/detection_report.txt`
3. Flagged items in `output/flagged_for_review.txt`
