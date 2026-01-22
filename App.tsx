import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Calendar, Clock, Mic, Image as ImageIcon, X, Trash2, Settings as SettingsIcon, User, 
  ChevronRight, BrainCircuit, AlertCircle, CheckCircle, Coffee, Zap, LayoutDashboard,
  Trophy, LogOut, Menu, Palette, Lock, Unlock, Eye, RotateCcw, PartyPopper, Star,
  Save, Loader2, Pencil, Moon, Sun, Volume2, VolumeX, Shield, AlertTriangle, Sparkles,
  Camera, Upload, Key, Database, Info, HardDrive, GripVertical
} from 'lucide-react';
import { 
  Task, Priority, PartnerSchedule, AppView, UserProfile, DailySchedule, 
  ScheduleBlock, BlockType, LEVEL_THRESHOLDS, THEMES, Theme, Appointment
} from './types';
import { generateDailySchedule, parseVoiceInput, speakText, decodeAudioData } from './services/geminiService';
import { saveUserData, loadUserData } from './services/persistence';
import BattlePass from './components/BattlePass';
import ActiveTimer from './components/ActiveTimer';
import LiveAssistant from './components/LiveAssistant';

const DEFAULT_PARTNER_SCHEDULE: PartnerSchedule = {
  isWorking: false,
  startTime: '09:00',
  endTime: '17:00'
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.Planning);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [partnerSchedule, setPartnerSchedule] = useState<PartnerSchedule>(DEFAULT_PARTNER_SCHEDULE);
  const [userProfile, setUserProfile] = useState<UserProfile>({ xp: 120, level: 1, streakDays: 3, name: 'Eric' });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savedThemeId, setSavedThemeId] = useState<string>('default');
  const [activeThemeId, setActiveThemeId] = useState<string>('default');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.Medium);
  const [newTaskIsDueToday, setNewTaskIsDueToday] = useState(true);
  const [newTaskDuration, setNewTaskDuration] = useState<number>(90);
  const [newTaskImage, setNewTaskImage] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = (Math.ceil(now.getMinutes() / 15) * 15 % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(new Date().toLocaleTimeString());

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const theme: Theme = THEMES[activeThemeId] || THEMES.default;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTimeDisplay(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      let storedId = localStorage.getItem('focus_forge_user_id');
      if (!storedId) {
        storedId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('focus_forge_user_id', storedId);
      }
      setUserId(storedId);
      const data = await loadUserData(storedId);
      if (data) {
        if (data.tasks) setTasks(data.tasks);
        if ((data as any).appointments) setAppointments((data as any).appointments);
        if (data.userProfile) setUserProfile(prev => ({ ...prev, ...data.userProfile }));
        if (data.schedule) setSchedule(data.schedule);
        if (data.partnerSchedule) setPartnerSchedule(data.partnerSchedule);
        if (data.savedThemeId) {
          setSavedThemeId(data.savedThemeId);
          setActiveThemeId(data.savedThemeId);
        }
      }
      setIsLoadingData(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (!userId || isLoadingData) return;
    const saveData = async () => {
      setIsSaving(true);
      await saveUserData(userId, {
        tasks,
        userProfile,
        schedule,
        partnerSchedule,
        savedThemeId,
        appointments
      } as any);
      setIsSaving(false);
    };
    const timeoutId = setTimeout(saveData, 2000);
    return () => clearTimeout(timeoutId);
  }, [tasks, userProfile, schedule, partnerSchedule, savedThemeId, userId, isLoadingData, appointments]);

  const addTask = (overrides: Partial<Task> = {}) => {
    const title = overrides.title || newTaskTitle;
    if (!title.trim()) return;
    
    const task: Task = {
      id: Math.random().toString(36).substring(2, 15),
      title: title.trim(),
      priority: overrides.priority || newTaskPriority,
      estimatedMinutes: overrides.estimatedMinutes || newTaskDuration, 
      isDueToday: overrides.isDueToday ?? newTaskIsDueToday,
      completed: false,
      imageUrl: newTaskImage || undefined
    };
    
    setTasks(prev => [...prev, task]);
    
    if (!overrides.title) {
      setNewTaskTitle('');
      setNewTaskImage(null);
    }
  };

  const addAppointment = (app: Appointment) => {
    setAppointments(prev => [...prev, { ...app, id: Math.random().toString(36).substring(2, 15) }]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTaskImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const speakSummary = async () => {
    const activeTasks = tasks.filter(t => t.isDueToday && !t.completed);
    const summary = `Listen Boss, you have ${activeTasks.length} tasks remaining today and ${appointments.length} appointments scheduled. Your top priority is ${activeTasks.find(t => t.priority === Priority.High)?.title || 'to complete your focus blocks'}. Ready to get started, Eric?`;
    try {
      const audioBytes = await speakText(summary);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.error("TTS Failed:", e);
    }
  };

  const resetAllData = () => {
    if (confirm("Are you sure Eric? This will delete all tasks, schedule, and progress.")) {
      setTasks([]);
      setAppointments([]);
      setSchedule(null);
      setUserProfile({ xp: 0, level: 1, streakDays: 0, name: 'Eric' });
      localStorage.removeItem(`${userId}_data`);
      window.location.reload();
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedTaskId(id);
  };

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
    <div 
      key={task.id} 
      draggable 
      onDragStart={() => handleDragStart(task.id)}
      onDragOver={(e) => handleDragOver(e, task.id)}
      onDragEnd={() => setDraggedTaskId(null)}
      className={`group flex items-center justify-between ${theme.panelBg} p-4 rounded-2xl border ${theme.border} shadow-sm hover:shadow-md transition-all ${draggedTaskId === task.id ? 'opacity-40 scale-95' : 'opacity-100 scale-100'} cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        <div className={`cursor-grab ${theme.textMuted} group-hover:text-slate-400 transition-colors`}>
          <GripVertical size={20} />
        </div>
        {task.imageUrl && <img src={task.imageUrl} className="w-10 h-10 rounded-xl object-cover border shadow-sm shrink-0" />}
        {!task.imageUrl && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            task.priority === Priority.High ? 'bg-rose-50 text-rose-500' : 
            task.priority === Priority.Medium ? 'bg-amber-50 text-amber-500' : 
            'bg-sky-50 text-sky-500'
          }`}>
            <CheckCircle size={18} className={task.completed ? 'opacity-100' : 'opacity-30'} />
          </div>
        )}
        <div className="min-w-0">
          <span className={`${theme.textPrimary} font-bold block text-base truncate`}>{task.title}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[9px] px-1.5 py-0.25 rounded-full font-bold uppercase ${
              task.priority === Priority.High ? 'bg-rose-100 text-rose-700' : 
              task.priority === Priority.Medium ? 'bg-amber-100 text-amber-700' : 
              'bg-sky-100 text-sky-700'
            }`}>{task.priority}</span>
            <span className={`text-[10px] ${theme.textMuted} flex items-center gap-1`}><Clock size={10} /> {task.estimatedMinutes}m</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <button 
          onClick={() => {
             const newTasks = tasks.map(t => t.id === task.id ? {...t, isDueToday: !t.isDueToday} : t);
             setTasks(newTasks);
          }}
          className={`p-2 rounded-lg text-xs font-bold transition-colors ${task.isDueToday ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}
          title={task.isDueToday ? "Move to Upcoming" : "Move to Today"}
        >
          {task.isDueToday ? <Zap size={16} /> : <Calendar size={16} />}
        </button>
        <button onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-2 transition-all"><Trash2 size={16} /></button>
      </div>
    </div>
  );

  const renderPlanningView = () => (
    <div className="animate-fade-in-up space-y-6">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-1">
          <h1 className={`text-4xl font-bold tracking-tight ${theme.textPrimary}`}>Welcome back, Eric</h1>
          <p className={`${theme.textMuted} text-lg`}>Visualize your goals, structure your focus.</p>
        </div>
        <div className="flex items-center gap-3">
            {/* Current Time Card - Matching Screenshot Style */}
            <div className={`hidden md:flex flex-col items-start px-5 py-3 rounded-2xl bg-[#fef9c3]/60 dark:bg-yellow-900/10 border border-[#fde047]/50 shadow-sm backdrop-blur-sm min-w-[120px]`}>
              <span className={`text-[9px] font-bold text-[#854d0e] dark:text-yellow-500 uppercase tracking-widest leading-none`}>CURRENT TIME</span>
              <span className={`text-xl font-mono font-black text-[#713f12] dark:text-yellow-200 mt-1 leading-none`}>
                {currentTimeDisplay}
              </span>
            </div>
            {/* Talk to Focus Button */}
            <button 
              onClick={() => setView(AppView.VoiceAssistant)}
              className="bg-[#c7d2fe]/60 hover:bg-[#c7d2fe] dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200 p-3 px-6 rounded-2xl border border-indigo-200/50 transition-all flex items-center gap-2 font-bold shadow-sm backdrop-blur-sm"
            >
              <Sparkles size={18} /> Talk to Focus
            </button>
            {/* Build Schedule Button */}
            <button 
              onClick={async () => {
                setIsGenerating(true);
                try {
                  const result = await generateDailySchedule(tasks.filter(t => t.isDueToday), partnerSchedule, startTime);
                  setSchedule(result);
                  setView(AppView.Schedule);
                } catch (e) {
                  setErrorMsg("Failed to generate schedule.");
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating || tasks.filter(t => t.isDueToday).length === 0}
              className="bg-[#c084fc]/60 hover:bg-[#c084fc] dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-100 p-3 px-6 rounded-2xl border border-purple-200/50 transition-all flex items-center gap-2 font-bold shadow-sm backdrop-blur-sm disabled:opacity-40"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <><BrainCircuit size={18} /> Build Schedule</>}
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Task Input Panel - Refined to match Screenshot */}
          <div className={`glass-panel p-8 rounded-[32px] shadow-sm border ${theme.border} space-y-6`}>
             <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input 
                      type="text" 
                      placeholder="What needs to be done, Boss?" 
                      className={`w-full pl-6 pr-32 py-5 rounded-[20px] border ${theme.border} bg-white/40 focus:bg-white/80 dark:bg-black/20 dark:focus:bg-black/40 ${theme.textPrimary} placeholder:${theme.textMuted} outline-none focus:ring-2 ${theme.ring}/20 transition-all text-xl font-medium`}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className={`${theme.textMuted} hover:${theme.accent} p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800 transition-colors`}>
                      <Camera size={22} />
                    </button>
                    <button onClick={speakSummary} className={`${theme.textMuted} hover:${theme.accent} p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800 transition-colors`} title="Daily Briefing">
                      <Volume2 size={22} />
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
                <button onClick={() => addTask()} className={`w-16 h-16 ${theme.primary} rounded-[20px] flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-indigo-500/30`}><Plus size={32} /></button>
             </div>

             {newTaskImage && (
               <div className="mb-2 relative w-24 h-24 rounded-2xl overflow-hidden border ${theme.border} shadow-inner">
                 <img src={newTaskImage} className="w-full h-full object-cover" />
                 <button onClick={() => setNewTaskImage(null)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"><X size={14} /></button>
               </div>
             )}

             <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-6">
                   {/* Duration Toggle - Updated with more options */}
                   <div className={`flex bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl p-1.5 border ${theme.border} overflow-x-auto max-w-full scrollbar-hide`}>
                      {[15, 30, 45, 60, 90].map(d => (
                        <button 
                          key={d}
                          onClick={() => setNewTaskDuration(d)} 
                          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${newTaskDuration === d ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {d}m
                        </button>
                      ))}
                   </div>
                   {/* Priority Toggle */}
                   <div className={`flex bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl p-1.5 border ${theme.border}`}>
                      {Object.values(Priority).map(p => (
                        <button 
                          key={p}
                          onClick={() => setNewTaskPriority(p)}
                          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${newTaskPriority === p ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                   </div>
                </div>
                {/* Timeline Start Box */}
                <div className="flex items-center gap-3 pt-2">
                    <span className={`text-sm font-bold ${theme.textMuted} uppercase tracking-wider`}>Timeline Start:</span>
                    <div className="relative">
                      <input 
                        type="time" 
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={`px-4 py-2.5 rounded-xl border ${theme.border} text-sm font-black ${theme.textPrimary} bg-white/50 dark:bg-black/20 outline-none focus:ring-2 ${theme.ring}/20 min-w-[120px]`}
                      />
                    </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            {/* Due Today Section */}
            <div className="space-y-4">
               <h3 className={`text-sm font-black ${theme.textMuted} uppercase tracking-[0.2em] mb-4 ml-2 flex items-center justify-between`}>
                 <span className="flex items-center gap-2"><Zap size={14} className="fill-current" /> Due Today</span>
                 <span className={`text-[11px] font-black ${theme.secondary} px-3 py-1 rounded-full border ${theme.border} shadow-sm`}>{tasks.filter(t => t.isDueToday).length}</span>
               </h3>
               <div className="space-y-4 min-h-[150px]">
                 {tasks.filter(t => t.isDueToday).map(renderTask)}
                 {tasks.filter(t => t.isDueToday).length === 0 && (
                   <div className={`text-center py-16 border-2 border-dashed ${theme.border} rounded-3xl opacity-30 flex flex-col items-center gap-3`}>
                      <div className="p-4 rounded-full bg-slate-100">
                        <Zap size={28} className="text-slate-400" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest">Nothing due today</p>
                   </div>
                 )}
               </div>
            </div>

            {/* Upcoming Section */}
            <div className="space-y-4">
               <h3 className={`text-sm font-black ${theme.textMuted} uppercase tracking-[0.2em] mb-4 ml-2 flex items-center justify-between`}>
                 <span className="flex items-center gap-2"><Calendar size={14} /> Upcoming</span>
                 <span className={`text-[11px] font-black ${theme.secondary} px-3 py-1 rounded-full border ${theme.border} shadow-sm`}>{tasks.filter(t => !t.isDueToday).length}</span>
               </h3>
               <div className="space-y-4 min-h-[150px]">
                 {tasks.filter(t => !t.isDueToday).map(renderTask)}
                 {tasks.filter(t => !t.isDueToday).length === 0 && (
                   <div className={`text-center py-16 border-2 border-dashed ${theme.border} rounded-3xl opacity-30 flex flex-col items-center gap-3`}>
                      <div className="p-4 rounded-full bg-slate-100">
                        <Calendar size={28} className="text-slate-400" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest">No upcoming tasks</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          <div className={`glass-panel p-6 rounded-[32px] shadow-sm border ${theme.border}`}>
             <h3 className={`text-sm font-black ${theme.textPrimary} mb-6 flex items-center gap-2 uppercase tracking-[0.15em]`}>
               <Calendar size={18} className="text-indigo-500" /> Eric's Calendar
             </h3>
             <div className="space-y-4">
               {appointments.map(app => (
                 <div key={app.id} className={`p-4 ${theme.secondary} rounded-[20px] border ${theme.border} flex justify-between items-center group transition-all hover:shadow-lg hover:-translate-y-0.5`}>
                   <div className="flex items-center gap-4">
                     <div className={`p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-sm ${theme.accent}`}><Clock size={16} /></div>
                     <div>
                       <div className={`text-sm font-black ${theme.textPrimary}`}>{app.title}</div>
                       <div className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-widest mt-0.5`}>{app.time} • {app.durationMinutes}m</div>
                     </div>
                   </div>
                   <button onClick={() => setAppointments(prev => prev.filter(a => a.id !== app.id))} className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all rounded-xl hover:bg-rose-50"><X size={16} /></button>
                 </div>
               ))}
               {appointments.length === 0 && (
                <div className="text-center py-12 opacity-30 border-2 border-dashed rounded-[24px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em]">Clear Schedule</p>
                </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="animate-fade-in-up max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className={`text-3xl font-bold tracking-tight ${theme.textPrimary}`}>System Settings</h1>
        <p className={theme.textMuted}>Manage your profile, data, and appearance.</p>
      </header>

      <div className="space-y-6">
        <section className={`glass-panel p-8 rounded-[32px] border ${theme.border} shadow-sm`}>
          <h3 className={`text-lg font-bold ${theme.textPrimary} mb-6 flex items-center gap-2`}><User size={20} /> User Profile</h3>
          <div className="space-y-5">
            <div>
              <label className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest block mb-2.5`}>Display Name</label>
              <input 
                type="text" 
                value={userProfile.name}
                onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-5 py-4.5 rounded-2xl border ${theme.border} bg-white/50 dark:bg-black/20 ${theme.textPrimary} outline-none focus:ring-2 ${theme.ring}/20 font-bold`}
              />
            </div>
            <div className={`p-6 ${theme.secondary} rounded-[24px] border ${theme.border} flex items-center justify-between`}>
              <div className="flex items-center gap-5">
                <div className={`p-3.5 bg-white dark:bg-slate-700 rounded-2xl shadow-sm ${theme.accent}`}><Trophy size={24} /></div>
                <div>
                  <div className={`font-black ${theme.textPrimary} text-base`}>Focus ID</div>
                  <div className={`text-[11px] font-mono ${theme.textMuted} break-all max-w-[180px] mt-1`}>{userId}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-black ${theme.textPrimary}`}>Lvl {userProfile.level}</div>
                <div className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest mt-1`}>{userProfile.xp} XP Earned</div>
              </div>
            </div>
          </div>
        </section>

        <section className={`glass-panel p-8 rounded-[32px] border ${theme.border} shadow-sm`}>
          <h3 className={`text-lg font-bold ${theme.textPrimary} mb-6 flex items-center gap-2`}><Key size={20} /> AI Configuration</h3>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-6 border ${theme.border} rounded-[24px] ${theme.secondary}`}>
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-white dark:bg-slate-700 rounded-2xl shadow-sm text-emerald-500"><Shield size={24} /></div>
                <div>
                  <div className={`text-sm font-black ${theme.textPrimary}`}>API Key Status</div>
                  <div className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.15em] mt-1">Active & Connected</div>
                </div>
              </div>
              <div className={`px-4 py-1.5 bg-white/80 dark:bg-slate-800 border ${theme.border} rounded-xl text-[10px] font-black ${theme.textMuted}`}>MANAGED</div>
            </div>
            <div className={`p-6 border ${theme.border} rounded-[24px] space-y-3 bg-white/20`}>
              <label className="flex items-center gap-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className={`w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500`}
                />
                <div className="flex-1">
                  <div className={`text-sm font-black ${theme.textPrimary}`}>Sound Effects</div>
                  <div className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest mt-1`}>Notifications & Feedback</div>
                </div>
                {soundEnabled ? <Volume2 size={24} className={theme.accent} /> : <VolumeX size={24} className={theme.textMuted} />}
              </label>
            </div>
          </div>
        </section>

        <section className={`glass-panel p-8 rounded-[32px] border ${theme.border} shadow-sm`}>
          <h3 className={`text-lg font-bold ${theme.textPrimary} mb-6 flex items-center gap-2`}><Palette size={20} /> Custom Appearance</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {Object.values(THEMES).map(t => {
              const isLocked = userProfile.level < t.unlockLevel;
              return (
                <button 
                  key={t.id}
                  disabled={isLocked}
                  onClick={() => {
                    setActiveThemeId(t.id);
                    setSavedThemeId(t.id);
                  }}
                  className={`relative p-6 rounded-[28px] border-2 transition-all flex flex-col items-center gap-3 ${
                    activeThemeId === t.id ? `border-indigo-500 ${theme.secondary} scale-105 shadow-xl` : `border-transparent bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700`
                  } ${isLocked ? 'opacity-40 grayscale' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-[20px] ${t.primary} flex items-center justify-center shadow-lg transform ${activeThemeId === t.id ? 'rotate-12' : ''}`}>
                    {isLocked ? <Lock size={24} /> : <Palette size={24} />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textPrimary}`}>{t.name}</span>
                  {isLocked && <span className="absolute -top-3 -right-1 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-black rounded-xl shadow-md">LVL {t.unlockLevel}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section className={`glass-panel p-8 rounded-[32px] border border-rose-100 dark:border-rose-900 shadow-sm`}>
          <h3 className="text-lg font-bold text-rose-600 mb-5 flex items-center gap-2 uppercase tracking-[0.15em]"><Database size={20} /> Data Integrity</h3>
          <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-[24px] border border-rose-100 dark:border-rose-900/20 flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-rose-900 dark:text-rose-400">Wipe All Data</div>
              <div className="text-[10px] text-rose-700 dark:text-rose-500 font-bold uppercase tracking-[0.2em] mt-1">Irreversible System Reset</div>
            </div>
            <button 
              onClick={resetAllData}
              className="px-6 py-3.5 bg-rose-600 text-white text-xs font-black rounded-[18px] hover:bg-rose-700 transition-colors shadow-xl shadow-rose-500/20 flex items-center gap-2"
            >
              <RotateCcw size={16} /> RESET
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div className={`h-full flex ${theme.appBg} transition-colors duration-500`}>
      {view === AppView.VoiceAssistant && (
        <LiveAssistant 
          theme={theme} 
          onClose={() => setView(AppView.Planning)}
          tasks={tasks}
          appointments={appointments}
          onAddTask={(t) => addTask(t)}
          onSetAppointment={(a) => addAppointment(a)}
        />
      )}
      
      <aside className={`hidden md:flex w-72 flex-col ${theme.panelBg} h-full p-8 border-r ${theme.border} shadow-sm z-30`}>
         <div className="flex items-center gap-4 mb-16 px-2">
            <div className={`w-12 h-12 ${theme.primary} rounded-[18px] flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-200 transform -rotate-3 transition-transform hover:rotate-0 cursor-default`}>F</div>
            <div className="flex flex-col">
              <span className={`font-black text-2xl ${theme.textPrimary} tracking-tighter leading-none`}>FOCUS</span>
              <span className={`text-[10px] font-black ${theme.textMuted} tracking-[0.3em] mt-1.5`}>CORE</span>
            </div>
         </div>
         <nav className="flex-1 space-y-4">
            {[
              { id: AppView.Planning, label: 'Workbench', icon: LayoutDashboard },
              { id: AppView.Schedule, label: 'Timeline', icon: Calendar, disabled: !schedule },
              { id: AppView.Rewards, label: 'Journey', icon: Trophy },
              { id: AppView.Settings, label: 'Settings', icon: SettingsIcon },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setView(item.id)} 
                disabled={item.disabled}
                className={`w-full flex items-center justify-between px-6 py-5 rounded-[22px] font-black text-[13px] uppercase tracking-[0.2em] transition-all group ${
                  view === item.id ? `${theme.secondary} scale-[1.03] shadow-lg border ${theme.border}` : `${theme.textMuted} hover:bg-slate-50/50 dark:hover:bg-slate-800/50 hover:${theme.textPrimary}`
                } ${item.disabled ? 'opacity-20 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <item.icon size={22} className={view === item.id ? theme.accent : 'opacity-60'} />
                  {item.label}
                </div>
                <ChevronRight size={16} className={`transition-transform duration-300 ${view === item.id ? 'translate-x-0' : '-translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
              </button>
            ))}
         </nav>

         <div className="mt-auto pt-8 border-t ${theme.border} space-y-4">
            <div className={`flex items-center gap-4 px-4 py-5 rounded-[24px] ${theme.secondary} border ${theme.border} shadow-sm`}>
              <div className={`w-12 h-12 rounded-[18px] bg-white dark:bg-slate-700 border-2 border-white/50 flex items-center justify-center ${theme.accent} font-black text-xl shadow-sm`}>
                {userProfile.name?.charAt(0) || 'E'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className={`text-sm font-black ${theme.textPrimary} truncate`}>{userProfile.name}</span>
                <span className={`text-[10px] font-black ${theme.accent} uppercase tracking-[0.15em] mt-0.5`}>Level {userProfile.level}</span>
              </div>
            </div>
         </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="p-8 md:p-16 max-w-6xl mx-auto">
           {view === AppView.Planning && renderPlanningView()}
           {view === AppView.Schedule && schedule && (
             <div className="animate-fade-in-up space-y-10">
                <header className="flex justify-between items-end">
                  <div>
                    <h1 className={`text-4xl font-bold ${theme.textPrimary}`}>Your Timeline</h1>
                    <p className={`${theme.textMuted} text-lg mt-1`}>Executing today's structure block by block.</p>
                  </div>
                  <button onClick={() => setView(AppView.Planning)} className={`px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] ${theme.accent} hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-2xl transition-all border ${theme.border} hover:shadow-md`}>Re-Structure</button>
                </header>
                <div className="space-y-6">
                  {schedule.blocks.map((block) => (
                    <div key={block.id} className={`flex gap-6 p-7 rounded-[32px] border ${block.type === BlockType.Work ? `bg-white dark:bg-slate-800/80 border-indigo-100 dark:border-indigo-900/50` : `${theme.panelBg} border-slate-200 dark:border-slate-700`} shadow-sm transition-all hover:shadow-xl group`}>
                      <div className="flex flex-col items-center gap-3 w-20 shrink-0">
                        <span className={`text-sm font-black ${theme.textPrimary}`}>{block.startTime}</span>
                        <div className={`w-1 flex-1 rounded-full ${block.type === BlockType.Work ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        <span className={`text-[11px] font-bold ${theme.textMuted}`}>{block.endTime}</span>
                      </div>
                      <div className="flex-1 flex justify-between items-center overflow-hidden">
                        <div className="min-w-0">
                          <div className="flex items-center gap-4">
                             <span className={`font-black ${theme.textPrimary} text-2xl truncate group-hover:${theme.accent} transition-colors`}>{block.label}</span>
                             <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider ${block.type === BlockType.Work ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'bg-green-50 text-green-700 shadow-sm'}`}>
                               {block.type}
                             </span>
                          </div>
                          <p className={`text-sm font-bold ${theme.textMuted} mt-2`}>{block.durationMinutes} minutes duration • {block.taskIds.length} focused tasks</p>
                          {block.actualStartTime && (
                            <div className="flex items-center gap-2.5 mt-3">
                              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              <p className={`text-[11px] font-black ${theme.accent} uppercase tracking-[0.2em]`}>
                                Started: {new Date(block.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => setActiveBlockId(block.id)}
                          className={`p-5 rounded-[24px] ${block.type === BlockType.Work ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-green-600 text-white shadow-green-500/30'} hover:scale-105 transition-transform shrink-0 shadow-2xl`}
                        >
                          <Clock size={28} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           )}
           {view === AppView.Rewards && (
             <div className="animate-fade-in-up space-y-8">
                <header>
                  <h1 className={`text-4xl font-bold tracking-tight ${theme.textPrimary}`}>The Journey</h1>
                  <p className={`${theme.textMuted} text-lg`}>Track your growth and claim system-wide custom skins.</p>
                </header>
                <BattlePass userProfile={userProfile} />
             </div>
           )}
           {view === AppView.Settings && renderSettingsView()}
        </div>
      </main>

      {activeBlockId && schedule && (
        <ActiveTimer 
          block={schedule.blocks.find(b => b.id === activeBlockId)!}
          soundEnabled={soundEnabled}
          onComplete={(actualStart, actualEnd) => {
            setSchedule(prev => {
              if (!prev) return null;
              return {
                ...prev,
                blocks: prev.blocks.map(b => 
                  b.id === activeBlockId 
                    ? { ...b, completed: true, actualStartTime: actualStart, actualEndTime: actualEnd } 
                    : b
                )
              };
            });
            setUserProfile(prev => {
              const newXp = prev.xp + 50;
              let newLevel = prev.level;
              if (newXp >= (LEVEL_THRESHOLDS[newLevel] || 10000)) {
                newLevel++;
              }
              return { ...prev, xp: newXp, level: newLevel };
            });
            setActiveBlockId(null);
          }}
          onCancel={() => setActiveBlockId(null)}
        />
      )}
    </div>
  );
};

export default App;
