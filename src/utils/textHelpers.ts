import { WordCheckResult, WordCheckToken } from '../types';

export interface TextSegment {
  raw: string;
  isStress: boolean;
}

function normalizeTokenForMatch(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, '');
}

function normalizeForSpeechCompare(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

/**
 * Splits a sentence into whitespace and non-whitespace tokens without altering spacing,
 * marking words whose normalized form matches the stress list.
 */
export function tokenizeSentenceWithStress(text: string, stressWords: string[]): TextSegment[] {
  const normalizedStress = new Set(
    stressWords
      .map((w) => normalizeTokenForMatch(w))
      .filter(Boolean)
  );
  const normalizedStressNoApostrophe = new Set(
    stressWords
      .map((w) => normalizeForSpeechCompare(w))
      .filter(Boolean)
  );

  const parts = text.split(/(\s+)/);
  return parts.map((part) => {
    if (/^\s+$/.test(part) || part === '') {
      return { raw: part, isStress: false };
    }
    const clean = normalizeTokenForMatch(part);
    const cleanNoApos = normalizeForSpeechCompare(part);
    const isStress =
      (clean.length > 0 && normalizedStress.has(clean)) ||
      (cleanNoApos.length > 0 && normalizedStressNoApostrophe.has(cleanNoApos));
    return { raw: part, isStress };
  });
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Compares spoken Web Speech transcript against target sentence after
 * lowercasing and removing punctuation, preserving exact original spacing in display.
 */
export function evaluateWordCheck(targetText: string, transcript: string): WordCheckResult {
  const spokenNormalized = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  // Build frequency map of spoken words for fair multiset matching
  const spokenCounts = new Map<string, number>();
  for (const w of spokenNormalized) {
    spokenCounts.set(w, (spokenCounts.get(w) ?? 0) + 1);
  }

  const parts = targetText.split(/(\s+)/);
  let totalWords = 0;
  let matchedCount = 0;

  const tokens: WordCheckToken[] = parts.map((part) => {
    if (/^\s+$/.test(part) || part === '') {
      return { raw: part, isWord: false, matched: false };
    }
    const clean = normalizeForSpeechCompare(part);
    if (!clean) {
      return { raw: part, isWord: false, matched: false };
    }
    totalWords += 1;
    const available = spokenCounts.get(clean) ?? 0;
    if (available > 0) {
      spokenCounts.set(clean, available - 1);
      matchedCount += 1;
      return { raw: part, isWord: true, matched: true };
    }
    return { raw: part, isWord: true, matched: false };
  });

  return {
    tokens,
    matchedCount,
    totalWords,
    transcript,
  };
}
