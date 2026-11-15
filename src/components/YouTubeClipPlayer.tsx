import { ExternalLink, PlaySquare } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { MOVIE_SETTINGS, ONE_LINE_CREDIT } from '../constants/movieConfig';
import { PlaybackRate } from '../types';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
    __ytApiCallbacks?: Array<() => void>;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
}

export interface PlaySegmentOptions {
  start: number;
  end: number;
  rate: PlaybackRate;
  allowLoop: boolean;
  onSegmentEnd?: () => void;
  onLoopReplay?: () => void;
}

export interface YouTubeClipPlayerHandle {
  playSegment: (options: PlaySegmentOptions) => void;
  stopPlayback: () => void;
  cancelLoopWait: () => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  getCurrentTime: () => number;
  isEmbedFailed: () => boolean;
}

interface YouTubeClipPlayerProps {
  loopEnabled: boolean;
  playbackRate: PlaybackRate;
  onPlayingChange?: (playing: boolean) => void;
  onLoopWaitingChange?: (waiting: boolean) => void;
  onTimeTick?: (seconds: number) => void;
  onEmbedErrorChange?: (failed: boolean) => void;
}

function loadYouTubeIframeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    if (!window.__ytApiCallbacks) {
      window.__ytApiCallbacks = [];
    }
    window.__ytApiCallbacks.push(resolve);

    if (!document.getElementById('youtube-iframe-api-script')) {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        const cbs = window.__ytApiCallbacks ?? [];
        window.__ytApiCallbacks = [];
        cbs.forEach((cb) => cb());
      };

      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
}

interface ActiveSegment {
  start: number;
  end: number;
  rate: PlaybackRate;
  allowLoop: boolean;
  seekAt: number;
  settled: boolean;
  onSegmentEnd?: () => void;
  onLoopReplay?: () => void;
}

