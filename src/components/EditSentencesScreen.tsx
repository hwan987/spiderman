import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  Edit2,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import {
  DEFAULT_SENTENCES,
  formatTimePrecise,
  MOVIE_SETTINGS,
} from '../constants/movieConfig';
import { PlaybackRate, Sentence } from '../types';
import { parseImportedSentencesJson } from '../utils/storage';
import { countWords } from '../utils/textHelpers';
import { YouTubeClipPlayerHandle } from './YouTubeClipPlayer';

interface EditSentencesScreenProps {
  sentences: Sentence[];
  playerRef: React.RefObject<YouTubeClipPlayerHandle | null>;
  playbackRate: PlaybackRate;
  liveTimeSeconds: number;
  onSaveSentences: (next: Sentence[]) => void;
}

export function EditSentencesScreen({
  sentences,
  playerRef,
  playbackRate,
  liveTimeSeconds,
  onSaveSentences,
}: EditSentencesScreenProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [speaker, setSpeaker] = useState('Tony');
  const [text, setText] = useState('');
  const [korean, setKorean] = useState('');
  const [stressInput, setStressInput] = useState('');
  const [startStr, setStartStr] = useState(String(MOVIE_SETTINGS.practiceStart));
  const [endStr, setEndStr] = useState(String(MOVIE_SETTINGS.practiceStart + 2.5));

  const [formError, setFormError] = useState<string | null>(null);
  const [showImportBox, setShowImportBox] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const parsedStart = Number(startStr);
  const parsedEnd = Number(endStr);
  const durationSec =
    !Number.isNaN(parsedStart) && !Number.isNaN(parsedEnd)
      ? Math.round((parsedEnd - parsedStart) * 10) / 10
      : 0;
  const wordCount = countWords(text);

  const showGentleDurationWarning = durationSec > 4;
  const showGentleWordWarning = wordCount > 12;

  const resetForm = () => {
    setEditingId(null);
    setSpeaker('Tony');
    setText('');
    setKorean('');
    setStressInput('');
    setStartStr(String(MOVIE_SETTINGS.practiceStart));
    setEndStr(String(MOVIE_SETTINGS.practiceStart + 2.5));
    setFormError(null);
  };

  const handleSetStartNow = () => {
    const now = playerRef.current?.getCurrentTime() ?? liveTimeSeconds;
    const clamped = Math.min(
      MOVIE_SETTINGS.practiceEnd,
      Math.max(MOVIE_SETTINGS.practiceStart, Math.round(now * 10) / 10)
    );
    setStartStr(clamped.toFixed(1));
  };

  const handleSetEndNow = () => {
    const now = playerRef.current?.getCurrentTime() ?? liveTimeSeconds;
    const clamped = Math.min(
      MOVIE_SETTINGS.practiceEnd,
      Math.max(MOVIE_SETTINGS.practiceStart, Math.round(now * 10) / 10)
    );
    setEndStr(clamped.toFixed(1));
  };

  const handleTestSegment = () => {
    setFormError(null);
    if (
      Number.isNaN(parsedStart) ||
      Number.isNaN(parsedEnd) ||
      parsedStart < MOVIE_SETTINGS.practiceStart ||
      parsedEnd > MOVIE_SETTINGS.practiceEnd ||
      parsedEnd <= parsedStart
    ) {
      setFormError(
        `Start and End must be between ${MOVIE_SETTINGS.practiceStart}s and ${MOVIE_SETTINGS.practiceEnd}s, with End > Start.`
      );
      return;
    }
    playerRef.current?.playSegment({
      start: parsedStart,
      end: parsedEnd,
      rate: playbackRate,
      allowLoop: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedText = text.trim();
    const trimmedSpeaker = speaker.trim() || 'Speaker';
    const trimmedKorean = korean.trim();

    if (!trimmedText) {
      setFormError('Please enter the English sentence.');
      return;
    }
    if (
      Number.isNaN(parsedStart) ||
      Number.isNaN(parsedEnd) ||
      parsedStart < MOVIE_SETTINGS.practiceStart ||
      parsedEnd > MOVIE_SETTINGS.practiceEnd
    ) {
      setFormError(
        `Start and End must be between ${MOVIE_SETTINGS.practiceStart} and ${MOVIE_SETTINGS.practiceEnd} seconds.`
      );
      return;
    }
    if (parsedEnd <= parsedStart) {
      setFormError('End time must be greater than Start time.');
      return;
    }

    const stress = stressInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const roundedStart = Math.round(parsedStart * 10) / 10;
    const roundedEnd = Math.round(parsedEnd * 10) / 10;

    if (editingId !== null) {
      const updated = sentences.map((item) =>
        item.id === editingId
          ? {
              ...item,
              speaker: trimmedSpeaker,
              text: trimmedText,
              korean: trimmedKorean,
              stress,
              start: roundedStart,
              end: roundedEnd,
            }
          : item
      );
      onSaveSentences(updated);
      resetForm();
    } else {
      const maxId = sentences.reduce((max, s) => Math.max(max, s.id), 0);
      const nextSentence: Sentence = {
        id: maxId + 1,
        speaker: trimmedSpeaker,
        text: trimmedText,
        korean: trimmedKorean,
        stress,
        start: roundedStart,
        end: roundedEnd,
      };
      onSaveSentences([...sentences, nextSentence]);
      resetForm();
    }
  };

  const handleStartEdit = (s: Sentence) => {
    setEditingId(s.id);
    setSpeaker(s.speaker);
    setText(s.text);
    setKorean(s.korean);
    setStressInput(s.stress.join(', '));
    setStartStr(s.start.toFixed(1));
    setEndStr(s.end.toFixed(1));
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: number) => {
    const next = sentences.filter((s) => s.id !== id);
    onSaveSentences(next);
    if (editingId === id) {
      resetForm();
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sentences.length) return;
    const next = [...sentences];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    onSaveSentences(next);
  };

  const handleExportJson = async () => {
    const json = JSON.stringify(sentences, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // Fallback: show in import/export box for manual copy
      setImportText(json);
      setShowImportBox(true);
    }
  };

  const handleApplyImport = () => {
    setImportError(null);
    const result = parseImportedSentencesJson(importText);
    if (result.error || !result.sentences) {
      setImportError(result.error ?? 'Could not import JSON.');
      return;
    }
    onSaveSentences(result.sentences);
    setShowImportBox(false);
    setImportText('');
    resetForm();
  };

  const handleResetDefaults = () => {
    onSaveSentences(DEFAULT_SENTENCES);
    resetForm();
  };

  return (
    <div className="flex flex-col gap-5 pt-3 pb-10">
      {/* Add / Edit Sentence Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3.5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[17px] font-bold text-[#162447]">
            {editingId !== null ? 'Edit Sentence / 문장 수정' : 'Add Sentence / 문장 추가'}
          </h2>
          <span className="text-[12.5px] font-mono-tabular text-slate-500">
            Now: {liveTimeSeconds.toFixed(1)}s
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
              Speaker / 화자
            </label>
            <input
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="Tony or Peter"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-[16px] text-slate-900 focus:outline-none focus:border-[#162447]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
              English sentence / 영어 문장
            </label>
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. I just wanted to be like you."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[17px] text-slate-900 leading-snug focus:outline-none focus:border-[#162447]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
              Korean meaning / 한국어 뜻
            </label>
            <input
              type="text"
              value={korean}
              onChange={(e) => setKorean(e.target.value)}
              placeholder="예: 전 그냥 당신처럼 되고 싶었어요."
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-[16px] text-slate-900 focus:outline-none focus:border-[#162447]"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
              Stress words (comma-separated) / 강세 단어
            </label>
            <input
              type="text"
              value={stressInput}
              onChange={(e) => setStressInput(e.target.value)}
              placeholder="e.g. wanted, you"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-[16px] text-slate-900 focus:outline-none focus:border-[#162447]"
            />
          </div>

          {/* Start & End Times + Set Now Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-slate-700">
                Start (s) / 시작
              </label>
              <input
                type="number"
                step="0.1"
                min={MOVIE_SETTINGS.practiceStart}
                max={MOVIE_SETTINGS.practiceEnd}
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-[16px] font-mono-tabular text-slate-900 focus:outline-none focus:border-[#162447]"
              />
              <button
                type="button"
                onClick={handleSetStartNow}
                className="w-full min-h-[48px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#162447] text-[12.5px] font-semibold leading-tight cursor-pointer"
              >
                <span className="block">Set Start = now</span>
                <span className="block text-[10.5px] text-slate-500">현재 시간 시작</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-slate-700">
                End (s) / 끝
              </label>
              <input
                type="number"
                step="0.1"
                min={MOVIE_SETTINGS.practiceStart}
                max={MOVIE_SETTINGS.practiceEnd}
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-[16px] font-mono-tabular text-slate-900 focus:outline-none focus:border-[#162447]"
              />
              <button
                type="button"
                onClick={handleSetEndNow}
                className="w-full min-h-[48px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#162447] text-[12.5px] font-semibold leading-tight cursor-pointer"
              >
                <span className="block">Set End = now</span>
                <span className="block text-[10.5px] text-slate-500">현재 시간 끝</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gentle Warnings (>4s or >12 words) */}
        {(showGentleDurationWarning || showGentleWordWarning) && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-[13px] text-amber-900 space-y-0.5">
            {showGentleDurationWarning && (
              <p>
                Tip: This clip is {durationSec.toFixed(1)}s long. Short clips (under 4s) are easier to shadow!
              </p>
            )}
            {showGentleWordWarning && (
              <p>
                Tip: This line has {wordCount} words. Under 12 words is usually easier to copy smoothly.
              </p>
            )}
          </div>
        )}

        {formError && (
          <p className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[13.5px] font-medium text-[#C81E32]">
            {formError}
          </p>
        )}

        {/* Test + Save Buttons */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleTestSegment}
            className="min-h-[48px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#162447] inline-flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 shrink-0" />
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[14px] font-bold">Test</span>
              <span className="text-[10.5px] text-slate-500">구간 확인</span>
            </span>
          </button>

          <button
            type="submit"
            className="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-[#C81E32] hover:bg-[#A91729] text-white inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {editingId !== null ? <Check className="w-4 h-4 shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[15px] font-bold">
                {editingId !== null ? 'Save Changes' : 'Add Sentence'}
              </span>
              <span className="text-[10.5px] text-red-100">
                {editingId !== null ? '수정 저장' : '문장 추가'}
              </span>
            </span>
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[48px] px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[14px] font-semibold cursor-pointer"
            >
              Cancel / 취소
            </button>
          )}
        </div>
      </form>

      {/* Export / Import JSON Controls */}
      <section className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className="min-h-[48px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-[#162447] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedJson ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[14px] font-bold">
                {copiedJson ? 'Copied JSON' : 'Export JSON'}
              </span>
              <span className="text-[10.5px] text-slate-500">
                {copiedJson ? '복사 완료' : '내보내기 (복사)'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowImportBox((prev) => !prev);
              setImportError(null);
            }}
            className="min-h-[48px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-[#162447] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[14px] font-bold">Import JSON</span>
              <span className="text-[10.5px] text-slate-500">가져오기 (붙여넣기)</span>
            </span>
          </button>
        </div>

        {showImportBox && (
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <textarea
              rows={5}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste sentences JSON array here..."
              className="w-full p-3 rounded-xl border border-slate-300 bg-white font-mono text-[12.5px] text-slate-800 focus:outline-none focus:border-[#162447]"
            />
            {importError && (
              <p className="text-[13px] font-medium text-[#C81E32]">{importError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyImport}
                className="flex-1 min-h-[48px] px-4 py-2 rounded-xl bg-[#162447] hover:bg-[#1E3A5F] text-white font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Apply JSON / 적용하기</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImportBox(false)}
                className="min-h-[48px] px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleResetDefaults}
          className="w-full min-h-[48px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[13.5px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Reset to Default 8 Lines / 기본 문장 복원</span>
        </button>
      </section>

      {/* Current List */}
      <section className="space-y-3">
        <h3 className="text-[16px] font-bold text-[#162447]">
          Current Sentences ({sentences.length})
        </h3>

        {sentences.length === 0 ? (
          <p className="text-[16px] text-slate-500 py-4 text-center">
            No sentences yet. Add one above!
          </p>
        ) : (
          <ul className="space-y-2.5">
            {sentences.map((s, idx) => (
              <li
                key={s.id}
                className="rounded-2xl bg-white border border-slate-200 p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[12.5px] text-slate-500">
                      <span className="font-bold text-[#162447] tabular-nums">#{idx + 1}</span>
                      <span>·</span>
                      <span className="font-semibold">{s.speaker}</span>
                      <span>·</span>
                      <span className="font-mono-tabular">
                        {formatTimePrecise(s.start)} – {formatTimePrecise(s.end)}
                      </span>
                    </div>
                    <p className="text-[18px] font-semibold text-slate-900 leading-snug mt-1">
                      {s.text}
                    </p>
                    {s.korean && (
                      <p className="text-[13.5px] text-slate-500 leading-snug break-keep mt-0.5">
                        {s.korean}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                    className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center text-slate-700 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === sentences.length - 1}
                    aria-label="Move down"
                    className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center text-slate-700 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <div className="flex-1" />

                  <button
                    type="button"
                    onClick={() => handleStartEdit(s)}
                    className="min-h-[44px] px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-[#162447] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="min-h-[44px] px-3 rounded-lg border border-red-200 hover:bg-red-50 text-[#C81E32] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
