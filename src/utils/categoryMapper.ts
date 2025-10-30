import categoryMapping from '../config/category_mapping.json';
import type { Question } from './dataLoader';

export interface CategoryGroup {
  name: string;
  color: string;
  icon: string;
  description: string;
}

export interface ClassificationInfo {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

/**
 * Get category group for a question based on its category field
 */
export function getCategoryGroup(question: Question): CategoryGroup {
  // Safety check for undefined/null questions
  if (!question) {
    return {
      name: 'Other',
      color: '#6b7280',
      icon: '❓',
      description: 'Other risk categories',
    };
  }

  const category = question.category || 'Unknown';

  // Find which group this category belongs to
  for (const [groupName, groupData] of Object.entries(categoryMapping.category_groups)) {
    if (groupData.includes.includes(category)) {
      return {
        name: groupName,
        color: groupData.display_color,
        icon: groupData.icon,
        description: groupData.description,
      };
    }
  }

  // Default fallback
  return {
    name: 'Other',
    color: '#6b7280',
    icon: '❓',
    description: 'Other risk categories',
  };
}

/**
 * Get classification info (score, label, colors) for a classification value
 */
export function getClassificationInfo(classification: string): ClassificationInfo {
  const mapping = categoryMapping.classification_colors[
    classification as keyof typeof categoryMapping.classification_colors
  ];

  if (!mapping) {
    return {
      score: 0,
      label: 'Unknown',
      color: '#6b7280',
      bgColor: '#f3f4f6',
    };
  }

  return {
    score: mapping.score,
    label: mapping.label,
    color: mapping.color,
    bgColor: mapping.bg_color,  // Note: JSON uses snake_case 'bg_color'
  };
}

/**
 * Group questions by category
 */
export function groupQuestionsByCategory(questions: Question[]): Map<string, Question[]> {
  const grouped = new Map<string, Question[]>();

  // Safety check for undefined/null questions array
  if (!questions || !Array.isArray(questions)) {
    return grouped;
  }

  // Filter out any undefined/null questions before grouping
  const validQuestions = questions.filter(q => q && q.answer);

  for (const question of validQuestions) {
    const group = getCategoryGroup(question);
    const existing = grouped.get(group.name) || [];
    existing.push(question);
    grouped.set(group.name, existing);
  }

  return grouped;
}

/**
 * Calculate category statistics
 */
export function calculateCategoryStats(questions: Question[]): {
  total: number;
  byClassification: Record<string, number>;
} {
  const byClassification: Record<string, number> = {
    YES: 0,
    PARTIAL: 0,
    UNCLEAR: 0,
    NONE: 0,
  };

  // Safety check for undefined/null questions array
  if (!questions || !Array.isArray(questions)) {
    return {
      total: 0,
      byClassification,
    };
  }

  // Filter out any invalid questions
  const validQuestions = questions.filter(q => q && q.answer && q.answer.classification);

  for (const question of validQuestions) {
    const classification = question.answer.classification;
    byClassification[classification] = (byClassification[classification] || 0) + 1;
  }

  return {
    total: validQuestions.length,
    byClassification,
  };
}

/**
 * Map D-RAG classification to our system's classification
 */
export function mapDragClassification(dragClassification: string): string {
  const mapping = categoryMapping.drag_mapping;
  return mapping[dragClassification as keyof typeof mapping] || dragClassification;
}
