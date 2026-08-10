
'use client';
import { useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export default function AudioPlayer({ episode }: any) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  return (
    <div className="bg-background p-6 rounded-2xl border border-gray-800 shadow-xl">
      <audio ref={audioRef} src={episode.audioUrl} />
      <div className="flex items-center justify-center gap-8 mb-4">
        <button onClick={() => skip(-15)} className="text-gray-400 hover:text-accent p-3 rounded-full hover:bg-gray-800 transition" aria-label="15 ثانیه قبل">
          <SkipBack size={28} />
        </button>
        <button onClick={togglePlay} className="bg-accent text-white p-5 rounded-full hover:bg-purple-600 transition shadow-lg shadow-accent/30" aria-label={isPlaying ? "توقف" : "پخش"}>
          {isPlaying ? <Pause size={40} /> : <Play size={40} className="mr-[-2px]" />}
        </button>
        <button onClick={() => skip(15)} className="text-gray-400 hover:text-accent p-3 rounded-full hover:bg-gray-800 transition" aria-label="15 ثانیه بعد">
          <SkipForward size={28} />
        </button>
      </div>
      <div className="text-center">
        <p className="font-bold text-lg">{episode.title}</p>
        <p className="text-sm text-gray-500 mt-1">{Math.floor(episode.durationSeconds / 60)} دقیقه</p>
      </div>
    </div>
  );
}
