"""
Offset Calculation Module

Calculates page number offsets from sample data and determines confidence.
"""

from typing import List, Dict, Optional, Tuple
from collections import Counter
import statistics


class OffsetSample:
    """Represents a single offset sample from a PDF page."""

    def __init__(self, pdf_page: int, detected_label: Optional[int]):
        self.pdf_page = pdf_page
        self.detected_label = detected_label
        self.offset = pdf_page - detected_label if detected_label is not None else None

    def __repr__(self):
        if self.offset is not None:
            return f"Sample(PDF:{self.pdf_page}, Label:{self.detected_label}, Offset:{self.offset})"
        else:
            return f"Sample(PDF:{self.pdf_page}, Label:None, Offset:None)"


def calculate_offset_from_samples(samples: List[OffsetSample]) -> Dict:
    """
    Calculate consensus offset from multiple samples.

    Args:
        samples: List of OffsetSample objects

    Returns:
        Dictionary with:
        - offset: Consensus offset value (int or None)
        - confidence: HIGH, MEDIUM, LOW, or NONE
        - samples_processed: Number of samples
        - samples_agreed: Number agreeing with consensus
        - all_offsets: List of all detected offsets
        - evidence: List of sample details
    """
    # Filter out samples where detection failed
    valid_samples = [s for s in samples if s.offset is not None]

    if not valid_samples:
        return {
            'offset': None,
            'confidence': 'NONE',
            'samples_processed': len(samples),
            'samples_agreed': 0,
            'all_offsets': [],
            'evidence': [
                {'pdf_page': s.pdf_page, 'detected_label': s.detected_label, 'offset': s.offset}
                for s in samples
            ],
            'message': 'No labeled page numbers detected. Document may use PDF page numbers directly (offset = 0).'
        }

    # Get all offsets
    offsets = [s.offset for s in valid_samples]

    # Find most common offset (consensus)
    offset_counts = Counter(offsets)
    consensus_offset, consensus_count = offset_counts.most_common(1)[0]

    # Determine confidence
    total_valid = len(valid_samples)
    agreement_ratio = consensus_count / total_valid

    if agreement_ratio == 1.0:
        # All samples agree
        confidence = 'HIGH'
    elif agreement_ratio >= 0.66:
        # 2/3 or more agree
        confidence = 'MEDIUM'
    else:
        # Less than 2/3 agree
        confidence = 'LOW'

    # Build result
    result = {
        'offset': consensus_offset,
        'confidence': confidence,
        'samples_processed': len(samples),
        'samples_agreed': consensus_count,
        'samples_valid': total_valid,
        'agreement_ratio': agreement_ratio,
        'all_offsets': offsets,
        'offset_distribution': dict(offset_counts),
        'evidence': [
            {
                'pdf_page': s.pdf_page,
                'detected_label': s.detected_label,
                'offset': s.offset,
                'agrees_with_consensus': s.offset == consensus_offset
            }
            for s in samples
        ]
    }

    # Add warnings if needed
    if confidence == 'LOW':
        result['warning'] = f'Low confidence: Only {consensus_count}/{total_valid} samples agree. Manual review recommended.'
    elif confidence == 'MEDIUM':
        result['warning'] = f'Medium confidence: {consensus_count}/{total_valid} samples agree. Consider manual verification.'

    return result


def validate_offset(offset: Optional[int], max_offset: int = 50) -> Tuple[bool, str]:
    """
    Validate that offset is reasonable.

    Args:
        offset: Calculated offset
        max_offset: Maximum reasonable offset (default: 50)

    Returns:
        (is_valid, message)
    """
    if offset is None:
        return False, "No offset detected"

    if abs(offset) > max_offset:
        return False, f"Offset {offset} exceeds maximum {max_offset}. May be incorrect."

    if offset < 0:
        return True, f"Negative offset ({offset}): PDF pages numbered lower than document pages"

    if offset == 0:
        return True, "Zero offset: PDF and document pages match"

    return True, f"Positive offset ({offset}): PDF pages numbered higher than document pages"


