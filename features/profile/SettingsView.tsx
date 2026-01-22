import React from 'react';
import { User, Key, Palette, Database, Shield, Volume2, VolumeX, Lock, RotateCcw, Trophy } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { THEMES } from '../../types';

const SettingsView: React.FC = () => {
    const { userProfile, setUserProfile, theme, setThemeId, userId } = useApp();
    // We can add soundEnabled to context if needed globally, for now local mock or ignored
    const [soundEnabled, setSoundEnabled] = React.useState(true);

    const resetAllData = () => {
        if (confirm("Are you sure? This will delete all tasks, schedule, and progress.")) {
            localStorage.removeItem('focus_forge_user_id');
            window.location.reload();
        }
    };

    return (
        <div className="animate-fade-in-up max-w-2xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-heading font-thin tracking-tight text-brand-primary">System Settings</h1>
                <p className="text-slate-500 font-light">Manage your profile, data, and appearance.</p>
            </header>

            <div className="space-y-6">
                <section className="glass-panel p-8 rounded-[32px] shadow-sm">
                    <h3 className="text-lg font-bold text-brand-text mb-6 flex items-center gap-2"><User size={20} /> User Profile</h3>
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-light text-slate-400 uppercase tracking-widest block mb-2.5">Display Name</label>
                            <input
                                type="text"
                                value={userProfile.name}
                                onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-5 py-4.5 rounded-2xl border border-slate-200 bg-white/50 text-brand-text outline-none focus:ring-2 focus:ring-brand-primary/20 font-light"
                            />
                        </div>
                        <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="p-3.5 bg-white rounded-2xl shadow-sm text-brand-accent"><Trophy size={24} /></div>
                                <div>
                                    <div className="font-light text-brand-text text-base">Focus ID</div>
                                    <div className="text-[11px] font-mono font-light text-slate-400 break-all max-w-[180px] mt-1">{userId}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-light text-brand-text">Lvl {userProfile.level}</div>
                                <div className="text-xs font-light text-slate-400 uppercase tracking-widest mt-1">{userProfile.xp} XP Earned</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="glass-panel p-8 rounded-[32px] shadow-sm">
                    <h3 className="text-lg font-bold text-brand-text mb-6 flex items-center gap-2"><Key size={20} /> AI Configuration</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-6 border border-slate-200 rounded-[24px] bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 bg-white rounded-2xl shadow-sm text-emerald-500"><Shield size={24} /></div>
                                <div>
                                    <div className="text-sm font-light text-brand-text">API Key Status</div>
                                    <div className="text-[10px] text-emerald-600 font-light uppercase tracking-[0.15em] mt-1">Active & Connected</div>
                                </div>
                            </div>
                            <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-light text-slate-400">MANAGED</div>
                        </div>
                        <div className="p-6 border border-slate-200 rounded-[24px] space-y-3 bg-white/20">
                            <label className="flex items-center gap-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={soundEnabled}
                                    onChange={(e) => setSoundEnabled(e.target.checked)}
                                    className="w-6 h-6 rounded-lg border-slate-300 text-brand-primary focus:ring-brand-primary"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-light text-brand-text">Sound Effects</div>
                                    <div className="text-[10px] font-light text-slate-400 uppercase tracking-widest mt-1">Notifications & Feedback</div>
                                </div>
                                {soundEnabled ? <Volume2 size={24} className="text-brand-accent" /> : <VolumeX size={24} className="text-slate-400" />}
                            </label>
                        </div>
                    </div>
                </section>

                <section className="glass-panel p-8 rounded-[32px] shadow-sm">
                    <h3 className="text-lg font-bold text-brand-text mb-6 flex items-center gap-2"><Palette size={20} /> Custom Appearance</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                        {Object.values(THEMES).map(t => {
                            const isLocked = userProfile.level < t.unlockLevel;
                            const isActive = theme.id === t.id;
                            return (
                                <button
                                    key={t.id}
                                    disabled={isLocked}
                                    onClick={() => setThemeId(t.id)}
                                    className={`relative p-6 rounded-[28px] border-2 transition-all flex flex-col items-center gap-3 ${isActive ? 'border-brand-primary bg-slate-50 scale-105 shadow-xl' : 'border-transparent bg-slate-50/50 hover:bg-slate-100'
                                        } ${isLocked ? 'opacity-40 grayscale' : ''}`}
                                >
                                    <div className={`w-14 h-14 rounded-[20px] bg-indigo-600 text-white flex items-center justify-center shadow-lg transform ${isActive ? 'rotate-12' : ''}`}>
                                        {isLocked ? <Lock size={24} /> : <Palette size={24} />}
                                    </div>
                                    <span className="text-[10px] font-light uppercase tracking-[0.2em] text-brand-text">{t.name}</span>
                                    {isLocked && <span className="absolute -top-3 -right-1 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-light rounded-xl shadow-md">LVL {t.unlockLevel}</span>}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="glass-panel p-8 rounded-[32px] border border-rose-100 shadow-sm">
                    <h3 className="text-lg font-bold text-rose-600 mb-5 flex items-center gap-2 uppercase tracking-[0.15em]"><Database size={20} /> Data Integrity</h3>
                    <div className="p-6 bg-rose-50 rounded-[24px] border border-rose-100 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-light text-rose-900">Wipe All Data</div>
                            <div className="text-[10px] text-rose-700 font-light uppercase tracking-[0.2em] mt-1">Irreversible System Reset</div>
                        </div>
                        <button
                            onClick={resetAllData}
                            className="px-6 py-3.5 bg-rose-600 text-white text-xs font-light rounded-[18px] hover:bg-rose-700 transition-colors shadow-xl shadow-rose-500/20 flex items-center gap-2"
                        >
                            <RotateCcw size={16} /> RESET
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SettingsView;
