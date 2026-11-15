import { Sentence } from '../types';

export const APP_NAME = 'Scene Shadow: Who Are You Without the Suit?';
export const APP_TAGLINE = 'Listen. Copy. Speak at the same time.';

export const MOVIE_SETTINGS = {
  titleEnglish: 'Spider-Man: Homecoming',
  titleKorean: '스파이더맨: 홈커밍',
  releaseYear: '2017',
  director: 'Jon Watts',
  screenplay:
    'Jonathan Goldstein & John Francis Daley; Jon Watts & Christopher Ford; Chris McKenna & Erik Sommers',
  productionCompany: 'Columbia Pictures / Marvel Studios / Pascal Pictures',
  distributionCompany: 'Sony Pictures Releasing',
  sceneDescription:
    'Tony Stark confronts Peter after the ferry incident and takes back the Spider-Man suit.',
  youtubeVideoTitle:
    "Iron Man Takes Spider-Man's Suit Scene - Spider-Man: Homecoming (2017) Movie CLIP HD",
  youtubeChannelName: 'TopMovieClips',
  youtubeUrl: 'https://www.youtube.com/watch?v=9esCA8_EPeY',
  videoId: '9esCA8_EPeY',
  practiceStart: 55,
  practiceEnd: 95,
  madeBy: '최정환',
} as const;

export const EDUCATIONAL_NOTICE = {
  title: 'Educational use only / 교육 목적 전용',
  english:
    'This app was made only for non-commercial English learning in the university course AI and English Language Education (ENG3088, Sungkyunkwan University). The film clip is used only to practice listening and speaking (shadowing). It is not sold, shared for profit, downloaded, or edited. All rights to the film belong to its copyright holders.',
  korean:
    '이 앱은 성균관대학교 「인공지능과 영어교육」(ENG3088) 수업의 비영리 영어 학습 목적으로만 제작되었습니다. 영화 장면은 듣기·말하기(쉐도잉) 연습에만 사용하며, 판매·영리적 배포·다운로드·편집을 하지 않습니다. 영화의 모든 권리는 저작권자에게 있습니다.',
} as const;

export const ONE_LINE_CREDIT = `Clip: ${MOVIE_SETTINGS.titleEnglish} (${MOVIE_SETTINGS.releaseYear}), ${MOVIE_SETTINGS.distributionCompany} / ${MOVIE_SETTINGS.productionCompany} · via YouTube · For educational use only`;

export const DEFAULT_SENTENCES: Sentence[] = [
  {
    id: 1,
    speaker: 'Tony',
    text: 'The adult is talking. What if somebody had died tonight?',
    korean: '어른이 말하고 있잖아. 오늘 밤 누군가 죽었으면 어쩔 뻔했어?',
    stress: ['adult', 'died'],
    start: 56.4,
    end: 59.5,
  },
  {
    id: 2,
    speaker: 'Tony',
    text: "Different story, right? 'Cause that's on you.",
    korean: '그럼 얘기가 달라지지. 그건 네 책임이니까.',
    stress: ['different', 'you'],
    start: 59.2,
    end: 62.4,
  },
  {
    id: 3,
    speaker: 'Tony',
    text: "And if you died, I feel like that's on me.",
    korean: '그리고 네가 죽었다면, 그건 내 책임인 것처럼 느껴져.',
    stress: ['died', 'me'],
    start: 62.4,
    end: 66.3,
  },
  {
    id: 4,
    speaker: 'Peter',
    text: 'I just wanted to be like you.',
    korean: '전 그냥 당신처럼 되고 싶었어요.',
    stress: ['wanted', 'you'],
    start: 71.8,
    end: 74.3,
  },
  {
    id: 5,
    speaker: 'Tony',
    text: 'And I wanted you to be better.',
    korean: '난 네가 더 나은 사람이 되길 바랐어.',
    stress: ['wanted', 'better'],
    start: 73.9,
    end: 76.3,
  },
  {
    id: 6,
    speaker: 'Tony',
    text: "Okay, it's not working out. I'm gonna need the suit back.",
    korean: '좋아, 이건 잘 안 되고 있어. 그 슈트는 돌려받아야겠다.',
    stress: ['working', 'suit'],
    start: 77.2,
    end: 80.0,
  },
  {
    id: 7,
    speaker: 'Peter',
    text: "I'm nothing without this suit.",
    korean: '이 슈트가 없으면 전 아무것도 아니에요.',
    stress: ['nothing', 'suit'],
    start: 87.0,
    end: 88.7,
  },
  {
    id: 8,
    speaker: 'Tony',
    text: "If you're nothing without this suit, then you shouldn't have it.",
    korean: '이 슈트가 없으면 아무것도 아니라면, 넌 이 슈트를 가져선 안 돼.',
    stress: ['nothing', "shouldn't"],
    start: 88.5,
    end: 92.0,
  },
];

export const SHADOW_STEPS = [
  {
    step: 1 as const,
    label: 'Listen',
    koreanLabel: '듣기',
    instructionEn: 'Text hidden. Just listen 2–3 times to feel the speed and mood.',
    instructionKo: '문장을 보지 않고 2~3번 들으며 속도와 감정을 느껴보세요.',
    defaultHideText: true,
  },
  {
    step: 2 as const,
    label: 'Mumble',
    koreanLabel: '중얼거리기',
    instructionEn: 'Text hidden. Quietly follow the sounds and rhythm.',
    instructionKo: '문장을 보지 않고 소리와 리듬을 작게 따라 해보세요.',
    defaultHideText: true,
  },
  {
    step: 3 as const,
    label: 'Read & Shadow',
    koreanLabel: '보고 따라하기',
    instructionEn: 'Text shown. Speak at the exact same time, stressing the bold words.',
    instructionKo: '문장을 보면서 굵은 단어에 강세를 주어 동시에 말해보세요.',
    defaultHideText: false,
  },
  {
    step: 4 as const,
    label: 'Shadow',
    koreanLabel: '실전 쉐도잉',
    instructionEn: 'Text hidden. Speak together with the actor and record your voice.',
    instructionKo: '문장을 가리고 배우와 동시에 말하며 녹음해 보세요.',
    defaultHideText: true,
  },
] as const;

export const SELF_CHECK_QUESTIONS = [
  {
    index: 0 as const,
    en: 'Did I keep up with the speed?',
    ko: '속도를 잘 따라갔나요?',
  },
  {
    index: 1 as const,
    en: 'Did I stress the bold words?',
    ko: '굵은 단어에 강세를 주었나요?',
  },
  {
    index: 2 as const,
    en: 'Did my voice go up and down like the actor?',
    ko: '배우처럼 억양이 오르내렸나요?',
  },
] as const;

export function formatTimeMSS(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimePrecise(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const rem = (seconds % 60).toFixed(1).padStart(4, '0');
  return `${mins}:${rem}`;
}
