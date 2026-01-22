import React, { useRef, useState } from 'react';
import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { CheckCircle, Trash2, Clock, Calendar, Zap, AlertCircle } from 'lucide-react';
import { Task, Priority } from '../../types';
import { useHaptic } from '../../hooks/useHaptic';

interface SwipeableTaskCardProps {
    task: Task;
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
    onUpdate: (task: Task) => void;
}

const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({ task, onComplete, onDelete, onUpdate }) => {
    const controls = useAnimation();
    const x = useMotionValue(0);
    const [isDragged, setIsDragged] = useState(false);

    // Transform background colors/icons based on gesture position
    const bgOpacity = useTransform(x, [-100, 0, 100], [1, 0, 1]);
    const bgColor = useTransform(x, [-100, 0, 100], ['rgba(239, 68, 68, 1)', 'rgba(255, 255, 255, 0)', 'rgba(34, 197, 94, 1)']);

    const { trigger } = useHaptic();

    const handleDragEnd = async (_: any, info: PanInfo) => {
        setIsDragged(false);
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset > 100 || velocity > 500) {
            // Swipe Right - Complete
            trigger('success'); // Haptic feedback
            await controls.start({ x: 500, opacity: 0 });
            onComplete(task.id);
        } else if (offset < -100 || velocity < -500) {
            // Swipe Left - Delete
            trigger('warning'); // Haptic feedback
            await controls.start({ x: -500, opacity: 0 });
            onDelete(task.id);
        } else {
            // Snap back
            controls.start({ x: 0 });
        }
    };

    const getPriorityColor = (p: Priority) => {
        switch (p) {
            case Priority.High: return 'bg-rose-100 text-rose-700 border-rose-200';
            case Priority.Medium: return 'bg-amber-100 text-amber-700 border-amber-200';
            case Priority.Low: return 'bg-sky-100 text-sky-700 border-sky-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="relative w-full h-full mb-4 touch-pan-y group">
            {/* Background layer for swipe actions */}
            <motion.div
                className="absolute inset-0 rounded-2xl flex items-center justify-between px-6"
                style={{ backgroundColor: bgColor, opacity: bgOpacity }}
            >
                <div className="flex items-center gap-2 text-white font-bold">
                    <CheckCircle size={24} />
                    <span>Complete</span>
                </div>
                <div className="flex items-center gap-2 text-white font-bold">
                    <span>Delete</span>
                    <Trash2 size={24} />
                </div>
            </motion.div>

            {/* Foreground Card */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1} // Resistance feel
                onDragStart={() => setIsDragged(true)}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x, touchAction: 'pan-y' }}
                className={`relative bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform ${task.completed ? 'opacity-50 grayscale' : ''}`}
            >
                {/* Status/Icon */}
                <button
                    onClick={() => onComplete(task.id)}
                    className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400'
                        }`}
                >
                    <CheckCircle size={24} className={task.completed ? 'fill-current' : ''} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 pointer-events-none select-none">
                    <h3 className={`font-bold text-slate-900 truncate ${task.completed ? 'line-through text-slate-500' : ''}`}>{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <Clock size={12} />
                            {task.estimatedMinutes}m
                        </div>
                        {task.isDueToday && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                                <Zap size={12} className="fill-current" />
                                Today
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions (only visible when not dragging) */}
                {!isDragged && !task.completed && (
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdate({ ...task, isDueToday: !task.isDueToday });
                            }}
                            className={`p-2 rounded-lg transition-colors ${task.isDueToday ? 'text-brand-primary bg-indigo-50' : 'text-slate-300 hover:bg-slate-50'}`}
                        >
                            {task.isDueToday ? <Zap size={18} className="fill-current" /> : <Calendar size={18} />}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task.id);
                            }}
                            className="p-2 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default SwipeableTaskCard;
