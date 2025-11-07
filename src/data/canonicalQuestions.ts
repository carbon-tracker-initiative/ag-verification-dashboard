import type { SectorApplicability, SectorCode } from '../types/questions';

export interface CanonicalQuestion {
  id: string;
  question_text: string;
  category: string;
  applicability: SectorApplicability;
}

/**
 * Canonical AG verification question set (IDs 99901 - 99918).
 * Applicability indicates whether a question only applies to fertilizer (F),
 * crop-protection/pesticide (P) companies, or everyone (ALL).
 */
export const CANONICAL_QUESTIONS: CanonicalQuestion[] = [
  {
    id: '99901',
    category: 'Market/Business Risk',
    question_text:
      "Does the company disclose whether it thinks that agricultural crops developing resistance to its pesticides, which are applied by the company's customers to cropland, is a risk to the business?",
    applicability: 'P'
  },
  {
    id: '99902',
    category: 'Environmental Risk',
    question_text:
      'Does the company disclose whether it thinks that soil degradation caused by its fertiliser products is a risk to the business? Fertilisers impact soil degradation by worsening the soil structure, thereby reducing water infiltration and retention, which increases erosion.',
    applicability: 'F'
  },
  {
    id: '99903',
    category: 'Human Health Risk',
    question_text:
      'Does the company disclose whether it thinks that human health problems from its products is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99904',
    category: 'Regulatory/Financial Risk',
    question_text:
      'Does the company disclose whether it thinks that carbon costs arising from its direct operations or the use of its products by its customers is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99905',
    category: 'Environmental Risk',
    question_text:
      'Does the company disclose whether it thinks that reduced soil fertility caused by its pesticides is a risk to the business? For instance, the increase in toxicity of the soil impacting human health, or the potentially declining yield experienced by farmers applying the pesticide.',
    applicability: 'P'
  },
  {
    id: '99906',
    category: 'Human Health Risk',
    question_text:
      'Does the company disclose whether it thinks that factory workplace hazards including chemical exposure during production of pesticides is a risk to the business?',
    applicability: 'P'
  },
  {
    id: '99907',
    category: 'Environmental Risk',
    question_text:
      'Does the company disclose whether it thinks that waterway pollution and contamination from leaching of applied products is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99908',
    category: 'Market/Business Risk',
    question_text:
      'Does the company disclose whether it thinks that demand destruction as organic farming and alternatives gain market share is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99909',
    category: 'Environmental Risk',
    question_text:
      "Does the company disclose whether it thinks that eutrophication from nutrient runoff when the company's products are applied by farmers is a risk to the business? Do not consider factory sources of pollution.",
    applicability: 'ALL'
  },
  {
    id: '99910',
    category: 'Environmental Risk',
    question_text:
      'Does the company disclose whether it thinks that disposal of chemical waste, such as gypstacks, from the production of phosphate fertiliser is a risk to the business?',
    applicability: 'F'
  },
  {
    id: '99911',
    category: 'Environmental Risk',
    question_text:
      'Does the company disclose whether it thinks that restoration of mining sites is a risk to the business?',
    applicability: 'F'
  },
  {
    id: '99912',
    category: 'Regulatory/Financial Risk',
    question_text:
      'Does the company disclose whether it thinks that their products being banned from being produced or sold is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99913',
    category: 'Environmental Risk',
    question_text:
      'Does the company disclose whether it thinks that restoration of contaminated manufacturing sites is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99914',
    category: 'Environmental Risk',
    question_text:
      'Does the company disclose whether it thinks that loss of pollinators and beneficial insects, such as bees, is a risk to the business?',
    applicability: 'P'
  },
  {
    id: '99915',
    category: 'Regulatory/Financial Risk',
    question_text:
      'Does the company disclose whether it thinks that rising compliance, testing, registration, or re-registration costs related to their products is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99916',
    category: 'Market/Business Risk',
    question_text:
      'Does the company disclose whether it thinks that negative public perception of chemical-intensive agriculture, such as negative media articles, regulatory scrutiny or decreasing sales, is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99917',
    category: 'Regulatory/Financial Risk',
    question_text:
      'Does the company disclose whether it thinks that class action lawsuits and legal challenges from health/environmental claims as a result of direct or indirect exposure to their products is a risk to the business?',
    applicability: 'ALL'
  },
  {
    id: '99918',
    category: 'Market/Business Risk',
    question_text:
      'Does the company disclose whether it thinks that high energy input costs due to the manufacture of its products is a risk to the business?',
    applicability: 'F'
  }
];

/**
 * Determine if a canonical question should be evaluated for a given sector.
 */
export function isQuestionApplicableToSector(
  question: CanonicalQuestion,
  sector: SectorCode
): boolean {
  if (question.applicability === 'ALL') {
    return true;
  }

  if (question.applicability === 'F') {
    return sector === 'F' || sector === 'PF';
  }

  if (question.applicability === 'P') {
    return sector === 'P' || sector === 'PF';
  }

  return true;
}

/**
 * Human-friendly label that explains who a question applies to.
 */
export function getApplicabilityLabel(applicability: SectorApplicability): string {
  switch (applicability) {
    case 'F':
      return 'Fertilizer manufacturers only';
    case 'P':
      return 'Crop protection companies only';
    default:
      return 'Applies to all agricultural input companies';
  }
}
