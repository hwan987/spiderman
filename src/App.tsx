import { ArrowLeft, CheckCircle, Edit3 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditSentencesScreen } from './components/EditSentencesScreen';
import { FinishScreen } from './components/FinishScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { SentenceListScreen } from './components/SentenceListScreen';
import { StartScreen } from './components/StartScreen';
import {
  YouTubeClipPlayer,
  YouTubeClipPlayerHandle,
} from './components/YouTubeClipPlayer';
import { MOVIE_SETTINGS } from './constants/movieConfig';
import {
  PlaybackRate,
  ProgressStatus,
  RecordedClip,
  ScreenId,
  SelfCheckRating,
  Sentence,
  SentenceProgress,
  ShadowStep,
} from './types';
import {
  createInitialProgress,
  loadProgress,
  loadSentences,
  saveProgress,
  saveSentences,
} from './utils/storage';

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('start');
  const [returnFromEditScreen, setReturnFromEditScreen] = useState<ScreenId>('list');
  const [sentences, setSentences] = useState<Sentence[]>(() => loadSentences());
  const [progressMap, setProgressMap] = useState<Record<number, SentenceProgress>>(() =>
    loadProgress()
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [listHideText, setListHideText] = useState<boolean>(false);

  // Shared player & playback controls
  const playerRef = useRef<YouTubeClipPlayerHandle | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoopWaiting, setIsLoopWaiting] = useState<boolean>(false);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1.0);
  const [liveTimeSeconds, setLiveTimeSeconds] = useState<number>(
    MOVIE_SETTINGS.practiceStart
  );

  // Latest recording per sentence kept strictly in memory
  const [recordingsMap, setRecordingsMap] = useState<Record<number, RecordedClip>>({});
  const recordingsRef = useRef<Record<number, RecordedClip>>({});

  useEffect(() => {
    recordingsRef.current = recordingsMap;
  }, [recordingsMap]);

  useEffect(() => {
    return () => {
      Object.values(recordingsRef.current).forEach((clip) => {
        try {
          URL.revokeObjectURL(clip.url);
        } catch {
          // ignore
        }
      });
    };
  }, []);

  const handleSaveSentences = useCallback((next: Sentence[]) => {
    setSentences(next);
    saveSentences(next);
    setCurrentIndex((prev) => {
      if (next.length === 0) return 0;
      return Math.min(prev, next.length - 1);
    });
  }, []);

  const updateProgressEntry = useCallback(
    (sentenceId: number, updater: (prev: SentenceProgress) => SentenceProgress) => {
      setProgressMap((prev) => {
        const current = prev[sentenceId] ?? createInitialProgress(sentenceId);
        const nextEntry = updater(current);
        const nextMap = { ...prev, [sentenceId]: nextEntry };
        saveProgress(nextMap);
        return nextMap;
      });
    },
    []
  );

  const handleRecordPlay = useCallback(
    (sentenceId: number) => {
      updateProgressEntry(sentenceId, (prev) => ({
        ...prev,
        plays: prev.plays + 1,
      }));
    },
    [updateProgressEntry]
  );

  const handleSaveRecording = useCallback(
    (sentenceId: number, clip: RecordedClip, step: ShadowStep) => {
      setRecordingsMap((prev) => {
        const old = prev[sentenceId];
        if (old) {
          try {
            URL.revokeObjectURL(old.url);
          } catch {
            // ignore
          }
        }
        return { ...prev, [sentenceId]: clip };
      });

      updateProgressEntry(sentenceId, (prev) => {
        let nextStatus: ProgressStatus = prev.status;
        if (step === 4) {
          nextStatus = 'done';
        } else if (prev.status === 'new') {
          nextStatus = 'practiced';
        }
        return {
          ...prev,
          recordings: prev.recordings + 1,
          status: nextStatus,
        };
      });
    },
    [updateProgressEntry]
  );

  const handleUpdateSelfCheck = useCallback(
    (sentenceId: number, questionIndex: 0 | 1 | 2, rating: SelfCheckRating) => {
      updateProgressEntry(sentenceId, (prev) => {
        const nextChecks: [SelfCheckRating, SelfCheckRating, SelfCheckRating] = [
          ...prev.selfCheck,
        ] as [SelfCheckRating, SelfCheckRating, SelfCheckRating];
        nextChecks[questionIndex] = rating;
        return {
          ...prev,
          selfCheck: nextChecks,
        };
      });
    },
    [updateProgressEntry]
  );

  const navigateTo = (nextScreen: ScreenId) => {
    playerRef.current?.stopPlayback();
    setIsPlaying(false);
    setIsLoopWaiting(false);
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const openEditFrom = (from: ScreenId) => {
    setReturnFromEditScreen(from);
    navigateTo('edit');
  };

  const doneCount = sentences.filter((s) => {
    const st = progressMap[s.id]?.status;
    return st === 'done' || st === 'practiced';
  }).length;

  const showVideoShell = screen === 'list' || screen === 'practice' || screen === 'edit';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="max-w-[480px] mx-auto min-h-screen bg-white border-x border-slate-200/80 shadow-xs flex flex-col">
        {/* Compact Top Bar for List / Practice / Edit */}
        {showVideoShell && (
          <header className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-white">
            <button
              type="button"
              onClick={() => {
                if (screen === 'list') navigateTo('start');
                else if (screen === 'practice') navigateTo('list');
                else navigateTo(returnFromEditScreen);
              }}
              className="min-h-[48px] px-2.5 -ml-1 rounded-xl hover:bg-slate-50 text-[#162447] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="flex flex-col items-start text-left leading-tight">
                <span className="text-[14px] font-bold whitespace-nowrap">
                  {screen === 'list' ? 'Home' : screen === 'practice' ? 'List' : 'Back'}
                </span>
                <span className="text-[10.5px] text-slate-500 whitespace-nowrap">
                  {screen === 'list' ? '처음' : screen === 'practice' ? '목록' : '뒤로'}
                </span>
              </span>
            </button>

            <h1 className="text-[15px] font-extrabold text-[#162447] truncate text-center">
              {screen === 'list'
                ? 'Sentence List'
                : screen === 'practice'
                ? 'Shadowing Practice'
                : 'Edit Sentences'}
            </h1>

            <div className="shrink-0">
              {screen === 'list' && (
                <button
                  type="button"
                  onClick={() => openEditFrom('list')}
                  className="min-h-[48px] px-2.5 rounded-xl hover:bg-slate-50 text-[#162447] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 shrink-0" />
                  <span className="flex flex-col items-start text-left leading-tight">
                    <span className="text-[14px] font-bold whitespace-nowrap">Edit</span>
                    <span className="text-[10.5px] text-slate-500 whitespace-nowrap">편집</span>
                  </span>
                </button>
              )}
              {screen === 'practice' && (
                <button
                  type="button"
                  onClick={() => navigateTo('finish')}
                  className="min-h-[48px] px-2.5 rounded-xl hover:bg-red-50 text-[#C81E32] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="flex flex-col items-start text-left leading-tight">
                    <span className="text-[14px] font-bold whitespace-nowrap">Finish</span>
                    <span className="text-[10.5px] text-red-400 whitespace-nowrap">완료</span>
                  </span>
                </button>
              )}
              {screen === 'edit' && <div className="w-14" aria-hidden="true" />}
            </div>
          </header>
        )}

        {/* Screen 1: Start */}
        {screen === 'start' && (
          <StartScreen
            sentenceCount={sentences.length}
            doneCount={doneCount}
            onStartPractice={() => navigateTo('list')}
            onOpenEdit={() => openEditFrom('start')}
          />
        )}

        {/* Shared Video Player across List, Practice, and Edit */}
        {showVideoShell && (
          <div className="px-4 pt-3">
            <YouTubeClipPlayer
              ref={playerRef}
              loopEnabled={loopEnabled}
              playbackRate={playbackRate}
              onPlayingChange={setIsPlaying}
              onLoopWaitingChange={setIsLoopWaiting}
              onTimeTick={(seconds) => {
                if (screen === 'edit') {
                  setLiveTimeSeconds(seconds);
                }
              }}
            />
          </div>
        )}

        {/* Screen 2: Sentence List */}
        {screen === 'list' && (
          <div className="px-4 flex-1">
            <SentenceListScreen
              sentences={sentences}
              progressMap={progressMap}
              hideText={listHideText}
              onToggleHideText={() => setListHideText((prev) => !prev)}
              onSelectSentence={(index) => {
                setCurrentIndex(index);
                navigateTo('practice');
              }}
              onOpenEdit={() => openEditFrom('list')}
            />
          </div>
        )}

        {/* Screen 3: Shadowing Practice */}
        {screen === 'practice' && (
          <div className="px-4 flex-1">
            <PracticeScreen
              sentences={sentences}
              currentIndex={currentIndex}
              progressMap={progressMap}
              recordingsMap={recordingsMap}
              playerRef={playerRef}
              isPlaying={isPlaying}
              isLoopWaiting={isLoopWaiting}
              loopEnabled={loopEnabled}
              playbackRate={playbackRate}
              onToggleLoop={() => setLoopEnabled((prev) => !prev)}
              onChangeRate={(rate) => {
                setPlaybackRate(rate);
                playerRef.current?.setPlaybackRate(rate);
              }}
              onSelectIndex={(index) => setCurrentIndex(index)}
              onFinishSession={() => navigateTo('finish')}
              onRecordPlay={handleRecordPlay}
              onSaveRecording={handleSaveRecording}
              onUpdateSelfCheck={handleUpdateSelfCheck}
              onOpenEdit={() => openEditFrom('practice')}
            />
          </div>
        )}

        {/* Screen 4: Edit Sentences */}
        {screen === 'edit' && (
          <div className="px-4 flex-1">
            <EditSentencesScreen
              sentences={sentences}
              playerRef={playerRef}
              playbackRate={playbackRate}
              liveTimeSeconds={liveTimeSeconds}
              onSaveSentences={handleSaveSentences}
            />
          </div>
        )}

        {/* Screen 5: Finish */}
        {screen === 'finish' && (
          <FinishScreen
            sentences={sentences}
            progressMap={progressMap}
            onPracticeAgain={(index) => {
              setCurrentIndex(index);
              navigateTo('practice');
            }}
            onGoToList={() => navigateTo('list')}
            onGoHome={() => navigateTo('start')}
          />
        )}
      </main>
    </div>
  );
}
