/**
 * Text normalization and similarity utilities
 */

/**
 * Normalize text for comparison:
 * - lowercase
 * - trim
 * - remove punctuation
 * - remove diacritics using Unicode normalization
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose combined graphemes
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0.0 to 1.0)
 * Uses normalized Levenshtein distance
 */
export function stringSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (norm1 === norm2) return 1.0;
  if (norm1.length === 0 || norm2.length === 0) return 0.0;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return 1.0 - (distance / maxLength);
}

/**
 * Match outcomes based on similarity threshold
 */
export type MatchOutcome = 'Correct' | 'Close' | 'Incorrect';

export function evaluateMatch(input: string, target: string): {
  outcome: MatchOutcome;
  similarity: number;
} {
  const similarity = stringSimilarity(input, target);
  
  let outcome: MatchOutcome;
  if (similarity === 1.0) {
    outcome = 'Correct';
  } else if (similarity >= 0.85) {
    outcome = 'Close';
  } else {
    outcome = 'Incorrect';
  }

  return { outcome, similarity };
}


