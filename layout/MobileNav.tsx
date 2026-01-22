import React from 'react';
import { LayoutDashboard, Calendar, Trophy, Settings, Plus } from 'lucide-react';
import { AppView } from '../types';

interface MobileNavProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
    onAddTask: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentView, onViewChange, onAddTask }) => {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-40 pb-safe">
            <div className="flex justify-between items-center px-6 h-16 relative">
                <button
                    onClick={() => onViewChange(AppView.Planning)}
                    className={`flex flex-col items-center gap-1 w-16 ${currentView === AppView.Planning ? 'text-brand-primary' : 'text-slate-400'}`}
                >
                    <LayoutDashboard size={24} strokeWidth={currentView === AppView.Planning ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Home</span>
                </button>

                <button
                    onClick={() => onViewChange(AppView.Schedule)}
                    className={`flex flex-col items-center gap-1 w-16 ${currentView === AppView.Schedule ? 'text-brand-primary' : 'text-slate-400'}`}
                >
                    <Calendar size={24} strokeWidth={currentView === AppView.Schedule ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Plan</span>
                </button>

                {/* FAB Container */}
                <div className="relative -top-6">
                    <button
                        onClick={onAddTask}
                        aria-label="Create new task"
                        className="w-14 h-14 bg-brand-primary text-white rounded-full shadow-xl shadow-brand-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-4 border-slate-50"
                    >
                        <Plus size={32} />
                    </button>
                </div>

                <button
                    onClick={() => onViewChange(AppView.Rewards)}
                    className={`flex flex-col items-center gap-1 w-16 ${currentView === AppView.Rewards ? 'text-brand-primary' : 'text-slate-400'}`}
                >
                    <Trophy size={24} strokeWidth={currentView === AppView.Rewards ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Journey</span>
                </button>

                <button
                    onClick={() => onViewChange(AppView.Settings)}
                    className={`flex flex-col items-center gap-1 w-16 ${currentView === AppView.Settings ? 'text-brand-primary' : 'text-slate-400'}`}
                >
                    <Settings size={24} strokeWidth={currentView === AppView.Settings ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Settings</span>
                </button>
            </div>
        </nav>
    );
};

export default MobileNav;
