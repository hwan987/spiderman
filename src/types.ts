export interface Sentence {
  id: number;
  speaker: string;
  text: string;
  korean: string;
  stress: string[];
  start: number;
  end: number;
}

export type SelfCheckRating = 'good' | 'ok' | 'hard' | null;
export type ProgressStatus = 'new' | 'practiced' | 'done';

export interface SentenceProgress {
  id: number;
  plays: number;
  recordings: number;
  selfCheck: [SelfCheckRating, SelfCheckRating, SelfCheckRating];
  status: ProgressStatus;
}

export type ShadowStep = 1 | 2 | 3 | 4;

export type ScreenId = 'start' | 'list' | 'practice' | 'edit' | 'finish';

export type PlaybackRate = 0.5 | 0.75 | 1.0;

export interface RecordedClip {
  url: string;
  mimeType: string;
}

export interface WordCheckToken {
  raw: string;
  isWord: boolean;
  matched: boolean;
}

export interface WordCheckResult {
  tokens: WordCheckToken[];
  matchedCount: number;
  totalWords: number;
  transcript: string;
}
