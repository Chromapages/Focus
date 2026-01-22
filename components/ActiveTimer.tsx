
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
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 ${block.type === BlockType.Work ? 'bg-indigo-500' : 'bg-green-500'} animate-pulse`}></div>
      </div>

      <div className="absolute top-6 right-6">
        <button onClick={onCancel} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X size={24} />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center animate-fade-in-up">
        <div className={`mb-8 p-6 rounded-3xl shadow-2xl backdrop-blur-md border border-white/10 ${block.type === BlockType.Work ? 'bg-indigo-600/30 text-indigo-300' : 'bg-green-600/30 text-green-300'}`}>
          {block.type === BlockType.Work ? <Briefcase size={48} /> : <Coffee size={48} />}
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-2 text-center tracking-tight">{block.label}</h2>
        <p className="text-slate-400 mb-2 text-center uppercase tracking-widest text-[10px] font-bold">
          {block.type === BlockType.Work ? 'Focus Mode Engaged' : 'Recharge Time'}
        </p>
        <div className="text-[10px] text-slate-500 font-mono mb-12">
           Actual Start: {actualStartTime ? new Date(actualStartTime).toLocaleTimeString() : 'N/A'}
        </div>

        <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mb-12">
          <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="3" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={block.type === BlockType.Work ? '#6366f1' : '#22c55e'} 
              strokeWidth="3" strokeDasharray="283" strokeDashoffset={283 - (283 * progress / 100)}
              strokeLinecap="round" className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="text-6xl md:text-7xl font-mono font-bold tracking-tighter drop-shadow-lg">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          {!isFinished ? (
            <>
              <div className="flex gap-4">
                <button 
                  onClick={toggleTimer}
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur border border-white/5 transition-all font-semibold active:scale-95"
                >
                  {isActive ? <Pause size={20} /> : <Play size={20} />}
                  {isActive ? 'Pause' : 'Resume'}
                </button>
              </div>
              <button 
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium border border-transparent hover:border-white/10"
              >
                <CheckCircle size={18} /> Finish Early & Collect XP
              </button>
            </>
          ) : (
            <div className="animate-bounce w-full">
              <button 
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/30 text-white font-bold text-lg transition-all transform hover:scale-105"
              >
                <CheckCircle size={24} />
                Complete Block
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveTimer;
