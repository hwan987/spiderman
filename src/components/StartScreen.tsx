import { ArrowRight, Edit3, ExternalLink } from 'lucide-react';
import {
  APP_NAME,
  APP_TAGLINE,
  EDUCATIONAL_NOTICE,
  formatTimeMSS,
  MOVIE_SETTINGS,
} from '../constants/movieConfig';

interface StartScreenProps {
  sentenceCount: number;
  doneCount: number;
  onStartPractice: () => void;
  onOpenEdit: () => void;
}

const SHADOWING_TIPS = [
  {
    num: '1',
    en: 'Listen & copy together',
    ko: '배우의 소리를 들으며 바로 따라 말해요.',
  },
  {
    num: '2',
    en: 'Match bold stress & tone',
    ko: '굵은 단어의 강세와 감정 억양을 살려요.',
  },
  {
    num: '3',
    en: 'Short lines, 10–15 min',
    ko: '짧은 영화 대사로 부담 없이 연습해요.',
  },
];

function isKnown(value: string): boolean {
  return Boolean(value && value.trim().toLowerCase() !== 'unknown');
}

export function StartScreen({
  sentenceCount,
  doneCount,
  onStartPractice,
  onOpenEdit,
}: StartScreenProps) {
  const sourceItems: Array<{ label: string; value: string; href?: string }> = [
    {
      label: 'Movie / 영화',
      value: [
        isKnown(MOVIE_SETTINGS.titleEnglish) ? MOVIE_SETTINGS.titleEnglish : '',
        isKnown(MOVIE_SETTINGS.titleKorean) ? `(${MOVIE_SETTINGS.titleKorean})` : '',
        isKnown(MOVIE_SETTINGS.releaseYear) ? `· ${MOVIE_SETTINGS.releaseYear}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    },
    { label: 'Director / 감독', value: MOVIE_SETTINGS.director },
    { label: 'Screenplay / 각본', value: MOVIE_SETTINGS.screenplay },
    { label: 'Production / 제작', value: MOVIE_SETTINGS.productionCompany },
    { label: 'Distribution / 배급', value: MOVIE_SETTINGS.distributionCompany },
    { label: 'Scene / 장면', value: MOVIE_SETTINGS.sceneDescription },
    { label: 'YouTube Title', value: MOVIE_SETTINGS.youtubeVideoTitle },
    { label: 'Channel / 채널', value: MOVIE_SETTINGS.youtubeChannelName },
    {
      label: 'YouTube URL',
      value: MOVIE_SETTINGS.youtubeUrl,
      href: MOVIE_SETTINGS.youtubeUrl,
    },
    {
      label: 'Practice Range / 구간',
      value: `${formatTimeMSS(MOVIE_SETTINGS.practiceStart)} – ${formatTimeMSS(
        MOVIE_SETTINGS.practiceEnd
      )}`,
    },
    { label: 'Made by / 제작', value: MOVIE_SETTINGS.madeBy },
  ].filter((item) => isKnown(item.value));

  return (
    <div className="flex flex-col gap-6 px-5 pt-7 pb-8">
      {/* Hero Header */}
      <header className="space-y-2.5">
        <p className="text-[13px] font-semibold tracking-wide text-[#1E3A5F]">
          {MOVIE_SETTINGS.titleEnglish} · {MOVIE_SETTINGS.titleKorean}
        </p>
        <h1 className="text-[28px] sm:text-[30px] font-extrabold leading-[1.2] tracking-tight text-[#162447] text-balance">
          {APP_NAME}
        </h1>
        <p className="text-[18px] font-medium text-slate-700 leading-snug">
          {APP_TAGLINE}
        </p>
      </header>

      {/* Primary Action */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onStartPractice}
          className="w-full min-h-[56px] px-6 py-3 rounded-2xl bg-[#C81E32] hover:bg-[#A91729] active:scale-[0.99] text-white shadow-sm transition-all flex items-center justify-between cursor-pointer"
        >
          <span className="flex flex-col items-start text-left">
            <span className="text-[18px] font-bold leading-tight">Start Practice</span>
            <span className="text-[13px] font-medium text-red-100 leading-tight mt-0.5">
              연습 시작 · {doneCount}/{sentenceCount} 완료
            </span>
          </span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onOpenEdit}
          className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[#162447] transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Edit3 className="w-4 h-4 shrink-0 text-[#1E3A5F]" />
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="text-[15px] font-semibold">Edit Sentences</span>
            <span className="text-[11px] text-slate-500">문장 편집</span>
          </span>
        </button>
      </div>

      {/* What is shadowing? Card */}
      <section className="rounded-2xl bg-slate-50 border border-slate-200/90 p-5">
        <h2 className="text-[17px] font-bold text-[#162447] mb-3.5">
          What is shadowing? <span className="font-medium text-slate-500 text-[14px] ml-1">쉐도잉이란?</span>
        </h2>
        <ul className="space-y-3">
          {SHADOWING_TIPS.map((tip) => (
            <li key={tip.num} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#162447] text-white text-[13px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                {tip.num}
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-slate-900 leading-snug">
                  {tip.en}
                </p>
                <p className="text-[14px] text-slate-600 leading-snug break-keep mt-0.5">
                  {tip.ko}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Educational Use & Source Card */}
      <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3.5">
        <div className="border-b border-slate-100 pb-2.5">
          <h2 className="text-[14px] font-bold text-[#162447]">
            Educational Use &amp; Source / 교육용 고지 및 출처
          </h2>
          <p className="text-[12.5px] font-semibold text-[#C81E32] mt-0.5">
            {EDUCATIONAL_NOTICE.title}
          </p>
        </div>

        <div className="space-y-2 text-[12.5px] leading-relaxed text-slate-600 break-keep">
          <p>{EDUCATIONAL_NOTICE.english}</p>
          <p className="text-slate-500">{EDUCATIONAL_NOTICE.korean}</p>
        </div>

        <dl className="pt-2.5 border-t border-slate-100 space-y-1.5 text-[12.5px]">
          {sourceItems.map((item) => (
            <div key={item.label} className="flex flex-col sm:flex-row sm:gap-2 leading-snug">
              <dt className="font-semibold text-slate-700 shrink-0 sm:w-36">{item.label}</dt>
              <dd className="text-slate-600 break-words min-w-0">
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#1E3A5F] underline underline-offset-2 hover:text-[#C81E32] break-all"
                  >
                    <span>{item.value}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
