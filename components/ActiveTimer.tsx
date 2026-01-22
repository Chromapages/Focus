
import React, { useState, useEffect, useRef } from 'react';
import { ScheduleBlock, BlockType } from '../types';
import { Play, Pause, CheckCircle, Coffee, Briefcase, X } from 'lucide-react';

interface ActiveTimerProps {
  block: ScheduleBlock;
  soundEnabled: boolean;
  onComplete: (actualStartTime: string, actualEndTime: string) => void;
  onCancel: () => void;
}

const ActiveTimer: React.FC<ActiveTimerProps> = ({ block, soundEnabled, onComplete, onCancel }) => {
  // Timing tracking
  const [actualStartTime, setActualStartTime] = useState<string | null>(block.actualStartTime || null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(block.durationMinutes * 60);
  const [isActive, setIsActive] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    audioRef.current.volume = 0.5;

    // Set actual start time on first mount if not already set
    if (!block.actualStartTime) {
      setActualStartTime(new Date().toISOString());
    }
  }, []);

  // Initialize Timer Logic
  useEffect(() => {
    const savedData = localStorage.getItem(`timer-${block.id}`);

    if (savedData) {
      const { targetTime, isPaused, pausedTimeLeft, storedActualStart } = JSON.parse(savedData);
      if (storedActualStart) setActualStartTime(storedActualStart);

      if (isPaused) {
        setIsActive(false);
        setTimeLeft(pausedTimeLeft);
        setEndTime(Date.now() + pausedTimeLeft * 1000);
      } else {
        const now = Date.now();
        if (targetTime > now) {
          setEndTime(targetTime);
          setTimeLeft(Math.ceil((targetTime - now) / 1000));
        } else {
          setTimeLeft(0);
          setIsFinished(true);
          setIsActive(false);
        }
      }
    } else {
      const target = Date.now() + block.durationMinutes * 60 * 1000;
      setEndTime(target);
      const startIso = new Date().toISOString();
      setActualStartTime(startIso);
      localStorage.setItem(`timer-${block.id}`, JSON.stringify({
        targetTime: target,
        isPaused: false,
        pausedTimeLeft: block.durationMinutes * 60,
        storedActualStart: startIso
      }));
    }
  }, [block.id, block.durationMinutes]);

  // Tick Logic
  useEffect(() => {
    let interval: any = null;

    if (isActive && !isFinished && endTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((endTime - now) / 1000);

        if (remaining <= 0) {
          setTimeLeft(0);
          setIsFinished(true);
          setIsActive(false);

          if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed", e));
          }

          localStorage.removeItem(`timer-${block.id}`);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, isFinished, endTime, block.id, soundEnabled]);

  const toggleTimer = () => {
    if (isActive) {
      setIsActive(false);
      localStorage.setItem(`timer-${block.id}`, JSON.stringify({
        targetTime: 0,
        isPaused: true,
        pausedTimeLeft: timeLeft,
        storedActualStart: actualStartTime
      }));
    } else {
      const newTarget = Date.now() + timeLeft * 1000;
      setEndTime(newTarget);
      setIsActive(true);
      localStorage.setItem(`timer-${block.id}`, JSON.stringify({
        targetTime: newTarget,
        isPaused: false,
        pausedTimeLeft: timeLeft,
        storedActualStart: actualStartTime
      }));
    }
  };

  const handleFinish = () => {
    localStorage.removeItem(`timer-${block.id}`);
    if (soundEnabled && audioRef.current && !isFinished) {
      audioRef.current.play().catch(e => console.log("Audio play failed", e));
    }
    onComplete(actualStartTime!, new Date().toISOString());
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalSeconds = block.durationMinutes * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-brand-ink flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-30 ${block.type === BlockType.Work ? 'bg-brand-primary' : 'bg-emerald-600'} animate-pulse duration-3000`}></div>
      </div>

      <div className="absolute top-8 right-8 z-50">
        <button
          onClick={onCancel}
          className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md active:scale-90"
        >
          <X size={28} />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center animate-fade-in-up flex-1 justify-center">
        <div className={`mb-8 p-6 rounded-[32px] shadow-2xl backdrop-blur-md border border-white/10 ${block.type === BlockType.Work ? 'bg-brand-primary/40 text-indigo-200' : 'bg-emerald-600/40 text-emerald-100'}`}>
          {block.type === BlockType.Work ? <Briefcase size={40} /> : <Coffee size={40} />}
        </div>

        <h2 className="text-3xl font-heading font-thin mb-2 text-center tracking-tight leading-tight px-4">{block.label}</h2>
        <p className="text-slate-400 mb-12 text-center uppercase tracking-[0.2em] text-xs font-bold">
          {block.type === BlockType.Work ? 'Deep Focus Session' : 'Recovery Break'}
        </p>

        {/* Timer Display */}
        <div className="relative w-80 h-80 flex items-center justify-center mb-16">
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
            {/* Track */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            {/* Indicator */}
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={block.type === BlockType.Work ? '#6366f1' : '#10b981'}
              strokeWidth="4"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progress / 100)}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            />
          </svg>

          <div className="flex flex-col items-center">
            <div className="text-7xl font-mono font-light tracking-tighter drop-shadow-lg tabular-nums">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm font-bold text-slate-400 mt-2 opacity-60">
              Started {actualStartTime ? new Date(actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5 w-full max-w-xs px-4">
          {!isFinished ? (
            <>
              <button
                onClick={toggleTimer}
                className="w-full flex items-center justify-center gap-3 h-16 rounded-2xl bg-white text-brand-ink hover:bg-slate-100 transition-all font-bold text-lg shadow-lg active:scale-[0.98]"
              >
                {isActive ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
                {isActive ? 'Pause Timer' : 'Resume Timer'}
              </button>

              <button
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold tracking-wide"
              >
                <CheckCircle size={20} /> End Session Early
              </button>
            </>
          ) : (
            <div className="animate-bounce w-full">
              <button
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-3 h-20 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/30 text-white font-heading font-thin text-xl transition-all transform hover:scale-105"
              >
                <CheckCircle size={28} />
                Complete Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveTimer;
