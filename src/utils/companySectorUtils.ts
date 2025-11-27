/**
 * Company sector mapping utility
 * Maps each company to their primary sector to avoid duplicate sector displays
 */

import companySectorMapping from '../data/companySectorMapping.json';
import type { SectorCode } from '../types/questions';

/**
 * Get the primary sector for a company
 * @param companyName The company name
 * @returns The primary sector code ('P' for pesticide, 'F' for fertiliser)
 */
export function getCompanySector(companyName: string): SectorCode {
  const normalizedName = companyName.trim();
  const sector = companySectorMapping[normalizedName as keyof typeof companySectorMapping];
  
  if (sector === 'pesticide') {
    return 'P';
  } else if (sector === 'fertiliser') {
    return 'F';
  }
  
  // Fallback to legacy mapping logic if not found in our mapping
  return 'ALL';
}

/**
 * Get the display name for a sector
 * @param sectorCode The sector code
 * @returns The human-readable sector name
 */
export function getSectorDisplayName(sectorCode: SectorCode): string {
  switch (sectorCode) {
    case 'P':
      return 'Pesticide';
    case 'F':
      return 'Fertiliser';
    case 'PF':
      return 'Both Sectors';
    case 'ALL':
      return 'All Sectors';
    default:
      return 'Unknown Sector';
  }
}