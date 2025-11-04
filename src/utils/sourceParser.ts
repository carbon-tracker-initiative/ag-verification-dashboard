/**
 * Parse source strings and build PDF URLs
 * Handles linking to source documents
 */

export interface ParsedSource {
  company: string;
  year: number;
  filename: string;
  page: number;
  isValid: boolean;
  error?: string;
}

/**
 * Parse source string from snippet
 * Format: "Company-Name-YYYY-Report.pdf, Page 49"
 * or: "Company-Name-YYYY-Report.pdf, pages 49-51"
 */
export function parseSource(source: string): ParsedSource {
  if (!source || source.trim() === '') {
    return {
      company: '',
      year: 0,
      filename: '',
      page: 0,
      isValid: false,
      error: 'Empty source string'
    };
  }

  try {
    // Split by comma to separate filename and page info
    const parts = source.split(',');

    if (parts.length < 2) {
      return {
        company: '',
        year: 0,
        filename: source.trim(),
        page: 0,
        isValid: false,
        error: 'Missing page information'
      };
    }

    const filename = parts[0].trim();
    const pageInfo = parts[1].trim();

    // Extract page number (handle "Page 49" or "pages 49-51" or "p. 49")
    const pageMatch = pageInfo.match(/(\d+)/);
    const page = pageMatch ? parseInt(pageMatch[1]) : 0;

    // Try to extract company and year from filename
    // Pattern: CompanyName-AG-YYYY-Report.pdf or CompanyName-YYYY-Financial-Report.pdf
    // or: YYYY CompanyName Report.pdf
    const yearMatch = filename.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 0;

    // Extract company name
    let company = '';
    if (yearMatch) {
      const beforeYear = filename.substring(0, yearMatch.index);
      const afterYear = filename.substring(yearMatch.index + 4);

      // If year is at the beginning (beforeYear is empty or just whitespace)
      if (!beforeYear.trim()) {
        // Extract company from after the year
        // Pattern: "2024 Nutrien Annual Report.pdf" -> extract "Nutrien"
        const afterYearTrimmed = afterYear.trim();
        const words = afterYearTrimmed.split(/\s+/);
        // Take first word(s) until we hit common keywords
        const stopWords = ['annual', 'sustainability', 'financial', 'report', 'esg'];
        const companyWords = [];
        for (const word of words) {
          if (stopWords.includes(word.toLowerCase()) || word.endsWith('.pdf')) {
            break;
          }
          companyWords.push(word);
        }
        company = companyWords.join(' ').trim();
      } else {
        // Year is in the middle or end - extract company from before year
        company = beforeYear.replace(/[-_]/g, ' ').trim();
      }

      // Remove common suffixes
      company = company.replace(/\s+(AG|Ltd|Inc|Corp|Company)$/i, '').trim();
    } else {
      // Fallback: use first part before dash or space
      const parts = filename.split(/[-_\s]/);
      company = parts[0].trim();
    }

    if (!page || !year) {
      return {
        company,
        year,
        filename,
        page,
        isValid: false,
        error: 'Could not extract page or year'
      };
    }

    return {
      company,
      year,
      filename,
      page,
      isValid: true
    };

  } catch (error) {
    return {
      company: '',
      year: 0,
      filename: '',
      page: 0,
      isValid: false,
      error: `Parse error: ${error}`
    };
  }
}

/**
 * Build PDF URL from parsed source
 * Returns URL like: /source_documents/Syngenta/2024/Syngenta-AG-2024-Report.pdf#page=49
 */
export function buildPdfUrl(parsedSource: ParsedSource): string {
  if (!parsedSource.isValid) {
    return '#';
  }

  const { company, year, filename, page } = parsedSource;

  const companySlug = company
    ? company
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
    : '';

  const segments = ['/source_documents'];
  if (companySlug) {
    segments.push(companySlug);
  }
  if (year > 0) {
    segments.push(String(year));
  }
  if (filename.trim()) {
    segments.push(filename.trim());
  }

  const rawPath = segments.join('/').replace(/\/+/g, '/');
  const encodedPath = rawPath
    .split('/')
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join('/');

  const url = page > 0 ? `${encodedPath}#page=${page}` : encodedPath;

  return url;
}

/**
 * Build PDF URL directly from source string (convenience function)
 */
export function sourceToPdfUrl(source: string): string {
  const parsed = parseSource(source);
  return buildPdfUrl(parsed);
}

/**
 * Extract just the display text for a source link
 * Returns: "Filename.pdf, Page 49"
 */
export function getSourceDisplayText(source: string): string {
  if (!source) return 'Unknown source';

  // Just return the source as-is for display
  return source;
}

/**
 * Check if a PDF file likely exists (basic heuristic)
 */
export function isPdfLikelyAvailable(parsedSource: ParsedSource): boolean {
  if (!parsedSource.isValid) return false;

  // Basic checks
  return parsedSource.filename.toLowerCase().endsWith('.pdf') &&
         parsedSource.year >= 2020 &&
         parsedSource.year <= 2025 &&
         parsedSource.page > 0 &&
         parsedSource.page < 1000;
}
