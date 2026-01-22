import React, { useState } from 'react';
import BottomSheet from '../../components/ui/BottomSheet';
import { Task, Priority } from '../../types';
import { Clock, Flag, Zap, Calendar } from 'lucide-react';

interface AddTaskSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTask: (task: Omit<Task, 'id' | 'completed'>) => void;
}

const AddTaskSheet: React.FC<AddTaskSheetProps> = ({ isOpen, onClose, onAddTask }) => {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.Medium);
    const [duration, setDuration] = useState(30);
    const [isDueToday, setIsDueToday] = useState(true);

    const handleSubmit = () => {
        if (!title.trim()) return;

        onAddTask({
            title: title.trim(),
            priority,
            estimatedMinutes: duration,
            isDueToday,
        });

        // Reset and close
        setTitle('');
        setPriority(Priority.Medium);
        setDuration(30);
        onClose();
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="New Task">
            <div className="space-y-6">
                {/* Title Input */}
                <div>
                    <input
                        autoFocus
                        type="text"
                        placeholder="What needs to be done?"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        className="w-full text-xl font-medium placeholder:text-slate-300 border-none outline-none bg-transparent p-0"
                    />
                </div>

                {/* Priority Selector */}
                <div className="space-y-3">
                    <label className="text-xs font-light text-slate-400 uppercase tracking-widest">Priority</label>
                    <div className="flex gap-3">
                        {(Object.values(Priority) as Priority[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPriority(p)}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${priority === p
                                    ? p === Priority.High ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm'
                                        : p === Priority.Medium ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm'
                                            : 'bg-sky-50 border-sky-200 text-sky-600 shadow-sm'
                                    : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                <Flag size={16} className={priority === p ? 'fill-current' : ''} />
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration Selector */}
                <div className="space-y-3">
                    <label className="text-xs font-light text-slate-400 uppercase tracking-widest">Duration</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {[15, 30, 45, 60, 90, 120].map((m) => (
                            <button
                                key={m}
                                onClick={() => setDuration(m)}
                                className={`flex-none px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${duration === m
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                                    : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {m}m
                            </button>
                        ))}
                    </div>
                </div>

                {/* Due Date Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDueToday ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                            {isDueToday ? <Zap size={20} className="fill-current" /> : <Calendar size={20} />}
                        </div>
                        <div>
                            <div className="text-sm font-light text-slate-700">{isDueToday ? 'Do Today' : 'Schedule for Later'}</div>
                            <div className="text-xs text-slate-400 font-light">Add to today's focus list</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsDueToday(!isDueToday)}
                        className={`w-12 h-7 rounded-full transition-colors relative ${isDueToday ? 'bg-brand-primary' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isDueToday ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                {/* Action Buttons */}
                <button
                    onClick={handleSubmit}
                    disabled={!title.trim()}
                    className="w-full py-4 bg-brand-primary text-white text-lg font-bold rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                >
                    Create Task
                </button>
            </div>
        </BottomSheet>
    );
};

export default AddTaskSheet;
