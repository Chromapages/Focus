import React from 'react';
import { LayoutDashboard, Calendar, Trophy, Settings, ChevronRight, User } from 'lucide-react';
import { AppView, UserProfile } from '../types';

interface DesktopSidebarProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
    userProfile: UserProfile;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ currentView, onViewChange, userProfile }) => {
    const navItems = [
        { id: AppView.Planning, label: 'Workbench', icon: LayoutDashboard },
        { id: AppView.Schedule, label: 'Timeline', icon: Calendar },
        { id: AppView.Rewards, label: 'Journey', icon: Trophy },
        { id: AppView.Settings, label: 'Settings', icon: Settings },
    ];

    return (
        <aside className="hidden md:flex w-72 flex-col bg-white/60 backdrop-blur-lg h-full p-8 border-r border-slate-200 shadow-sm z-30">
            <div className="flex items-center gap-4 mb-16 px-2">
                <div className="w-12 h-12 bg-brand-primary text-white rounded-[18px] flex items-center justify-center font-light text-2xl shadow-lg shadow-indigo-200 transform -rotate-3 transition-transform hover:rotate-0 cursor-default">
                    F
                </div>
                <div className="flex flex-col">
                    <span className="font-heading font-thin text-2xl text-slate-900 tracking-tighter leading-none">FOCUS</span>
                    <span className="text-[10px] font-light text-slate-400 tracking-[0.3em] mt-1.5">CORE</span>
                </div>
            </div>

            <nav className="flex-1 space-y-4">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`w-full flex items-center justify-between px-6 py-5 rounded-[22px] font-light text-[13px] uppercase tracking-[0.2em] transition-all group ${currentView === item.id
                            ? 'bg-brand-primary/5 text-brand-primary scale-[1.03] shadow-md border border-indigo-100'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <item.icon size={22} className={currentView === item.id ? 'text-brand-accent' : 'opacity-60'} />
                            {item.label}
                        </div>
                        <ChevronRight
                            size={16}
                            className={`transition-transform duration-300 ${currentView === item.id ? 'translate-x-0' : '-translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`}
                        />
                    </button>
                ))}
            </nav>

            <div className="mt-auto pt-8 border-t border-slate-200 space-y-4">
                <div className="flex items-center gap-4 px-4 py-5 rounded-[24px] bg-white border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-[18px] bg-slate-50 border-2 border-white flex items-center justify-center text-brand-accent font-light text-xl shadow-sm">
                        {userProfile.name?.charAt(0) || 'E'}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-light text-slate-900 truncate">{userProfile.name}</span>
                        <span className="text-[10px] font-light text-brand-accent uppercase tracking-[0.15em] mt-0.5">Level {userProfile.level}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default DesktopSidebar;
