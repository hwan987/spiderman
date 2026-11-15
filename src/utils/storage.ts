import { DEFAULT_SENTENCES, MOVIE_SETTINGS } from '../constants/movieConfig';
import { Sentence, SentenceProgress } from '../types';

const SENTENCES_STORAGE_KEY = 'scene_shadow_sentences_v2';
const PROGRESS_STORAGE_KEY = 'scene_shadow_progress_v1';

export function createInitialProgress(id: number): SentenceProgress {
  return {
    id,
    plays: 0,
    recordings: 0,
    selfCheck: [null, null, null],
    status: 'new',
  };
}

export function loadSentences(): Sentence[] {
  try {
    const raw = window.localStorage.getItem(SENTENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_SENTENCES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SENTENCES;
    return parsed.filter(isValidSentenceShape);
  } catch {
    return DEFAULT_SENTENCES;
  }
}

export function saveSentences(sentences: Sentence[]): void {
  try {
    window.localStorage.setItem(SENTENCES_STORAGE_KEY, JSON.stringify(sentences));
  } catch {
    // Fallback to in-memory state if localStorage is unavailable
  }
}

export function loadProgress(): Record<number, SentenceProgress> {
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<number, SentenceProgress>;
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<number, SentenceProgress>): void {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Fallback to in-memory state if localStorage is unavailable
  }
}

export function isValidSentenceShape(item: unknown): item is Sentence {
  if (!item || typeof item !== 'object') return false;
  const s = item as Partial<Sentence>;
  return (
    typeof s.id === 'number' &&
    typeof s.speaker === 'string' &&
    typeof s.text === 'string' &&
    typeof s.korean === 'string' &&
    Array.isArray(s.stress) &&
    typeof s.start === 'number' &&
    typeof s.end === 'number' &&
    s.start >= MOVIE_SETTINGS.practiceStart &&
    s.end <= MOVIE_SETTINGS.practiceEnd &&
    s.end > s.start
  );
}

export function parseImportedSentencesJson(raw: string): {
  sentences: Sentence[] | null;
  error: string | null;
} {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { sentences: null, error: 'JSON must be an array of sentences.' };
    }
    const normalized: Sentence[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== 'object') {
        return { sentences: null, error: `Item #${i + 1} is not a valid object.` };
      }
      const start = Number(item.start);
      const end = Number(item.end);
      const text = String(item.text ?? '').trim();
      const speaker = String(item.speaker ?? 'Speaker').trim() || 'Speaker';
      const korean = String(item.korean ?? '').trim();
      const stress = Array.isArray(item.stress)
        ? item.stress.map((w: unknown) => String(w).trim()).filter(Boolean)
        : [];
      const id = typeof item.id === 'number' && Number.isFinite(item.id) ? item.id : i + 1;

      if (!text) {
        return { sentences: null, error: `Item #${i + 1} is missing English text.` };
      }
      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < MOVIE_SETTINGS.practiceStart ||
        end > MOVIE_SETTINGS.practiceEnd ||
        end <= start
      ) {
        return {
          sentences: null,
          error: `Item #${i + 1} times must be within ${MOVIE_SETTINGS.practiceStart}s–${MOVIE_SETTINGS.practiceEnd}s with end > start.`,
        };
      }
      normalized.push({
        id,
        speaker,
        text,
        korean,
        stress,
        start: Math.round(start * 10) / 10,
        end: Math.round(end * 10) / 10,
      });
    }
    return { sentences: normalized, error: null };
  } catch {
    return { sentences: null, error: 'Invalid JSON format. Please check your syntax.' };
  }
}
