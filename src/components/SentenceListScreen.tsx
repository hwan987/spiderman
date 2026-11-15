import { ChevronRight, Edit3, Eye, EyeOff } from 'lucide-react';
import { formatTimePrecise } from '../constants/movieConfig';
import { ProgressStatus, Sentence, SentenceProgress } from '../types';
import { tokenizeSentenceWithStress } from '../utils/textHelpers';

interface SentenceListScreenProps {
  sentences: Sentence[];
  progressMap: Record<number, SentenceProgress>;
  hideText: boolean;
  onToggleHideText: () => void;
  onSelectSentence: (index: number) => void;
  onOpenEdit: () => void;
}

function getProgressGlyph(status: ProgressStatus): {
  symbol: string;
  label: string;
  colorClass: string;
} {
  if (status === 'done') {
    return { symbol: '★', label: 'Done / 완료', colorClass: 'text-[#C81E32]' };
  }
  if (status === 'practiced') {
    return { symbol: '◐', label: 'Practiced / 연습함', colorClass: 'text-[#1E3A5F]' };
  }
  return { symbol: '☆', label: 'New / 시작 전', colorClass: 'text-slate-400' };
}

export function SentenceListScreen({
  sentences,
  progressMap,
  hideText,
  onToggleHideText,
  onSelectSentence,
  onOpenEdit,
}: SentenceListScreenProps) {
  return (
    <div className="flex flex-col gap-4 pt-3 pb-8">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-semibold text-[#162447] tabular-nums">
          {sentences.length} {sentences.length === 1 ? 'sentence' : 'sentences'}
        </p>

        <button
          type="button"
          onClick={onToggleHideText}
          className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[#162447] transition-colors inline-flex items-center gap-2 cursor-pointer shrink-0"
        >
          {hideText ? <Eye className="w-4 h-4 shrink-0" /> : <EyeOff className="w-4 h-4 shrink-0" />}
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="text-[14px] font-semibold whitespace-nowrap">
              {hideText ? 'Show Text' : 'Hide Text'}
            </span>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              {hideText ? '문장 보이기' : '문장 숨기기'}
            </span>
          </span>
        </button>
      </div>

      {/* Empty state */}
      {sentences.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center space-y-4">
          <p className="text-[18px] font-medium text-slate-700">
            No sentences yet. Tap Edit Sentences to add some.
          </p>
          <button
            type="button"
            onClick={onOpenEdit}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#162447] hover:bg-[#1E3A5F] text-white font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-4 h-4 shrink-0" />
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[15px] font-semibold">Edit Sentences</span>
              <span className="text-[11px] text-slate-200">문장 편집</span>
            </span>
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sentences.map((sentence, idx) => {
            const status: ProgressStatus = progressMap[sentence.id]?.status ?? 'new';
            const glyph = getProgressGlyph(status);
            const tokens = tokenizeSentenceWithStress(sentence.text, sentence.stress);
            const isPeter = sentence.speaker.toLowerCase().includes('peter');

            return (
              <li key={sentence.id}>
                <button
                  type="button"
                  onClick={() => onSelectSentence(idx)}
                  className="w-full text-left rounded-2xl bg-white hover:bg-slate-50/90 active:scale-[0.995] border border-slate-200 p-4 transition-all flex items-start gap-3.5 shadow-xs cursor-pointer"
                >
                  {/* Number + Progress Mark */}
                  <div className="flex flex-col items-center justify-start pt-0.5 shrink-0 w-9">
                    <span className="text-[14px] font-bold text-slate-500 tabular-nums">
                      {idx + 1}
                    </span>
                    <span
                      className={`text-[20px] leading-none mt-1.5 ${glyph.colorClass}`}
                      title={glyph.label}
                      aria-label={glyph.label}
                    >
                      {glyph.symbol}
                    </span>
                  </div>

                  {/* Sentence Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[13px] mb-1.5">
                      <span
                        className={`font-bold ${
                          isPeter ? 'text-[#C81E32]' : 'text-[#162447]'
                        }`}
                      >
                        {sentence.speaker}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono-tabular text-slate-500">
                        {formatTimePrecise(sentence.start)} – {formatTimePrecise(sentence.end)}
                      </span>
                    </div>

                    {hideText ? (
                      <p className="text-[18px] text-slate-400 italic leading-snug">
                        Text hidden — tap to practice · 문장 숨김
                      </p>
                    ) : (
                      <p className="text-[20px] sm:text-[21px] text-slate-900 leading-[1.4] font-medium">
                        {tokens.map((tok, tIdx) =>
                          tok.isStress ? (
                            <strong
                              key={tIdx}
                              className="font-extrabold text-[#162447] underline decoration-[#C81E32]/40 decoration-2 underline-offset-4"
                            >
                              {tok.raw}
                            </strong>
                          ) : (
                            <span key={tIdx}>{tok.raw}</span>
                          )
                        )}
                      </p>
                    )}

                    {!hideText && sentence.korean && (
                      <p className="text-[14px] text-slate-500 mt-1.5 leading-snug break-keep">
                        {sentence.korean}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 self-center" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
