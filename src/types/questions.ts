/**
 * Shared question and sector typing.
 * Keeps sector codes consistent across data loaders, metrics, and Excel export.
 */

/**
 * Sector codes present in source metadata.
 * - F  : Fertilizer manufacturers
 * - P  : Crop protection / pesticides
 * - PF : Companies operating in both fertilizer + protection
 * - ALL: Unknown / applies to every sector
 */
export type SectorCode = 'F' | 'P' | 'PF' | 'ALL';

/**
 * Applicability flags stored on canonical question metadata.
 * - ALL: Question applies to every sector
 * - F  : Fertilizer-only question
 * - P  : Crop-protection-only question
 */
export type SectorApplicability = 'ALL' | 'F' | 'P';

/**
 * Normalize arbitrary sector values from metadata into our union.
 */
export function normalizeSectorCode(value?: string): SectorCode {
  if (!value) return 'ALL';
  const upper = value.toUpperCase();
  if (upper === 'F' || upper === 'P' || upper === 'PF') {
    return upper as SectorCode;
  }
  return 'ALL';
}