def create_offset_mapping(
    company: str,
    document_name: str,
    offset_result: Dict,
    evidence_images: List[str],
    method: str = 'ocr_auto'
) -> Dict:
    """
    Create offset mapping entry for JSON output.

    Args:
        company: Company name
        document_name: Document filename
        offset_result: Result from calculate_offset_from_samples()
        evidence_images: List of evidence image paths
        method: Detection method (default: 'ocr_auto')

    Returns:
        Dictionary ready for JSON output
    """
    mapping = {
        'document_name': document_name,
        'offset': offset_result.get('offset', 0),
        'confidence': offset_result['confidence'],
        'samples_processed': offset_result['samples_processed'],
        'samples_agreed': offset_result['samples_agreed'],
        'method': method,
        'evidence': offset_result['evidence'],
        'evidence_images': evidence_images
    }

    # Add optional fields
    if 'warning' in offset_result:
        mapping['warning'] = offset_result['warning']

    if 'message' in offset_result:
        mapping['message'] = offset_result['message']

    if 'offset_distribution' in offset_result:
        mapping['offset_distribution'] = offset_result['offset_distribution']

    # Validate offset
    if offset_result.get('offset') is not None:
        is_valid, validation_msg = validate_offset(offset_result['offset'])
        mapping['validation'] = {
            'is_valid': is_valid,
            'message': validation_msg
        }

    return mapping


def detect_outliers(samples: List[OffsetSample]) -> List[OffsetSample]:
    """
    Detect outlier samples that disagree with consensus.

    Args:
        samples: List of OffsetSample objects

    Returns:
        List of outlier samples
    """
    valid_samples = [s for s in samples if s.offset is not None]

    if len(valid_samples) < 2:
        return []

    offsets = [s.offset for s in valid_samples]

    # Find most common offset
    consensus_offset = Counter(offsets).most_common(1)[0][0]

    # Return samples that don't match consensus
    outliers = [s for s in valid_samples if s.offset != consensus_offset]

    return outliers


def merge_offset_mappings(mappings: List[Dict]) -> Dict:
    """
    Merge multiple offset mappings into single output.

    Args:
        mappings: List of offset mapping dictionaries

    Returns:
        Merged dictionary with all companies
    """
    merged = {}

    for mapping in mappings:
        company_key = mapping.get('company_key')
        if company_key:
            merged[company_key] = mapping

    return merged


def generate_summary_statistics(all_mappings: Dict) -> Dict:
    """
    Generate summary statistics across all detected offsets.

    Args:
        all_mappings: Dictionary of all offset mappings

    Returns:
        Summary statistics dictionary
    """
    total = len(all_mappings)
    high_conf = sum(1 for m in all_mappings.values() if m.get('confidence') == 'HIGH')
    medium_conf = sum(1 for m in all_mappings.values() if m.get('confidence') == 'MEDIUM')
    low_conf = sum(1 for m in all_mappings.values() if m.get('confidence') == 'LOW')
    no_offset = sum(1 for m in all_mappings.values() if m.get('offset') == 0 or m.get('offset') is None)

    offsets = [m.get('offset', 0) for m in all_mappings.values() if m.get('offset') is not None]

    stats = {
        'total_documents': total,
        'confidence_distribution': {
            'HIGH': high_conf,
            'MEDIUM': medium_conf,
            'LOW': low_conf,
            'NONE': total - high_conf - medium_conf - low_conf
        },
        'documents_with_offset': total - no_offset,
        'documents_no_offset': no_offset,
    }

    if offsets:
        stats['offset_statistics'] = {
            'min': min(offsets),
            'max': max(offsets),
            'mean': statistics.mean(offsets),
            'median': statistics.median(offsets),
            'mode': Counter(offsets).most_common(1)[0][0] if offsets else None
        }

    return stats


# Test function
def test_offset_calculator():
    """
    Test offset calculator with sample data.
    """
    print("Offset Calculator Module Loaded Successfully")
    print("\nTesting with sample data...")

    # Sample test
    samples = [
        OffsetSample(pdf_page=25, detected_label=21),
        OffsetSample(pdf_page=50, detected_label=46),
        OffsetSample(pdf_page=75, detected_label=71),
    ]

    result = calculate_offset_from_samples(samples)
    print(f"\nSample Result:")
    print(f"  Offset: {result['offset']}")
    print(f"  Confidence: {result['confidence']}")
    print(f"  Agreement: {result['samples_agreed']}/{result['samples_processed']}")


if __name__ == "__main__":
    test_offset_calculator()
