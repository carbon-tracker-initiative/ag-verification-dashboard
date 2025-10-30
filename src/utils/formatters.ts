/**
 * Formatting utilities for numbers, currencies, dates, and text
 */

import type { Grade } from '../types/metrics';

/**
 * Format currency with proper separators and symbol
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const absAmount = Math.abs(amount);

  // Determine appropriate unit
  let formatted: string;
  if (absAmount >= 1_000_000_000) {
    formatted = `${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (absAmount >= 1_000_000) {
    formatted = `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (absAmount >= 1_000) {
    formatted = `${(amount / 1_000).toFixed(2)}K`;
  } else {
    formatted = amount.toFixed(2);
  }

  // Add currency symbol
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CHF': 'CHF ',
    'JPY': '¥',
    'CNY': '¥'
  };

  const symbol = symbols[currency.toUpperCase()] || currency + ' ';

  return `${symbol}${formatted}`;
}

/**
 * Format percentage with specified decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format score as percentage
 */
export function formatScore(score: number): string {
  return formatPercentage(score, 1);
}

/**
 * Convert numeric score to letter grade
 */
export function formatGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Get grade color (Tailwind class)
 */
export function getGradeColor(grade: Grade): string {
  const colors: Record<Grade, string> = {
    'A': 'text-green-600',
    'B': 'text-blue-600',
    'C': 'text-yellow-600',
    'D': 'text-orange-600',
    'F': 'text-red-600'
  };
  return colors[grade];
}

/**
 * Format date string to readable format
 * Input: "2025-10-30T14:24:02.746207"
 * Output: "October 30, 2025"
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format date to short format
 * Output: "Oct 30, 2025"
 */
export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format date to time
 * Output: "2:24 PM"
 */
export function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'just now';
  } catch {
    return dateString;
  }
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (absNum >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (absNum >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  } else {
    return num.toString();
  }
}

/**
 * Format number with thousands separator
 */
export function formatNumberWithSeparator(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Pluralize word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format snippet count with label
 */
export function formatSnippetCount(count: number): string {
  return `${count} ${pluralize(count, 'snippet')}`;
}

/**
 * Format question count with label
 */
export function formatQuestionCount(count: number): string {
  return `${count} ${pluralize(count, 'question')}`;
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  if (!str) return '';

  return str
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Format classification label (remove underscore)
 */
export function formatClassification(classification: string): string {
  return classification.replace('_', ' ');
}

/**
 * Get color class for classification
 */
export function getClassificationColor(classification: string): string {
  const colors: Record<string, string> = {
    'FULL_DISCLOSURE': 'bg-green-100 text-green-800 border-green-300',
    'PARTIAL': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'UNCLEAR': 'bg-orange-100 text-orange-800 border-orange-300',
    'NO_DISCLOSURE': 'bg-red-100 text-red-800 border-red-300'
  };
  return colors[classification] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Get color class for score (based on grade)
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Format model name for display
 */
export function formatModelName(model: string): string {
  // Convert "gemini-2-5-flash" to "Gemini 2.5 Flash"
  return model
    .split('-')
    .map((part, index) => {
      // Handle version numbers
      if (/^\d+$/.test(part)) {
        return part + (index < model.split('-').length - 1 ? '.' : '');
      }
      return capitalize(part);
    })
    .join(' ')
    .replace(/\s+\./g, '.');
}
