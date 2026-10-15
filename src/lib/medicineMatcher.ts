import { MEDICINE_DATASET, MedicineEntry } from '../data/medicines';

export interface MatchResult {
  entry: MedicineEntry | null;
  matchedName: string | null;
  matchType: 'exact' | 'brand' | 'fuzzy' | 'none';
  fuzzyNote: string | null; // e.g. "Heard 'Metaformin' matched to Metformin"
  originalInput: string;
}

/**
 * Calculates Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalises a spoken or written medicine name:
 * Lowercases, strips common pharmaceutical prefixes/suffixes like "tab", "tablet", "syrup", "cap", "capsule", "inhaler", and standalone numbers/units.
 */
export function normaliseMedicineName(rawName: string): string {
  if (!rawName) return '';
  let str = rawName.toLowerCase();

  // Remove common dosage forms
  str = str.replace(/\b(tab|tablet|tablets|syrup|cap|capsule|capsules|inhaler|drops|injection|suspension|spray|cream|ointment|gel)\b/gi, ' ');

  // Remove trailing or leading strength numbers with units like 500mg, 10mg, 100mcg
  str = str.replace(/\b\d+(\.\d+)?\s*(mg|mcg|ml|g|gm|puffs)?\b/gi, ' ');

  // Remove punctuation and clean whitespace
  str = str.replace(/[^a-z0-9\s]/gi, ' ');
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

/**
 * Matches an input drug name against the reference 25 medicines and their brand names.
 */
export function matchMedicine(rawInput: string): MatchResult {
  const cleanInput = normaliseMedicineName(rawInput);
  if (!cleanInput) {
    return {
      entry: null,
      matchedName: null,
      matchType: 'none',
      fuzzyNote: null,
      originalInput: rawInput,
    };
  }

  // 1. Exact match on generic medicine name
  for (const entry of MEDICINE_DATASET) {
    const cleanEntryName = normaliseMedicineName(entry.name);
    if (cleanInput === cleanEntryName || cleanInput.includes(cleanEntryName) || cleanEntryName.includes(cleanInput)) {
      return {
        entry,
        matchedName: entry.name,
        matchType: 'exact',
        fuzzyNote: null,
        originalInput: rawInput,
      };
    }
  }

  // 2. Exact match on brand names
  for (const entry of MEDICINE_DATASET) {
    for (const brand of entry.brands) {
      const cleanBrand = normaliseMedicineName(brand);
      if (cleanInput === cleanBrand || cleanInput.includes(cleanBrand) || cleanBrand.includes(cleanInput)) {
        return {
          entry,
          matchedName: `${brand} (${entry.name})`,
          matchType: 'brand',
          fuzzyNote: `Brand '${brand}' matched to generic ${entry.name}`,
          originalInput: rawInput,
        };
      }
    }
  }

  // 3. Fuzzy match against generic names and brand names
  // Rule: distance <= 2 for words of 6+ letters, otherwise distance <= 1
  let bestEntry: MedicineEntry | null = null;
  let bestMatchedLabel = '';
  let minDistance = 999;

  for (const entry of MEDICINE_DATASET) {
    const cleanEntryName = normaliseMedicineName(entry.name);
    const maxAllowedDist = cleanEntryName.length >= 6 ? 2 : 1;
    const dist = levenshteinDistance(cleanInput, cleanEntryName);

    if (dist <= maxAllowedDist && dist < minDistance) {
      minDistance = dist;
      bestEntry = entry;
      bestMatchedLabel = entry.name;
    }

    // Also check brand names
    for (const brand of entry.brands) {
      const cleanBrand = normaliseMedicineName(brand);
      const brandMaxDist = cleanBrand.length >= 6 ? 2 : 1;
      const brandDist = levenshteinDistance(cleanInput, cleanBrand);

      if (brandDist <= brandMaxDist && brandDist < minDistance) {
        minDistance = brandDist;
        bestEntry = entry;
        bestMatchedLabel = `${brand} (${entry.name})`;
      }
    }
  }

  if (bestEntry) {
    return {
      entry: bestEntry,
      matchedName: bestEntry.name,
      matchType: 'fuzzy',
      fuzzyNote: `Heard '${rawInput.trim()}' matched to ${bestEntry.name}`,
      originalInput: rawInput,
    };
  }

  // 4. No match found in dataset
  return {
    entry: null,
    matchedName: null,
    matchType: 'none',
    fuzzyNote: 'Not in demo dataset, verify manually',
    originalInput: rawInput,
  };
}