export const YouTubeClipPlayer = forwardRef<YouTubeClipPlayerHandle, YouTubeClipPlayerProps>(
  function YouTubeClipPlayer(
    {
      loopEnabled,
      playbackRate,
      onPlayingChange,
      onLoopWaitingChange,
      onTimeTick,
      onEmbedErrorChange,
    },
    ref
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YTPlayerInstance | null>(null);
    const readyRef = useRef(false);
    const activeSegmentRef = useRef<ActiveSegment | null>(null);
    const loopTimerRef = useRef<number | null>(null);
    const fallbackTimerRef = useRef<number | null>(null);
    const loopEnabledRef = useRef(loopEnabled);
    const playbackRateRef = useRef(playbackRate);

    const onPlayingChangeRef = useRef(onPlayingChange);
    const onLoopWaitingChangeRef = useRef(onLoopWaitingChange);
    const onTimeTickRef = useRef(onTimeTick);
    const onEmbedErrorChangeRef = useRef(onEmbedErrorChange);

    useEffect(() => {
      onPlayingChangeRef.current = onPlayingChange;
      onLoopWaitingChangeRef.current = onLoopWaitingChange;
      onTimeTickRef.current = onTimeTick;
      onEmbedErrorChangeRef.current = onEmbedErrorChange;
    });

    const [embedFailed, setEmbedFailed] = useState(false);
    const embedFailedRef = useRef(false);
    const [playerReady, setPlayerReady] = useState(false);

    useEffect(() => {
      loopEnabledRef.current = loopEnabled;
      if (!loopEnabled && loopTimerRef.current !== null) {
        window.clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
        onLoopWaitingChange?.(false);
      }
    }, [loopEnabled, onLoopWaitingChange]);

    useEffect(() => {
      playbackRateRef.current = playbackRate;
      if (playerRef.current && readyRef.current) {
        try {
          playerRef.current.setPlaybackRate(playbackRate);
        } catch {
          // Ignore if player is not yet active
        }
      }
    }, [playbackRate]);

    const clearTimers = () => {
      if (loopTimerRef.current !== null) {
        window.clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      onLoopWaitingChange?.(false);
    };

    const startSegmentPlayback = (options: PlaySegmentOptions) => {
      clearTimers();

      const seg: ActiveSegment = {
        start: options.start,
        end: options.end,
        rate: options.rate,
        allowLoop: options.allowLoop,
        seekAt: Date.now(),
        settled: false,
        onSegmentEnd: options.onSegmentEnd,
        onLoopReplay: options.onLoopReplay,
      };
      activeSegmentRef.current = seg;

      // Fallback timer when embed fails so Recording & Practice still function smoothly
      if (embedFailedRef.current || !playerRef.current || !readyRef.current) {
        onPlayingChangeRef.current?.(true);
        const durationMs = Math.max(400, ((options.end - options.start) / options.rate) * 1000);
        fallbackTimerRef.current = window.setTimeout(() => {
          activeSegmentRef.current = null;
          onPlayingChangeRef.current?.(false);
          options.onSegmentEnd?.();
          if (options.allowLoop && loopEnabledRef.current) {
            onLoopWaitingChangeRef.current?.(true);
            loopTimerRef.current = window.setTimeout(() => {
              onLoopWaitingChangeRef.current?.(false);
              if (loopEnabledRef.current) {
                options.onLoopReplay?.();
                startSegmentPlayback({
                  ...options,
                  rate: playbackRateRef.current,
                });
              }
            }, 1500);
          }
        }, durationMs);
        return;
      }

      try {
        playerRef.current.setPlaybackRate(options.rate);
        playerRef.current.seekTo(options.start, true);
        playerRef.current.playVideo();
        onPlayingChangeRef.current?.(true);
      } catch {
        onPlayingChangeRef.current?.(false);
      }
    };

    useImperativeHandle(ref, () => ({
      playSegment: (options: PlaySegmentOptions) => {
        startSegmentPlayback(options);
      },
      stopPlayback: () => {
        clearTimers();
        activeSegmentRef.current = null;
        onPlayingChange?.(false);
        if (playerRef.current && readyRef.current) {
          try {
            playerRef.current.pauseVideo();
          } catch {
            // ignore
          }
        }
      },
      cancelLoopWait: () => {
        clearTimers();
      },
      setPlaybackRate: (rate: PlaybackRate) => {
        playbackRateRef.current = rate;
        if (playerRef.current && readyRef.current) {
          try {
            playerRef.current.setPlaybackRate(rate);
          } catch {
            // ignore
          }
        }
      },
      getCurrentTime: () => {
        if (playerRef.current && readyRef.current) {
          try {
            return playerRef.current.getCurrentTime() || 0;
          } catch {
            return 0;
          }
        }
        return 0;
      },
      isEmbedFailed: () => embedFailedRef.current,
    }));

    useEffect(() => {
      let destroyed = false;

      loadYouTubeIframeAPI().then(() => {
        if (destroyed || !mountRef.current || !window.YT?.Player) return;

        // Clear any existing node inside mountRef
        mountRef.current.innerHTML = '';
        const playerNode = document.createElement('div');
        mountRef.current.appendChild(playerNode);

        playerRef.current = new window.YT.Player(playerNode, {
          videoId: MOVIE_SETTINGS.videoId,
          playerVars: {
            start: MOVIE_SETTINGS.practiceStart,
            end: MOVIE_SETTINGS.practiceEnd,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            cc_load_policy: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (destroyed) return;
              readyRef.current = true;
              setPlayerReady(true);
              try {
                event.target.setPlaybackRate(playbackRateRef.current);
              } catch {
                // ignore
              }
            },
            onStateChange: (event) => {
              if (destroyed) return;
              const YTState = window.YT?.PlayerState;
              const PLAYING = YTState?.PLAYING ?? 1;
              const PAUSED = YTState?.PAUSED ?? 2;
              const ENDED = YTState?.ENDED ?? 0;

              if (event.data === PLAYING) {
                onPlayingChangeRef.current?.(true);
              } else if (event.data === PAUSED || event.data === ENDED) {
                onPlayingChangeRef.current?.(false);
              }

              // Handle natural end if active segment reaches clip boundary
              if (event.data === ENDED && activeSegmentRef.current) {
                const finished = activeSegmentRef.current;
                activeSegmentRef.current = null;
                finished.onSegmentEnd?.();
                if (finished.allowLoop && loopEnabledRef.current) {
                  onLoopWaitingChangeRef.current?.(true);
                  loopTimerRef.current = window.setTimeout(() => {
                    onLoopWaitingChangeRef.current?.(false);
                    if (loopEnabledRef.current) {
                      finished.onLoopReplay?.();
                      startSegmentPlayback({
                        ...finished,
                        rate: playbackRateRef.current,
                      });
                    }
                  }, 1500);
                }
              }
            },
            onError: (event) => {
              if (destroyed) return;
              // 101 / 150 indicate owner disabled embedding; also cover 100 / 5 / 2
              if ([101, 150, 100, 5, 2].includes(event.data)) {
                embedFailedRef.current = true;
                setEmbedFailed(true);
                onEmbedErrorChangeRef.current?.(true);
              }
            },
          },
        });
      });

      const pollId = window.setInterval(() => {
        if (destroyed || !playerRef.current || !readyRef.current) return;
        let currentTime = 0;
        let state = -1;
        try {
          currentTime = playerRef.current.getCurrentTime();
          state = playerRef.current.getPlayerState();
        } catch {
          return;
        }

        if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
          onTimeTickRef.current?.(currentTime);
        }

        const seg = activeSegmentRef.current;
        const PLAYING = window.YT?.PlayerState?.PLAYING ?? 1;

        if (seg) {
          if (!seg.settled) {
            const nearStart =
              currentTime >= seg.start - 0.5 && currentTime < seg.end - 0.04;
            const timedOut = Date.now() - seg.seekAt > 650;
            if (nearStart || timedOut) {
              seg.settled = true;
            }
          }

          if (seg.settled && currentTime >= seg.end - 0.03) {
            activeSegmentRef.current = null;
            try {
              playerRef.current.pauseVideo();
            } catch {
              // ignore
            }
            onPlayingChangeRef.current?.(false);
            seg.onSegmentEnd?.();

            if (seg.allowLoop && loopEnabledRef.current) {
              onLoopWaitingChangeRef.current?.(true);
              loopTimerRef.current = window.setTimeout(() => {
                onLoopWaitingChangeRef.current?.(false);
                if (loopEnabledRef.current) {
                  seg.onLoopReplay?.();
                  startSegmentPlayback({
                    ...seg,
                    rate: playbackRateRef.current,
                  });
                }
              }, 1500);
            }
          }
        } else if (state === PLAYING) {
          // Enforce overall practice range [START, END] even during manual control scrubbing
          if (currentTime < MOVIE_SETTINGS.practiceStart - 0.5) {
            try {
              playerRef.current.seekTo(MOVIE_SETTINGS.practiceStart, true);
            } catch {
              // ignore
            }
          } else if (currentTime >= MOVIE_SETTINGS.practiceEnd) {
            try {
              playerRef.current.pauseVideo();
              playerRef.current.seekTo(MOVIE_SETTINGS.practiceStart, false);
            } catch {
              // ignore
            }
            onPlayingChangeRef.current?.(false);
          }
        }
      }, 100);

      return () => {
        destroyed = true;
        window.clearInterval(pollId);
        clearTimers();
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {
            // ignore
          }
          playerRef.current = null;
        }
        readyRef.current = false;
      };
    }, []);

    const fallbackYouTubeUrl = `${MOVIE_SETTINGS.youtubeUrl}&t=${MOVIE_SETTINGS.practiceStart}s`;

    return (
      <div className="w-full">
        <div className="relative w-full aspect-video bg-slate-900 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          {embedFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-slate-900 text-white">
              <PlaySquare className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-[17px] font-semibold leading-snug max-w-xs mb-4">
                This video can&apos;t play inside the app. Tap to open it on YouTube.
              </p>
              <a
                href={fallbackYouTubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl bg-[#C81E32] hover:bg-[#A91729] text-white font-semibold text-base transition-colors"
              >
                <span>Open on YouTube</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            </div>
          ) : (
            <>
              <div
                ref={mountRef}
                className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
              />
              {!playerReady && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/75 text-white text-sm font-medium">
                  Loading scene clip...
                </div>
              )}
            </>
          )}
        </div>
        <p className="mt-2 text-[13px] leading-snug text-slate-500">
          {ONE_LINE_CREDIT}
        </p>
      </div>
    );
  }
);
