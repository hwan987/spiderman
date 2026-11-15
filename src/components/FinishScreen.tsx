import { Award, Home, List, RotateCcw } from 'lucide-react';
import { ONE_LINE_CREDIT } from '../constants/movieConfig';
import { Sentence, SentenceProgress } from '../types';

interface FinishScreenProps {
  sentences: Sentence[];
  progressMap: Record<number, SentenceProgress>;
  onPracticeAgain: (index: number) => void;
  onGoToList: () => void;
  onGoHome: () => void;
}

export function FinishScreen({
  sentences,
  progressMap,
  onPracticeAgain,
  onGoToList,
  onGoHome,
}: FinishScreenProps) {
  const completedCount = sentences.filter((s) => {
    const status = progressMap[s.id]?.status;
    return status === 'done' || status === 'practiced';
  }).length;

  const totalRecordings = Object.values(progressMap).reduce(
    (sum, p) => sum + (p.recordings || 0),
    0
  );

  const needsMorePractice = sentences
    .map((sentence, index) => ({ sentence, index, progress: progressMap[sentence.id] }))
    .filter(({ progress }) => progress?.selfCheck?.includes('hard'));

  return (
    <div className="flex flex-col gap-6 px-5 pt-8 pb-8">
      {/* Celebration Header */}
      <header className="text-center space-y-2.5">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#C81E32] flex items-center justify-center mx-auto">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-[30px] font-extrabold text-[#162447] leading-tight">
          Great job!
        </h1>
        <p className="text-[17px] font-medium text-slate-600">
          오늘의 쉐도잉 연습을 잘 마쳤어요!
        </p>
      </header>

      {/* Summary Stats */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
          <p className="text-[28px] font-extrabold text-[#162447] tabular-nums leading-none">
            {completedCount} <span className="text-[18px] font-semibold text-slate-400">/ {sentences.length}</span>
          </p>
          <p className="text-[13px] font-semibold text-slate-600 mt-2">
            Sentences Practiced
          </p>
          <p className="text-[11.5px] text-slate-500">연습한 문장</p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center">
          <p className="text-[28px] font-extrabold text-[#C81E32] tabular-nums leading-none">
            {totalRecordings}
          </p>
          <p className="text-[13px] font-semibold text-slate-600 mt-2">
            Total Recordings
          </p>
          <p className="text-[11.5px] text-slate-500">총 녹음 횟수</p>
        </div>
      </section>

      {/* Sentences marked 😐 */}
      <section className="space-y-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#162447]">
            Marked 😐 for extra practice
          </h2>
          <p className="text-[13px] text-slate-500">
            다시 연습해 보면 좋을 문장 목록
          </p>
        </div>

        {needsMorePractice.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-5 text-center">
            <p className="text-[16px] font-semibold text-slate-800">
              No sentences marked 😐 yet!
            </p>
            <p className="text-[14px] text-slate-500 mt-1 break-keep">
              아쉬웠던 문장이 없거나 아직 😐 표시한 문장이 없어요.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {needsMorePractice.map(({ sentence, index }) => (
              <li
                key={sentence.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3"
              >
                <div>
                  <p className="text-[12.5px] font-bold text-slate-500 tabular-nums">
                    Sentence {index + 1} · {sentence.speaker}
                  </p>
                  <p className="text-[19px] font-semibold text-slate-900 leading-snug mt-1">
                    {sentence.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPracticeAgain(index)}
                  className="w-full min-h-[48px] px-4 py-2 rounded-xl bg-[#C81E32] hover:bg-[#A91729] text-white font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span className="flex flex-col items-start text-left leading-tight">
                    <span className="text-[14px] font-bold">Practice again</span>
                    <span className="text-[10.5px] text-red-100">다시 연습</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bottom Navigation */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={onGoToList}
          className="min-h-[52px] px-4 py-2.5 rounded-xl bg-[#162447] hover:bg-[#1E3A5F] text-white inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <List className="w-4 h-4 shrink-0" />
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="text-[14px] font-bold">Sentence List</span>
            <span className="text-[10.5px] text-slate-200">문장 목록</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onGoHome}
          className="min-h-[52px] px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[#162447] inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="text-[14px] font-bold">Home</span>
            <span className="text-[10.5px] text-slate-500">처음으로</span>
          </span>
        </button>
      </div>

      {/* Required One-Line Credit at Bottom */}
      <footer className="pt-4 border-t border-slate-200">
        <p className="text-[13px] leading-snug text-slate-500">
          {ONE_LINE_CREDIT}
        </p>
      </footer>
    </div>
  );
}
