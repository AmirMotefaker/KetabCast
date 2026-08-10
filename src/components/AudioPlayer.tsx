"use client";
import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Gauge } from "lucide-react";

export const AudioPlayer = ({ audioUrl, title, author }: { audioUrl: string; title: string; author: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    return () => { audio.removeEventListener("timeupdate", updateTime); audio.removeEventListener("loadedmetadata", updateDuration); };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current; if (!audio) return;
    if (isPlaying) audio.pause(); else audio.play();
    setIsPlaying(!isPlaying);
  };

  const skip = (seconds: number) => { if (audioRef.current) audioRef.current.currentTime += seconds; };
  const formatTime = (time: number) => {
    const m = Math.floor(time / 60).toString().padStart(2, "0");
    const s = Math.floor(time % 60).toString().padStart(2, "0");
    return m + ":" + s;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) { audioRef.current.currentTime = newTime; setCurrentTime(newTime); }
  };

  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  return (
    <div className="glass rounded-2xl p-6 shadow-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div><h3 className="text-lg font-bold text-white">{title}</h3><p className="text-sm text-gray-400">{author}</p></div>
          <button onClick={changeSpeed} className="text-sm bg-white/10 px-3 py-1 rounded-lg hover:bg-violet-500 transition-colors flex items-center gap-1">
            <Gauge size={14} /> {playbackRate}x
          </button>
        </div>
        <input type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek} className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-violet-500" style={{ direction: "ltr" }} />
        <div className="flex justify-between text-xs text-gray-400 font-mono" style={{ direction: "ltr" }}>
          <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
        </div>
        <div className="flex items-center justify-center gap-8">
          <button onClick={() => skip(-15)} className="text-gray-300 hover:text-white transition-colors"><SkipForward size={24} /></button>
          <button onClick={togglePlayPause} className="bg-violet-500 hover:bg-violet-600 w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105">
            {isPlaying ? <Pause size={28} className="text-white" /> : <Play size={28} className="text-white mr-1" />}
          </button>
          <button onClick={() => skip(15)} className="text-gray-300 hover:text-white transition-colors"><SkipBack size={24} /></button>
        </div>
      </div>
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
    </div>
  );
};