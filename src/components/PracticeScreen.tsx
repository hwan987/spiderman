import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Mic,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Square,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  formatTimePrecise,
  SELF_CHECK_QUESTIONS,
  SHADOW_STEPS,
} from '../constants/movieConfig';
import {
  PlaybackRate,
  RecordedClip,
  SelfCheckRating,
  Sentence,
  SentenceProgress,
  ShadowStep,
  WordCheckResult,
} from '../types';
import { evaluateWordCheck, tokenizeSentenceWithStress } from '../utils/textHelpers';
import { YouTubeClipPlayerHandle } from './YouTubeClipPlayer';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface PracticeScreenProps {
  sentences: Sentence[];
  currentIndex: number;
  progressMap: Record<number, SentenceProgress>;
  recordingsMap: Record<number, RecordedClip>;
  playerRef: React.RefObject<YouTubeClipPlayerHandle | null>;
  isPlaying: boolean;
  isLoopWaiting: boolean;
  loopEnabled: boolean;
  playbackRate: PlaybackRate;
  onToggleLoop: () => void;
  onChangeRate: (rate: PlaybackRate) => void;
  onSelectIndex: (index: number) => void;
  onFinishSession: () => void;
  onRecordPlay: (sentenceId: number) => void;
  onSaveRecording: (sentenceId: number, clip: RecordedClip, step: ShadowStep) => void;
  onUpdateSelfCheck: (
    sentenceId: number,
    questionIndex: 0 | 1 | 2,
    rating: SelfCheckRating
  ) => void;
  onOpenEdit: () => void;
}

function getSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function PracticeScreen({
  sentences,
  currentIndex,
  progressMap,
  recordingsMap,
  playerRef,
  isPlaying,
  isLoopWaiting,
  loopEnabled,
  playbackRate,
  onToggleLoop,
  onChangeRate,
  onSelectIndex,
  onFinishSession,
  onRecordPlay,
  onSaveRecording,
  onUpdateSelfCheck,
  onOpenEdit,
}: PracticeScreenProps) {
  const sentence = sentences[currentIndex];
  const [step, setStep] = useState<ShadowStep>(1);
  const [hideText, setHideText] = useState<boolean>(true);
  const [hideMeaning, setHideMeaning] = useState<boolean>(false);

  const [recordPhase, setRecordPhase] = useState<'idle' | 'recording' | 'tail'>('idle');
  const [micDenied, setMicDenied] = useState(false);
  const [playingMyVoice, setPlayingMyVoice] = useState(false);

  const [isListeningWords, setIsListeningWords] = useState(false);
  const [wordCheckError, setWordCheckError] = useState<string | null>(null);
  const [wordCheckResults, setWordCheckResults] = useState<Record<number, WordCheckResult>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tailTimerRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechApiAvailable =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const cleanupRecordingResources = () => {
    if (tailTimerRef.current !== null) {
      window.clearTimeout(tailTimerRef.current);
      tailTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setRecordPhase('idle');
  };

  const stopMyVoicePlayback = () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    setPlayingMyVoice(false);
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListeningWords(false);
  };

  // Stop active playback / recording cleanly when switching sentences
  useEffect(() => {
    playerRef.current?.stopPlayback();
    cleanupRecordingResources();
    stopMyVoicePlayback();
    stopSpeechRecognition();
    setWordCheckError(null);
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      cleanupRecordingResources();
      stopMyVoicePlayback();
      stopSpeechRecognition();
    };
  }, []);

  if (!sentence) {
    return (
      <div className="py-10 text-center space-y-4">
        <p className="text-[18px] text-slate-700">
          No sentences yet. Tap Edit Sentences to add some.
        </p>
        <button
          type="button"
          onClick={onOpenEdit}
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#162447] text-white font-semibold cursor-pointer"
        >
          Edit Sentences / 문장 편집
        </button>
      </div>
    );
  }

  const activeStepInfo = SHADOW_STEPS.find((s) => s.step === step) ?? SHADOW_STEPS[0];
  const progress = progressMap[sentence.id];
  const recording = recordingsMap[sentence.id];
  const hasRecorded = Boolean(recording) || (progress?.recordings ?? 0) > 0;
  const wordResult = wordCheckResults[sentence.id];
  const tokens = tokenizeSentenceWithStress(sentence.text, sentence.stress);
  const isPeter = sentence.speaker.toLowerCase().includes('peter');

  const handleStepSelect = (nextStep: ShadowStep) => {
    setStep(nextStep);
    const meta = SHADOW_STEPS.find((s) => s.step === nextStep);
    if (meta) {
      setHideText(meta.defaultHideText);
    }
  };

  const handlePlayToggle = () => {
    if (recordPhase !== 'idle') return;
    stopMyVoicePlayback();

    if (isPlaying || isLoopWaiting) {
      playerRef.current?.stopPlayback();
      return;
    }

    onRecordPlay(sentence.id);
    playerRef.current?.playSegment({
      start: sentence.start,
      end: sentence.end,
      rate: playbackRate,
      allowLoop: true,
      onLoopReplay: () => onRecordPlay(sentence.id),
    });
  };

  const handlePlayOriginal = () => {
    if (recordPhase !== 'idle') return;
    stopMyVoicePlayback();
    onRecordPlay(sentence.id);
    playerRef.current?.playSegment({
      start: sentence.start,
      end: sentence.end,
      rate: playbackRate,
      allowLoop: false,
    });
  };

  const handleRecordTap = async () => {
    if (recordPhase !== 'idle') {
      // Allow manual early stop
      playerRef.current?.stopPlayback();
      if (tailTimerRef.current !== null) {
        window.clearTimeout(tailTimerRef.current);
        tailTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    stopMyVoicePlayback();
    stopSpeechRecognition();
    playerRef.current?.stopPlayback();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setMicDenied(true);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicDenied(false);
    } catch {
      setMicDenied(true);
      return;
    }

    mediaStreamRef.current = stream;
    chunksRef.current = [];

    const preferredMime = getSupportedAudioMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }

    const targetSentenceId = sentence.id;
    const activeStepAtStart = step;
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || preferredMime || 'audio/mp4';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        onSaveRecording(targetSentenceId, { url, mimeType }, activeStepAtStart);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      setRecordPhase('idle');
    };

    setRecordPhase('recording');
    recorder.start();
    onRecordPlay(targetSentenceId);

    // Loop is explicitly ignored while recording; stop recording 1s after sentence ends
    playerRef.current?.playSegment({
      start: sentence.start,
      end: sentence.end,
      rate: playbackRate,
      allowLoop: false,
      onSegmentEnd: () => {
        setRecordPhase('tail');
        tailTimerRef.current = window.setTimeout(() => {
          tailTimerRef.current = null;
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        }, 1000);
      },
    });
  };

  const handlePlayMyVoice = () => {
    if (!recording || recordPhase !== 'idle') return;
    if (playingMyVoice) {
      stopMyVoicePlayback();
      return;
    }
    playerRef.current?.stopPlayback();
    const audio = new Audio(recording.url);
    audioElRef.current = audio;
    setPlayingMyVoice(true);
    audio.onended = () => {
      setPlayingMyVoice(false);
      audioElRef.current = null;
    };
    audio.onerror = () => {
      setPlayingMyVoice(false);
      audioElRef.current = null;
    };
    audio.play().catch(() => {
      setPlayingMyVoice(false);
      audioElRef.current = null;
    });
  };

  const handleWordCheck = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (isListeningWords) {
      recognitionRef.current?.stop();
      setIsListeningWords(false);
      return;
    }

    stopMyVoicePlayback();
    playerRef.current?.stopPlayback();
    setWordCheckError(null);

    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const targetId = sentence.id;
    const targetText = sentence.text;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript.trim()) {
        const evaluated = evaluateWordCheck(targetText, transcript);
        setWordCheckResults((prev) => ({
          ...prev,
          [targetId]: evaluated,
        }));
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicDenied(true);
      } else if (event.error === 'no-speech') {
        setWordCheckError('No speech heard — tap Check My Words and try speaking clearly.');
      }
      setIsListeningWords(false);
    };

    recognition.onend = () => {
      setIsListeningWords(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListeningWords(true);
    try {
      recognition.start();
    } catch {
      setIsListeningWords(false);
    }
  };

  const isLastSentence = currentIndex >= sentences.length - 1;

  return (
    <div className="flex flex-col gap-4 pt-3 pb-10">
      {/* Sentence Counter & Prev/Next Arrows */}
      <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-1.5">
        <button
          type="button"
          onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          aria-label="Previous sentence"
          className="min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center text-[#162447] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-[16px] font-bold text-[#162447] tabular-nums">
            Sentence {currentIndex + 1} / {sentences.length}
          </p>
          <p className="text-[12px] text-slate-500 font-mono-tabular">
            {formatTimePrecise(sentence.start)} – {formatTimePrecise(sentence.end)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelectIndex(Math.min(sentences.length - 1, currentIndex + 1))}
          disabled={isLastSentence}
          aria-label="Next sentence"
          className="min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center text-[#162447] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* 4-Step Guided Tabs */}
      <section className="space-y-2">
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl">
          {SHADOW_STEPS.map((item) => {
            const active = item.step === step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => handleStepSelect(item.step)}
                className={`min-h-[48px] px-1.5 py-1.5 rounded-xl transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                  active
                    ? 'bg-[#162447] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span className="text-[12px] font-bold leading-tight whitespace-nowrap">
                  {item.step}. {item.step === 3 ? 'Read' : item.label}
                </span>
                <span
                  className={`text-[10.5px] leading-tight mt-0.5 whitespace-nowrap ${
                    active ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {item.koreanLabel}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <p className="text-[14px] font-semibold text-[#162447] leading-snug">
            Step {activeStepInfo.step}: {activeStepInfo.instructionEn}
          </p>
          <p className="text-[13px] text-slate-600 leading-snug break-keep mt-0.5">
            {activeStepInfo.instructionKo}
          </p>
        </div>
      </section>

      {/* Main Dialogue Display Card (Focal Anchor) */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[14px]">
            <span className={`font-extrabold ${isPeter ? 'text-[#C81E32]' : 'text-[#162447]'}`}>
              {sentence.speaker}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="text-slate-500 font-medium">
              {progress?.status === 'done'
                ? '★ Done'
                : progress?.status === 'practiced'
                ? '◐ Practiced'
                : '☆ New'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setHideText((prev) => !prev)}
            className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[#162447] inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            {hideText ? <Eye className="w-4 h-4 shrink-0" /> : <EyeOff className="w-4 h-4 shrink-0" />}
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[13px] font-semibold whitespace-nowrap">
                {hideText ? 'Show Text' : 'Hide Text'}
              </span>
              <span className="text-[10.5px] text-slate-500 whitespace-nowrap">
                {hideText ? '문장 보이기' : '문장 숨기기'}
              </span>
            </span>
          </button>
        </div>

        {/* Large Practice Sentence */}
        <div className="min-h-[88px] flex items-center">
          {hideText ? (
            <div className="w-full py-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 px-4">
              <p className="text-[18px] font-semibold text-slate-500">
                Listening focus — text hidden
              </p>
              <p className="text-[13.5px] text-slate-400 mt-0.5 break-keep">
                소리에 집중해 보세요 (필요하면 위 버튼으로 문장 확인)
              </p>
            </div>
          ) : (
            <p className="text-[24px] sm:text-[26px] leading-[1.45] font-medium text-slate-900 tracking-[-0.01em]">
              {tokens.map((tok, i) =>
                tok.isStress ? (
                  <strong
                    key={i}
                    className="font-extrabold text-[#C81E32] underline decoration-[#C81E32]/35 decoration-2 underline-offset-4"
                  >
                    {tok.raw}
                  </strong>
                ) : (
                  <span key={i}>{tok.raw}</span>
                )
              )}
            </p>
          )}
        </div>

        {/* Korean Meaning (small, gray, toggleable) */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {hideMeaning ? (
              <p className="text-[14px] text-slate-400 italic">뜻 숨김</p>
            ) : (
              <p className="text-[15.5px] text-slate-600 leading-snug break-keep">
                {sentence.korean}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setHideMeaning((prev) => !prev)}
            className="min-h-[48px] px-3 py-1.5 rounded-xl text-[12px] font-semibold text-slate-500 hover:text-[#162447] hover:bg-slate-50 transition-colors shrink-0 cursor-pointer flex flex-col items-center justify-center leading-tight"
          >
            <span>{hideMeaning ? 'Show KR' : 'Hide KR'}</span>
            <span className="text-[10px] font-normal">
              {hideMeaning ? '뜻 보기' : '뜻 숨김'}
            </span>
          </button>
        </div>
      </section>

      {/* Loop 1.5s Speaking Window Banner */}
      {isLoopWaiting && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-center">
          <p className="text-[15px] font-bold text-[#C81E32]">
            Your turn — speak now! · 지금 따라 말해보세요 (1.5s)
          </p>
        </div>
      )}

      {/* Playback Control Row: Play, Loop, Speed 0.5x / 0.75x / 1.0x */}
      <section className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handlePlayToggle}
            disabled={recordPhase !== 'idle'}
            className="min-h-[52px] px-4 py-2 rounded-xl bg-[#162447] hover:bg-[#1E3A5F] disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {isPlaying || isLoopWaiting ? (
              <Pause className="w-5 h-5 shrink-0" />
            ) : (
              <Play className="w-5 h-5 shrink-0" />
            )}
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[16px] font-bold">
                {isPlaying || isLoopWaiting ? 'Pause' : 'Play'}
              </span>
              <span className="text-[11px] text-slate-200">
                {isPlaying || isLoopWaiting ? '일시정지' : '재생'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            aria-pressed={loopEnabled}
            className={`min-h-[52px] px-4 py-2 rounded-xl border transition-colors flex items-center justify-center gap-2.5 cursor-pointer ${
              loopEnabled
                ? 'bg-red-50 border-[#C81E32] text-[#C81E32]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Repeat className="w-5 h-5 shrink-0" />
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[16px] font-bold">
                Loop {loopEnabled ? 'On' : 'Off'}
              </span>
              <span className="text-[11px] opacity-80">
                {loopEnabled ? '반복 켜짐' : '반복 꺼짐'}
              </span>
            </span>
          </button>
        </div>

        {/* Speed Selector */}
        <div className="grid grid-cols-3 gap-2">
          {([0.5, 0.75, 1.0] as PlaybackRate[]).map((rate) => {
            const active = playbackRate === rate;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => onChangeRate(rate)}
                className={`min-h-[48px] px-3 py-1.5 rounded-xl border font-mono-tabular transition-colors flex flex-col items-center justify-center leading-tight cursor-pointer ${
                  active
                    ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold'
                }`}
              >
                <span className="text-[15px]">{rate === 1 ? '1.0×' : `${rate}×`}</span>
                <span className={`text-[10.5px] font-sans ${active ? 'text-slate-200' : 'text-slate-400'}`}>
                  {rate === 0.5 ? '천천히' : rate === 0.75 ? '조금 느리게' : '보통 속도'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Record Area */}
      <section className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
        <button
          type="button"
          onClick={handleRecordTap}
          className={`w-full min-h-[54px] px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-3 cursor-pointer ${
            recordPhase !== 'idle'
              ? 'bg-[#C81E32] text-white shadow-sm'
              : 'bg-[#C81E32] hover:bg-[#A91729] text-white shadow-sm'
          }`}
        >
          {recordPhase !== 'idle' ? (
            <Square className="w-5 h-5 fill-current shrink-0" />
          ) : (
            <Mic className="w-5 h-5 shrink-0" />
          )}
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="text-[16px] font-bold">
              {recordPhase === 'recording'
                ? 'Recording with clip...'
                : recordPhase === 'tail'
                ? 'Finishing (+1s)...'
                : 'Record'}
            </span>
            <span className="text-[11.5px] font-medium text-red-100">
              {recordPhase !== 'idle'
                ? '문장 종료 1초 후 자동 정지 · 탭하면 중지'
                : '영상과 함께 내 목소리 녹음'}
            </span>
          </span>
        </button>

        {micDenied && (
          <p className="text-[14px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-center">
            Mic is off. You can still listen and shadow out loud.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handlePlayMyVoice}
            disabled={!recording || recordPhase !== 'idle'}
            className={`min-h-[48px] px-3.5 py-2 rounded-xl border transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
              playingMyVoice
                ? 'bg-[#162447] border-[#162447] text-white'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-[#162447]'
            }`}
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[14px] font-bold whitespace-nowrap">
                {playingMyVoice ? 'Stop Voice' : 'My Voice'}
              </span>
              <span
                className={`text-[10.5px] whitespace-nowrap ${
                  playingMyVoice ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {playingMyVoice ? '재생 중지' : '내 목소리'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={handlePlayOriginal}
            disabled={recordPhase !== 'idle'}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-[#162447] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span className="flex flex-col items-start text-left leading-tight">
              <span className="text-[14px] font-bold whitespace-nowrap">Original</span>
              <span className="text-[10.5px] text-slate-500 whitespace-nowrap">원음 듣기</span>
            </span>
          </button>
        </div>

        {/* Optional Web Speech Word Check */}
        {speechApiAvailable && (
          <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
            <button
              type="button"
              onClick={handleWordCheck}
              className={`w-full min-h-[48px] px-4 py-2 rounded-xl border font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isListeningWords
                  ? 'bg-[#162447] border-[#162447] text-white'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-[#162447]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex flex-col items-start text-left leading-tight">
                <span className="text-[14px] font-bold">
                  {isListeningWords ? 'Listening... Tap to Stop' : 'Check My Words'}
                </span>
                <span
                  className={`text-[10.5px] ${
                    isListeningWords ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {isListeningWords ? '영어로 문장을 말해보세요' : '단어 발음 확인 (선택)'}
                </span>
              </span>
            </button>

            {wordCheckError && (
              <p className="text-[13.5px] text-slate-600 text-center">{wordCheckError}</p>
            )}

            {wordResult && (
              <div className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-2">
                <p className="text-[18px] leading-relaxed font-medium">
                  {wordResult.tokens.map((tok, idx) =>
                    !tok.isWord ? (
                      <span key={idx}>{tok.raw}</span>
                    ) : tok.matched ? (
                      <span key={idx} className="text-emerald-700 font-bold">
                        {tok.raw}
                      </span>
                    ) : (
                      <span
                        key={idx}
                        className="text-slate-400 underline decoration-slate-300 underline-offset-4"
                      >
                        {tok.raw}
                      </span>
                    )
                  )}
                </p>
                <p className="text-[14px] font-semibold text-[#162447] tabular-nums">
                  You said {wordResult.matchedCount} of {wordResult.totalWords} words.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Self-Check (shown after recording) */}
      {hasRecorded && (
        <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#162447]">
              Self-check <span className="text-[13px] font-medium text-slate-500 ml-1">스스로 점검하기</span>
            </h3>
          </div>

          <div className="space-y-3.5">
            {SELF_CHECK_QUESTIONS.map((q) => {
              const currentRating = progress?.selfCheck[q.index] ?? null;
              const options: Array<{ value: Exclude<SelfCheckRating, null>; emoji: string; label: string }> = [
                { value: 'good', emoji: '😀', label: 'Good / 좋아요' },
                { value: 'ok', emoji: '🙂', label: 'Okay / 괜찮아요' },
                { value: 'hard', emoji: '😐', label: 'Needs practice / 아쉬워요' },
              ];

              return (
                <div
                  key={q.index}
                  className="pt-2.5 border-t border-slate-100 first:border-t-0 first:pt-0 space-y-2"
                >
                  <div>
                    <p className="text-[15px] font-semibold text-slate-900 leading-snug">{q.en}</p>
                    <p className="text-[13px] text-slate-500 leading-snug break-keep">{q.ko}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {options.map((opt) => {
                      const selected = currentRating === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onUpdateSelfCheck(sentence.id, q.index, opt.value)}
                          aria-pressed={selected}
                          aria-label={opt.label}
                          className={`min-h-[48px] rounded-xl border text-[22px] flex items-center justify-center transition-all cursor-pointer ${
                            selected
                              ? 'bg-red-50 border-[#C81E32] ring-1 ring-[#C81E32]'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{opt.emoji}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Next / Finish CTA */}
      <button
        type="button"
        onClick={() => {
          if (isLastSentence) {
            onFinishSession();
          } else {
            onSelectIndex(currentIndex + 1);
          }
        }}
        className="w-full min-h-[54px] px-5 py-3 rounded-2xl bg-[#162447] hover:bg-[#1E3A5F] text-white font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <span className="flex flex-col items-center leading-tight">
          <span className="text-[16px] font-bold">
            {isLastSentence ? 'Finish Practice' : 'Next Sentence ▶'}
          </span>
          <span className="text-[11px] text-slate-200 font-medium">
            {isLastSentence ? '연습 마무리 보기' : '다음 문장으로'}
          </span>
        </span>
      </button>
    </div>
  );
}
