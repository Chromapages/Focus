import React, { useState } from 'react';
import {
    Calendar, Clock, Zap, BrainCircuit, Sparkles, Volume2,
    CheckCircle, GripVertical, Loader2, Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, Priority, AppView } from '../../types';
import { generateDailySchedule, speakText, decodeAudioData, generateBriefingContent } from '../../services/geminiService';
import SwipeableTaskCard from './SwipeableTaskCard';
import Skeleton from '../../components/ui/Skeleton';

interface PlanningViewProps {
    onViewChange: (view: AppView) => void;
}

const PlanningView: React.FC<PlanningViewProps> = ({ onViewChange }) => {
    const { tasks, setTasks, appointments, setAppointments, partnerSchedule, setSchedule, addToast, isLoading } = useApp();

    // Local UI State
    const [startTime, setStartTime] = useState(() => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const mins = (Math.ceil(now.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0');
        return `${hours}:${mins}`;
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    const [currentTimeDisplay, setCurrentTimeDisplay] = useState(new Date().toLocaleTimeString());

    React.useEffect(() => {
        const clockInterval = setInterval(() => {
            setCurrentTimeDisplay(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
        }, 1000);
        return () => clearInterval(clockInterval);
    }, []);

    const speakSummary = async () => {
        try {
            // Upgrade: Generate dynamic content via AI
            const briefingText = await generateBriefingContent(tasks, appointments, "Eric");

            const audioBytes = await speakText(briefingText);
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start();
        } catch (e) {
            console.error("TTS Failed:", e);
            addToast('Briefing unavailable', 'error');
        }
    };

    const handleDragStart = (id: string) => setDraggedTaskId(id);
    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (draggedTaskId === id) return;
        const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
        const targetIndex = tasks.findIndex(t => t.id === id);
        if (draggedIndex === -1 || targetIndex === -1) return;
        const newTasks = [...tasks];
        const [removed] = newTasks.splice(draggedIndex, 1);
        newTasks.splice(targetIndex, 0, removed);
        setTasks(newTasks);
    };

    const renderTask = (task: Task) => (
        <SwipeableTaskCard
            key={task.id}
            task={task}
            onComplete={(id) => {
                const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
                setTasks(updatedTasks);
                if (!task.completed) {
                    addToast('Task completed! +50 XP', 'success');
                }
            }}
            onDelete={(id) => {
                setTasks(prev => prev.filter(t => t.id !== id));
                addToast('Task deleted', 'info');
            }}
            onUpdate={(updatedTask) => {
                setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
            }}
        />
    );

    return (
        <div className="animate-fade-in-up space-y-6">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-heading font-thin tracking-tight text-brand-primary">Workbench</h1>
                    <p className="text-slate-500 text-lg font-light">Visualize your goals, structure your focus.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-start px-5 py-3 rounded-2xl bg-[#fef9c3]/60 border border-[#fde047]/50 shadow-sm backdrop-blur-sm min-w-[120px]">
                        <span className="text-[9px] font-medium text-[#854d0e] uppercase tracking-widest leading-none">CURRENT TIME</span>
                        <span className="text-xl font-mono font-light text-[#713f12] mt-1 leading-none">{currentTimeDisplay}</span>
                    </div>

                    {/* Mobile Time Display (Simplified) */}
                    <div className="md:hidden flex items-center gap-1 px-3 py-2 bg-yellow-50 rounded-lg text-yellow-800 text-xs font-bold border border-yellow-200">
                        <Clock size={12} />
                        {currentTimeDisplay}
                    </div>

                    <button
                        onClick={speakSummary}
                        className="bg-[#c7d2fe]/60 hover:bg-[#c7d2fe] text-indigo-700 p-3 rounded-2xl border border-indigo-200/50 transition-all shadow-sm backdrop-blur-sm"
                        title="Daily Briefing"
                    >
                        <Volume2 size={24} />
                    </button>

                    <button
                        onClick={() => onViewChange(AppView.VoiceAssistant)}
                        className="bg-[#c7d2fe]/60 hover:bg-[#c7d2fe] text-indigo-700 p-3 rounded-2xl border border-indigo-200/50 transition-all flex items-center gap-2 font-bold shadow-sm backdrop-blur-sm"
                        title="AI Assistant"
                    >
                        <Sparkles size={24} />
                    </button>

                    <button
                        onClick={async () => {
                            setIsGenerating(true);
                            try {
                                const result = await generateDailySchedule(tasks.filter(t => t.isDueToday), partnerSchedule, startTime);
                                setSchedule(result);
                                onViewChange(AppView.Schedule);
                            } catch (e) {
                                console.error("Failed to generate schedule");
                            } finally {
                                setIsGenerating(false);
                            }
                        }}
                        disabled={isGenerating || tasks.filter(t => t.isDueToday).length === 0}
                        className="bg-[#c084fc]/60 hover:bg-[#c084fc] text-purple-800 p-3 px-6 rounded-2xl border border-purple-200/50 transition-all flex items-center gap-2 font-bold shadow-sm backdrop-blur-sm disabled:opacity-40"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
                        <span className="hidden md:inline font-light">Generate Schedule</span>
                    </button>
                </div>
            </header>

            {/* Start Time Config (Moved to top bar or dedicated area if needed, keeping simple for now) */}
            <div className="flex items-center gap-3 px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Start:</span>
                <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-light text-brand-text bg-white/50 outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32 md:pb-0">
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-light text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Zap size={14} className="fill-current" /> Due Today</span>
                                <span className="text-[11px] font-light bg-slate-100 text-slate-700 px-3 py-1 rounded-full">{tasks.filter(t => t.isDueToday).length}</span>
                            </h3>
                            {isLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                </div>
                            ) : tasks.filter(t => t.isDueToday).length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-3xl opacity-50">
                                    <CheckCircle size={32} className="mb-2" />
                                    <p className="text-xs font-bold uppercase tracking-wider">All Clear</p>
                                </div>
                            ) : (
                                <div className="space-y-4 min-h-[150px]">
                                    {tasks.filter(t => t.isDueToday).map(renderTask)}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Calendar size={14} /> Upcoming</span>
                                <span className="text-[11px] font-black bg-slate-100 text-slate-700 px-3 py-1 rounded-full">{tasks.filter(t => !t.isDueToday).length}</span>
                            </h3>
                            {tasks.filter(t => !t.isDueToday).length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-3xl opacity-50">
                                    <Calendar size={32} className="mb-2" />
                                    <p className="text-xs font-bold uppercase tracking-wider">No Upcoming Tasks</p>
                                </div>
                            ) : (
                                <div className="space-y-4 min-h-[150px]">
                                    {tasks.filter(t => !t.isDueToday).map(renderTask)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="glass-panel p-6 rounded-[32px] shadow-sm">
                        <h3 className="text-sm font-black text-brand-primary mb-6 flex items-center gap-2 uppercase tracking-[0.15em]">
                            <Calendar size={18} className="text-brand-accent" /> Appointments
                        </h3>
                        <div className="space-y-4">
                            {appointments.map(app => (
                                <div key={app.id} className="p-4 bg-slate-50 rounded-[20px] border border-slate-200 flex justify-between items-center group transition-all hover:shadow-lg hover:-translate-y-0.5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-2xl shadow-sm text-brand-accent"><Clock size={16} /></div>
                                        <div>
                                            <div className="text-sm font-light text-brand-text">{app.title}</div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{app.time} • {app.durationMinutes}m</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setAppointments(prev => prev.filter(a => a.id !== app.id))} className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all rounded-xl hover:bg-rose-50"><X size={16} /></button>
                                </div>
                            ))}
                            {appointments.length === 0 && (
                                <div className="text-center py-12 opacity-30 border-2 border-dashed border-slate-300 rounded-[24px]">
                                    <p className="text-[10px] font-light uppercase tracking-[0.25em]">No Events</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanningView;
