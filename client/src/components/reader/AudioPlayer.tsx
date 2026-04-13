import { useState, useRef, useEffect, useCallback } from "react";

interface AudioPlayerProps {
  src: string;
}

const SKIP_OPTIONS = [3, 5, 10, 15, 30];

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1);
  const [skipAmount, setSkipAmount] = useState(5);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  }, []);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
  }, []);

  const adjustSpeed = useCallback((delta: number) => {
    setSpeed((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      const clamped = Math.max(0.3, Math.min(3.0, next));
      if (audioRef.current) audioRef.current.playbackRate = clamped;
      return clamped;
    });
  }, []);


  const handleSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const audioSrc = src;

  const iconBtn =
    "w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0";
  const smallBtn =
    "w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0 text-sm font-bold";

  const player = (
    <div
      ref={playerRef}
      className={
        pinned
          ? "fixed bottom-0 left-0 right-0 z-50 bg-gray-50 border-t border-gray-200 px-4 py-3 shadow-lg"
          : "bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4"
      }
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        onError={() => {}}
      />

      {/* Row 1: Play/Pause | Seek bar with times | Volume + Pin toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
          title={playing ? "Pause (Space)" : "Play (Space)"}
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <span className="text-xs text-gray-500 w-10 text-right shrink-0">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeekBar}
          className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
          title="Seek (Left/Right arrows)"
        />

        <span className="text-xs text-gray-500 w-10 shrink-0">
          {formatTime(duration)}
        </span>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolume}
          className="w-16 h-1.5 accent-blue-600 cursor-pointer shrink-0"
          title="Volume"
        />

        <button
          onClick={() => setPinned((p) => !p)}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors shrink-0 ${
            pinned
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
          }`}
          title={pinned ? "Unpin from bottom" : "Pin to bottom"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            {pinned ? (
              // Pin filled — pinned to bottom
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
            ) : (
              // Arrows up-down — toggle position
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
            )}
          </svg>
        </button>
      </div>

      {/* Row 2: Skip controls | Skip dropdown | Rate controls */}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          {/* Restart */}
          <button onClick={restart} className={iconBtn} title="Restart">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="3" height="16" />
              <polygon points="20,4 9,12 20,20" />
            </svg>
          </button>

          {/* Rewind */}
          <button onClick={() => seek(-skipAmount)} className={iconBtn} title={`Rewind ${skipAmount}s (←)`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="12,4 2,12 12,20" />
              <polygon points="22,4 12,12 22,20" />
            </svg>
          </button>

          {/* Forward */}
          <button onClick={() => seek(skipAmount)} className={iconBtn} title={`Forward ${skipAmount}s (→)`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="2,4 12,12 2,20" />
              <polygon points="12,4 22,12 12,20" />
            </svg>
          </button>
        </div>

        {/* Skip amount dropdown */}
        <select
          value={skipAmount}
          onChange={(e) => setSkipAmount(Number(e.target.value))}
          className="text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 rounded px-2 py-1 transition-colors cursor-pointer border-none"
          title="Skip amount"
        >
          {SKIP_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s} sec
            </option>
          ))}
        </select>

        {/* Playback rate controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => adjustSpeed(-0.1)}
            className={smallBtn}
            title="Decrease speed"
          >
            −
          </button>
          <span className="text-xs font-medium text-gray-600 w-8 text-center">
            {speed.toFixed(1)}
          </span>
          <button
            onClick={() => adjustSpeed(0.1)}
            className={smallBtn}
            title="Increase speed"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {pinned && <div className="mb-4" style={{ height: playerRef.current?.offsetHeight ?? 80 }} />}
      {player}
    </>
  );
}
