import React, { useEffect, useState } from 'react';
import { Clock, PlayCircle, CheckCircle2, Coffee, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppView, BlockType } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduleViewProps {
    onViewChange: (view: AppView) => void;
    setActiveBlockId: (id: string) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ onViewChange, setActiveBlockId }) => {
    const { schedule } = useApp();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    if (!schedule) return null;

    // Helper to check if a block is active/past/future
    const getBlockStatus = (start: string, end: string) => {
        const now = currentTime;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);

        const startDate = new Date(now); startDate.setHours(sH, sM, 0);
        const endDate = new Date(now); endDate.setHours(eH, eM, 0);

        if (now >= startDate && now < endDate) return 'active';
        if (now > endDate) return 'completed';
        return 'upcoming';
    };

    return (
        <div className="animate-fade-in-up pb-32">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 px-2">
                <div>
                    <h1 className="text-3xl font-heading font-thin text-brand-primary tracking-tight">Timeline</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Today's Flight Plan</p>
                </div>
                <button
                    onClick={() => onViewChange(AppView.Planning)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
                >
                    Replan
                </button>
            </header>

            {/* Timeline Container */}
            <div className="relative pl-4">
                {/* Continuous Vertical Line */}
                <div className="absolute left-[27px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

                <div className="space-y-8">
                    {schedule.blocks.map((block, index) => {
                        const status = getBlockStatus(block.startTime, block.endTime);
                        const isWork = block.type === BlockType.Work;

                        return (
                            <motion.div
                                key={block.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`relative pl-10 ${status === 'completed' ? 'opacity-60 grayscale-[0.5]' : 'opacity-100'}`}
                            >
                                {/* Timeline Node (The Bead) */}
                                <div className={`absolute left-[22px] top-6 -translate-x-1/2 z-10 
                                    w-3.5 h-3.5 rounded-full border-[3px] box-content
                                    ${status === 'active'
                                        ? 'bg-brand-primary border-white ring-4 ring-brand-primary/20 scale-125 transition-transform'
                                        : isWork ? 'bg-slate-300 border-white' : 'bg-green-300 border-white'}
                                `}>
                                    {status === 'active' && (
                                        <span className="absolute inset-0 rounded-full bg-brand-primary animate-ping opacity-75" />
                                    )}
                                </div>

                                {/* Content Card */}
                                <div className={`
                                    relative overflow-hidden rounded-[24px] border transition-all duration-300
                                    ${status === 'active'
                                        ? 'bg-white border-brand-accent/30 shadow-xl shadow-brand-primary/5 translate-x-1'
                                        : 'bg-white/60 border-white/40 shadow-sm hover:bg-white hover:shadow-md'}
                                `}>
                                    {/* Card Header & Time */}
                                    <div className="p-5 flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${status === 'active' ? 'text-brand-accent' : 'text-slate-400'}`}>
                                                    {block.startTime} - {block.endTime}
                                                </span>
                                                {status === 'active' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-brand-primary text-white uppercase">Now</span>
                                                )}
                                            </div>
                                            <h3 className={`text-lg font-heading font-light truncate ${status === 'active' ? 'text-brand-primary' : 'text-slate-700'}`}>
                                                {block.label}
                                            </h3>
                                        </div>

                                        {/* Icon Badge */}
                                        <div className={`
                                            p-2.5 rounded-xl shrink-0
                                            ${isWork
                                                ? (status === 'active' ? 'bg-brand-primary text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-50 text-indigo-400')
                                                : 'bg-emerald-50 text-emerald-500'}
                                        `}>
                                            {isWork ? <Briefcase size={18} /> : <Coffee size={18} />}
                                        </div>
                                    </div>

                                    {/* Card Footer / Details */}
                                    {block.taskIds.length > 0 && (
                                        <div className="px-5 pb-5 mt-[-4px]">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                <span>{block.taskIds.length} tasks scheduled</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button (Only visible if active or upcoming work) */}
                                    {status !== 'completed' && (
                                        <button
                                            onClick={() => setActiveBlockId(block.id)}
                                            className="absolute bottom-4 right-4 p-2 rounded-full bg-slate-900 text-white opacity-0 hover:opacity-100 transition-opacity"
                                            aria-label="Start Timer"
                                        >
                                            <PlayCircle size={20} />
                                        </button>
                                    )}

                                    {/* Active State full overlay button */}
                                    {status === 'active' && (
                                        <button
                                            onClick={() => setActiveBlockId(block.id)}
                                            className="absolute inset-0 w-full h-full z-10"
                                            aria-label="Enter Focus Mode"
                                        />
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* End Node */}
                <div className="absolute left-[27px] bottom-0 translate-y-1/2 w-2 h-2 rounded-full bg-slate-200" />
            </div>
        </div>
    );
};

export default ScheduleView;
