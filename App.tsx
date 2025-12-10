

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Calendar, Clock, Mic, Image as ImageIcon, X, Trash2, Settings, User, 
  ChevronRight, BrainCircuit, AlertCircle, CheckCircle, Coffee, Zap, LayoutDashboard,
  Trophy, LogOut, Menu, Palette, Lock, Unlock, Eye, RotateCcw, PartyPopper, Star,
  Save, Loader2, Pencil, Moon, Sun, Volume2, VolumeX, Shield, AlertTriangle
} from 'lucide-react';
import { 
  Task, Priority, PartnerSchedule, AppView, UserProfile, DailySchedule, 
  ScheduleBlock, BlockType, LEVEL_THRESHOLDS, THEMES, Theme
} from './types';
import { generateDailySchedule, parseVoiceInput } from './services/geminiService';
import { saveUserData, loadUserData } from './services/persistence';
import BattlePass from './components/BattlePass';
import ActiveTimer from './components/ActiveTimer';

const DEFAULT_PARTNER_SCHEDULE: PartnerSchedule = {
  isWorking: false,
  startTime: '09:00',
  endTime: '17:00'
};

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<AppView>(AppView.Planning);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [partnerSchedule, setPartnerSchedule] = useState<PartnerSchedule>(DEFAULT_PARTNER_SCHEDULE);
  const [userProfile, setUserProfile] = useState<UserProfile>({ xp: 120, level: 1, streakDays: 3, name: 'ChromaUser' });
  
  // Settings State
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Theme State
  const [savedThemeId, setSavedThemeId] = useState<string>('default');
  const [activeThemeId, setActiveThemeId] = useState<string>('default');
  
  // End of Day State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);

  // Inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.Medium);
  const [newTaskIsDueToday, setNewTaskIsDueToday] = useState(true);
  const [newTaskDuration, setNewTaskDuration] = useState<number>(90); // Default 90m
  const [startTime, setStartTime] = useState('09:00');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Persistence State
  const [userId, setUserId] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Active Block
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Block Editing State
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{label: string, duration: number, type: BlockType}>({
    label: '', duration: 0, type: BlockType.Work
  });

  // Helper to get active theme object
  const theme: Theme = THEMES[activeThemeId] || THEMES.default;

  // --- Effects ---

  // 1. Initialize User & Load Data
  useEffect(() => {
    const initApp = async () => {
      // Get or create User ID
      let storedId = localStorage.getItem('focus_forge_user_id');
      if (!storedId) {
        storedId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('focus_forge_user_id', storedId);
      }
      setUserId(storedId);

      // Load Data from Firestore
      const data = await loadUserData(storedId);
      if (data) {
        if (data.tasks) setTasks(data.tasks);
        if (data.userProfile) setUserProfile({ ...userProfile, ...data.userProfile });
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

  // 2. Auto-Save Debouncer
  useEffect(() => {
    if (!userId || isLoadingData) return;

    const saveData = async () => {
      setIsSaving(true);
      await saveUserData(userId, {
        tasks,
        userProfile,
        schedule,
        partnerSchedule,
        savedThemeId
      });
      setIsSaving(false);
    };

    const timeoutId = setTimeout(saveData, 2000); // Debounce saves by 2s

    return () => clearTimeout(timeoutId);
  }, [tasks, userProfile, schedule, partnerSchedule, savedThemeId, userId, isLoadingData]);

  // 3. Revert preview if user navigates away from settings
  useEffect(() => {
    if (view !== AppView.Settings && activeThemeId !== savedThemeId) {
      setActiveThemeId(savedThemeId);
    }
  }, [view]);

  // --- Handlers ---

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      priority: newTaskPriority,
      estimatedMinutes: newTaskDuration, 
      isDueToday: newTaskIsDueToday,
      completed: false
    };
    setTasks([...tasks, task]);
    setNewTaskTitle('');
    setNewTaskDuration(90); // Reset to default
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNewTaskTitle(transcript);
      const parsed = await parseVoiceInput(transcript);
      if (parsed.title) setNewTaskTitle(parsed.title);
      if (parsed.priority) setNewTaskPriority(parsed.priority);
      if (parsed.estimatedMinutes) setNewTaskDuration(parsed.estimatedMinutes);
    };
  };

  const generateSchedule = async () => {
    if (tasks.length === 0) {
      setErrorMsg("Add some tasks first!");
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const result = await generateDailySchedule(tasks, partnerSchedule, startTime);
      setSchedule(result);
      setSessionXP(0); // Reset session XP tracking for a new day
      setView(AppView.Schedule);
    } catch (e) {
      setErrorMsg("Failed to generate schedule. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const startBlock = (blockId: string) => {
    setActiveBlockId(blockId);
    setView(AppView.ActiveTimer);
  };

  const completeBlock = () => {
    if (!activeBlockId || !schedule) return;

    // 1. Mark block complete
    const updatedBlocks = schedule.blocks.map(b => 
      b.id === activeBlockId ? { ...b, completed: true } : b
    );
    
    // 2. Mark associated tasks complete
    const block = schedule.blocks.find(b => b.id === activeBlockId);
    if (block && block.taskIds) {
      setTasks(prev => prev.map(t => 
        block.taskIds.includes(t.id) ? { ...t, completed: true } : t
      ));
    }

    setSchedule({ ...schedule, blocks: updatedBlocks });
    
    // 3. Award XP
    const xpGain = 100;
    const newXP = userProfile.xp + xpGain;
    setSessionXP(prev => prev + xpGain);
    
    // Check level up (simplified)
    let newLevel = userProfile.level;
    if (newXP >= (LEVEL_THRESHOLDS[newLevel] || 10000)) {
       newLevel += 1;
    }

    setUserProfile({ ...userProfile, xp: newXP, level: newLevel });
    setActiveBlockId(null);

    // 4. Check for Day Completion
    const remainingWorkBlocks = updatedBlocks.filter(b => b.type === BlockType.Work && !b.completed);
    
    if (remainingWorkBlocks.length === 0 && block?.type === BlockType.Work) {
      // Small delay to allow state updates to settle visually
      setTimeout(() => setShowSummaryModal(true), 500);
    }

    setView(AppView.Schedule);
  };

  const handleThemeInteraction = (tId: string) => {
    // Always allow previewing by setting activeThemeId
    setActiveThemeId(tId);
    
    // Only save/apply if unlocked
    const targetTheme = THEMES[tId];
    if (userProfile.level >= targetTheme.unlockLevel) {
      setSavedThemeId(tId);
    }
  };

  const toggleDarkMode = () => {
    const isDark = activeThemeId === 'midnight' || activeThemeId === 'obsidian';
    // If currently dark, switch to default (light). If currently light, switch to midnight (dark).
    const targetId = isDark ? 'default' : 'midnight';
    handleThemeInteraction(targetId);
  };

  const cancelPreview = () => {
    setActiveThemeId(savedThemeId);
  };

  const claimRewards = () => {
    setShowSummaryModal(false);
    setView(AppView.Rewards);
  };

  const clearAppData = () => {
    if(window.confirm("Are you sure? This will delete all your tasks and XP.")) {
       localStorage.clear();
       window.location.reload();
    }
  }

  // --- Block Editing Logic ---

  const startEditingBlock = (block: ScheduleBlock) => {
    setEditingBlockId(block.id);
    setEditValues({
      label: block.label || '',
      duration: block.durationMinutes,
      type: block.type
    });
  };

  const recalculateScheduleTimes = (blocks: ScheduleBlock[], startStr: string): ScheduleBlock[] => {
    const [startH, startM] = startStr.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(startH, startM, 0, 0);

    return blocks.map(block => {
      const blockStart = new Date(currentTime);
      const duration = block.durationMinutes;
      currentTime.setMinutes(currentTime.getMinutes() + duration);
      const blockEnd = new Date(currentTime);

      return {
        ...block,
        startTime: blockStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTime: blockEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      };
    });
  };

  const saveBlockEdit = () => {
    if (!schedule || !editingBlockId) return;

    // 1. Update the target block
    const updatedBlocksRaw = schedule.blocks.map(b => {
      if (b.id === editingBlockId) {
        return {
          ...b,
          label: editValues.label,
          durationMinutes: Number(editValues.duration),
          type: editValues.type
        };
      }
      return b;
    });

    // 2. Recalculate timelines for ALL blocks to ensure consistency
    const recalculatedBlocks = recalculateScheduleTimes(updatedBlocksRaw, startTime);

    setSchedule({
      ...schedule,
      blocks: recalculatedBlocks
    });
    setEditingBlockId(null);
  };

  // --- Views ---

  const renderPlanningView = () => (
    <div className="animate-fade-in-up space-y-6">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${theme.textPrimary}`}>Plan Your Day</h1>
          <p className={theme.textMuted}>Structure your chaos into flow.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={generateSchedule}
              disabled={isGenerating || tasks.length === 0}
              className={`${theme.primary} ${theme.primaryHover} font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95`}
            >
              {isGenerating ? <span className="animate-pulse">Building Schedule...</span> : <><BrainCircuit size={18} /> Generate Plan</>}
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Input Card */}
          <div className={`${theme.panelBg} p-6 rounded-2xl shadow-sm transition-colors duration-300`}>
             <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <input 
                      type="text" 
                      placeholder="What needs to be done?" 
                      className={`w-full pl-4 pr-10 py-4 rounded-xl border ${theme.border} bg-white text-slate-900 ${theme.ring} outline-none transition-all shadow-sm`}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  />
                  <button onClick={handleVoiceInput} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 ${theme.textMuted} hover:${theme.accent} transition-colors`}>
                    <Mic size={20} />
                  </button>
                </div>
                
                <button 
                  onClick={addTask}
                  className={`w-14 h-14 ${theme.primary} ${theme.primaryHover} rounded-xl shadow-md hover:shadow-lg flex items-center justify-center transition-all active:scale-95`}
                >
                  <Plus size={26} />
                </button>
             </div>

             {/* Task Config */}
             <div className="flex flex-wrap items-center gap-3">
                 <div className={`flex ${activeThemeId === 'midnight' ? 'bg-slate-700' : 'bg-slate-100'} rounded-lg p-1 border ${theme.border}`}>
                    <button onClick={() => setNewTaskDuration(10)} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${newTaskDuration === 10 ? 'bg-white text-indigo-600 shadow-sm' : `${theme.textMuted}`}`}>
                      <Zap size={12} /> 10m
                    </button>
                    <button onClick={() => setNewTaskDuration(90)} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${newTaskDuration === 90 ? 'bg-white text-indigo-600 shadow-sm' : `${theme.textMuted}`}`}>
                      <Clock size={12} /> 90m
                    </button>
                 </div>
                 
                 <select 
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    className={`bg-white text-slate-900 text-xs font-medium border ${theme.border} rounded-lg px-3 py-2 outline-none ${theme.ring}`}
                  >
                    <option value={Priority.Low}>Low Priority</option>
                    <option value={Priority.Medium}>Medium Priority</option>
                    <option value={Priority.High}>High Priority</option>
                  </select>

                  <button
                    onClick={() => setNewTaskIsDueToday(!newTaskIsDueToday)}
                    className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${newTaskIsDueToday ? `${theme.secondary} ${theme.border}` : `bg-white ${theme.border} text-slate-500`}`}
                  >
                    Due Today
                  </button>
             </div>
          </div>

          {/* Task Lists */}
          <div className="space-y-4">
             {/* Due Today */}
             <div>
               <h3 className={`text-sm font-bold ${theme.textMuted} uppercase tracking-wider mb-3 ml-1`}>Today's Focus</h3>
               <div className="space-y-2">
                 {tasks.filter(t => t.isDueToday).length === 0 && (
                   <div className={`text-center p-8 border-2 border-dashed ${theme.border} rounded-2xl ${theme.textMuted}`}>
                     No tasks for today yet. Start typing above!
                   </div>
                 )}
                 {tasks.filter(t => t.isDueToday).map(task => (
                   <div key={task.id} className={`group flex items-center justify-between ${activeThemeId === 'midnight' || activeThemeId === 'obsidian' ? 'bg-slate-800' : 'bg-white'} p-4 rounded-xl border ${theme.border} shadow-sm hover:shadow-md transition-all`}>
                      <div className="flex items-center gap-4">
                         <div className={`w-3 h-3 rounded-full ${task.priority === Priority.High ? 'bg-red-500 shadow-red-200' : task.priority === Priority.Medium ? 'bg-yellow-500' : 'bg-blue-400'} shadow-lg`}></div>
                         <div>
                           <span className={`${theme.textPrimary} font-medium block`}>{task.title}</span>
                           <span className={`text-xs ${theme.textMuted} flex items-center gap-1`}>
                             {task.estimatedMinutes} min block
                           </span>
                         </div>
                      </div>
                      <button onClick={() => removeTask(task.id)} className={`${theme.textMuted} hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2`}>
                        <Trash2 size={18} />
                      </button>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* Right Col: Daily Configuration */}
        <div className="space-y-6">
          <div className={`${theme.panelBg} p-6 rounded-2xl shadow-sm transition-colors duration-300`}>
             <h3 className={`text-sm font-bold ${theme.textPrimary} mb-4 flex items-center gap-2`}>
               <Settings size={16} /> Daily Configuration
             </h3>
             
             <div className="space-y-4">
                <div>
                   <label className={`text-xs font-semibold ${theme.textMuted} block mb-2`}>My Start Time</label>
                   <input 
                     type="time" 
                     value={startTime}
                     onChange={(e) => setStartTime(e.target.value)}
                     className={`w-full bg-slate-50 border ${theme.border} rounded-lg p-2.5 text-sm text-slate-800 outline-none ${theme.ring}`}
                   />
                </div>

                <div className={`pt-4 border-t ${theme.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className={`text-xs font-semibold ${theme.textMuted}`}>Partner Schedule</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={partnerSchedule.isWorking} onChange={(e) => setPartnerSchedule({ ...partnerSchedule, isWorking: e.target.checked })} className="sr-only peer" />
                      <div className={`w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:${theme.primary.split(' ')[0]}`}></div>
                    </label>
                  </div>
                  
                  {partnerSchedule.isWorking && (
                    <div className="flex gap-2 animate-slide-down">
                       <input 
                          type="time" 
                          value={partnerSchedule.startTime}
                          onChange={(e) => setPartnerSchedule({...partnerSchedule, startTime: e.target.value})}
                          className={`flex-1 bg-slate-50 border ${theme.border} rounded-lg p-2 text-xs text-slate-800`}
                       />
                       <span className={`${theme.textMuted} self-center`}>-</span>
                       <input 
                          type="time" 
                          value={partnerSchedule.endTime}
                          onChange={(e) => setPartnerSchedule({...partnerSchedule, endTime: e.target.value})}
                          className={`flex-1 bg-slate-50 border ${theme.border} rounded-lg p-2 text-xs text-slate-800`}
                       />
                    </div>
                  )}
                </div>
             </div>
          </div>
          
          <div className={`${theme.panelBg} p-6 rounded-2xl shadow-sm opacity-80`}>
            <h3 className={`text-sm font-bold ${theme.textMuted} mb-2 uppercase`}>Backlog</h3>
            <div className="space-y-2">
              {tasks.filter(t => !t.isDueToday).map(task => (
                <div key={task.id} className={`flex justify-between items-center text-sm p-2 bg-slate-50/50 rounded border ${theme.border}`}>
                   <span className={`${theme.textMuted} truncate`}>{task.title}</span>
                   <button onClick={() => removeTask(task.id)} className={`${theme.textMuted} hover:text-red-400`}><X size={14} /></button>
                </div>
              ))}
              {tasks.filter(t => !t.isDueToday).length === 0 && <p className={`text-xs ${theme.textMuted} italic`}>No upcoming tasks.</p>}
            </div>
          </div>
        </div>
      </div>
      
      {errorMsg && (
        <div className="fixed bottom-24 right-4 md:right-8 bg-red-50 text-red-700 px-6 py-4 rounded-xl shadow-xl border border-red-100 flex items-center gap-3 animate-fade-in-up">
          <AlertCircle size={20} /> {errorMsg}
        </div>
      )}
    </div>
  );

  const renderScheduleView = () => {
    if (!schedule) return null;

    const completedBlocks = schedule.blocks.filter(b => b.completed);
    const incompleteBlocks = schedule.blocks.filter(b => !b.completed);
    const total = schedule.blocks.length;
    const progress = (completedBlocks.length / total) * 100;

    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up pb-24 md:pb-0">
        <header className={`mb-8 ${theme.panelBg} sticky top-0 z-20 py-4 px-6 -mx-6 border-b ${theme.border}`}>
           <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className={`font-bold text-xl ${theme.textPrimary}`}>Today's Timeline</h2>
                <p className={`text-xs ${theme.textMuted}`}>Stay in flow. Finish one block at a time.</p>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${theme.accent}`}>{Math.round(progress)}%</span>
                <span className={`text-xs ${theme.textMuted} block`}>Complete</span>
              </div>
           </div>
           <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
              <div className={`h-full ${theme.primary.split(' ')[0]} transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
           </div>
        </header>

        {/* Pending Blocks */}
        <div className="space-y-6 relative mb-12">
           <div className={`absolute left-[80px] top-4 bottom-4 w-0.5 ${theme.border} -z-10`}></div>
           
           {incompleteBlocks.map((block, idx) => {
             const isWork = block.type === BlockType.Work;
             const isNext = idx === 0;
             const isEditing = editingBlockId === block.id;
             
             return (
               <div key={block.id} className="flex gap-6 group">
                 <div className="w-16 text-right pt-5">
                   <div className={`text-sm font-bold ${theme.textSecondary}`}>{block.startTime}</div>
                   <div className={`text-xs ${theme.textMuted}`}>{block.endTime}</div>
                 </div>

                 <div className={`flex-1 rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden ${
                   isWork 
                     ? `${theme.panelBg} ${theme.border} shadow-sm` 
                     : `${theme.secondary} border-transparent`
                 } ${isNext && !isEditing ? `ring-2 ring-indigo-500 shadow-lg transform scale-[1.02]` : 'opacity-90'}`}>
                   
                   {isNext && !isEditing && <div className={`absolute top-0 left-0 w-1 h-full ${theme.primary.split(' ')[0]}`}></div>}
                   
                   {/* Edit Button */}
                   {!isEditing && (
                     <button 
                        onClick={() => startEditingBlock(block)}
                        className={`absolute top-4 right-4 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${theme.textMuted} hover:${theme.textPrimary} hover:bg-black/5`}
                     >
                       <Pencil size={16} />
                     </button>
                   )}

                   {isEditing ? (
                     <div className="space-y-4">
                        <div>
                          <label className={`text-xs font-bold ${theme.textMuted} block mb-1`}>Block Label</label>
                          <input 
                            value={editValues.label}
                            onChange={(e) => setEditValues({...editValues, label: e.target.value})}
                            className={`w-full p-2 rounded border ${theme.border} bg-white text-slate-900 text-sm`}
                          />
                        </div>
                        <div className="flex gap-4">
                           <div className="flex-1">
                             <label className={`text-xs font-bold ${theme.textMuted} block mb-1`}>Duration (m)</label>
                             <input 
                               type="number"
                               value={editValues.duration}
                               onChange={(e) => setEditValues({...editValues, duration: Number(e.target.value)})}
                               className={`w-full p-2 rounded border ${theme.border} bg-white text-slate-900 text-sm`}
                             />
                           </div>
                           <div className="flex-1">
                             <label className={`text-xs font-bold ${theme.textMuted} block mb-1`}>Type</label>
                             <select 
                                value={editValues.type}
                                onChange={(e) => setEditValues({...editValues, type: e.target.value as BlockType})}
                                className={`w-full p-2 rounded border ${theme.border} bg-white text-slate-900 text-sm`}
                             >
                               <option value={BlockType.Work}>Work Focus</option>
                               <option value={BlockType.Break}>Break</option>
                             </select>
                           </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                           <button onClick={() => setEditingBlockId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                           <button onClick={saveBlockEdit} className={`px-3 py-1.5 text-xs font-bold text-white rounded ${theme.primary.split(' ')[0]}`}>Save Changes</button>
                        </div>
                     </div>
                   ) : (
                     <>
                       <div className="flex justify-between items-start mb-3">
                         <div>
                           <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded mb-2 inline-block ${
                             isWork ? `${theme.secondary}` : 'bg-white/50'
                           }`}>
                             {block.durationMinutes}m {block.type}
                           </span>
                           <h3 className={`font-bold text-lg ${isWork ? theme.textPrimary : theme.accent}`}>{block.label}</h3>
                         </div>
                         
                         {isNext && (
                            <button 
                             onClick={() => startBlock(block.id)}
                             className={`${theme.primary} ${theme.primaryHover} p-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 font-medium text-sm`}
                            >
                              <Clock size={16} /> Start
                            </button>
                         )}
                       </div>

                       {/* Tasks */}
                       {isWork && block.taskIds.length > 0 && (
                          <div className={`space-y-2 mt-4 ${activeThemeId === 'midnight' ? 'bg-black/20' : 'bg-slate-50'} p-3 rounded-xl border ${theme.border}`}>
                            {block.taskIds.map(tid => {
                              const task = tasks.find(t => t.id === tid);
                              return task ? (
                                <div key={tid} className={`text-sm ${theme.textSecondary} flex items-start gap-2.5`}>
                                  <div className={`mt-1.5 w-1.5 h-1.5 ${theme.textMuted} bg-current rounded-full shrink-0`}></div>
                                  <span>{task.title}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                       )}
                       
                       {!isWork && (
                         <p className={`text-sm ${theme.accent} flex items-center gap-2 mt-2`}>
                           <Coffee size={16} /> Take a break. Step away from the screen.
                         </p>
                       )}
                     </>
                   )}
                 </div>
               </div>
             );
           })}
        </div>

        {/* Completed Blocks */}
        {completedBlocks.length > 0 && (
          <div className={`mt-12 pt-8 border-t ${theme.border}`}>
            <h4 className={`text-sm font-bold ${theme.textMuted} uppercase tracking-widest mb-6 text-center`}>Completed</h4>
            <div className="space-y-4 opacity-60 hover:opacity-100 transition-opacity">
               {completedBlocks.map((block) => (
                 <div key={block.id} className="flex gap-6 grayscale">
                   <div className={`w-16 text-right pt-4 text-xs ${theme.textMuted} font-mono`}>
                     {block.endTime}
                   </div>
                   <div className={`flex-1 ${activeThemeId === 'midnight' ? 'bg-slate-800' : 'bg-slate-100'} border ${theme.border} rounded-xl p-4 flex items-center justify-between`}>
                      <div>
                        <h3 className={`font-bold ${theme.textSecondary} text-sm line-through`}>{block.label}</h3>
                        <p className={`text-xs ${theme.textMuted}`}>{block.durationMinutes}m {block.type}</p>
                      </div>
                      <CheckCircle size={20} className={theme.textMuted} />
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Overflow */}
        {schedule.overflowTaskIds.length > 0 && (
          <div className="mt-12 p-6 bg-red-50 border border-red-100 rounded-2xl">
             <h4 className="text-red-800 font-bold text-sm mb-3 flex items-center gap-2">
               <AlertCircle size={16} /> Rescheduled to Tomorrow (Overflow)
             </h4>
             <ul className="text-sm text-red-700 space-y-2">
               {schedule.overflowTaskIds.map(tid => {
                 const t = tasks.find(task => task.id === tid);
                 return t ? <li key={tid} className="flex items-center gap-2"><span className="w-1 h-1 bg-red-400 rounded-full"></span> {t.title}</li> : null;
               })}
             </ul>
          </div>
        )}
      </div>
    );
  };

  const renderRewardsView = () => (
    <div className="max-w-2xl mx-auto animate-fade-in-up pb-24 md:pb-0">
      <h1 className={`text-3xl font-bold ${theme.textPrimary} mb-8`}>Career Progress</h1>
      <BattlePass userProfile={userProfile} />
      
      <div className="mt-8 grid grid-cols-2 gap-4">
         <div className={`${theme.panelBg} p-6 rounded-2xl shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow`}>
            <div className={`w-14 h-14 ${theme.secondary} rounded-full flex items-center justify-center mb-3`}>
              <Clock size={28} />
            </div>
            <div className={`font-bold text-3xl ${theme.textPrimary} mb-1`}>
              {schedule ? schedule.blocks.filter(b => b.completed && b.type === BlockType.Work).reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60 : 0}h
            </div>
            <div className={`text-xs ${theme.textMuted} font-medium uppercase tracking-wider`}>Focus Time</div>
         </div>
         <div className={`${theme.panelBg} p-6 rounded-2xl shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow`}>
            <div className={`w-14 h-14 ${theme.secondary} rounded-full flex items-center justify-center mb-3`}>
              <Trophy size={28} />
            </div>
            <div className={`font-bold text-3xl ${theme.textPrimary} mb-1`}>{schedule ? schedule.blocks.filter(b => b.completed).length : 0}</div>
            <div className={`text-xs ${theme.textMuted} font-medium uppercase tracking-wider`}>Blocks Crushed</div>
         </div>
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="max-w-2xl mx-auto animate-fade-in-up pb-24 md:pb-0 space-y-8">
      <div>
        <h1 className={`text-3xl font-bold ${theme.textPrimary} mb-2`}>Settings</h1>
        <p className={theme.textMuted}>Manage your preferences and data.</p>
      </div>

      {/* Account Section */}
      <section className={`${theme.panelBg} p-6 rounded-2xl border ${theme.border}`}>
        <h2 className={`text-sm font-bold ${theme.textMuted} uppercase tracking-wider mb-4 flex items-center gap-2`}>
           <User size={16} /> Account
        </h2>
        <div className="space-y-4">
           <div>
             <label className={`text-xs font-semibold ${theme.textSecondary} block mb-1.5`}>Display Name</label>
             <input 
               type="text" 
               value={userProfile.name}
               onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
               className={`w-full bg-transparent border ${theme.border} rounded-lg p-3 text-sm ${theme.textPrimary} outline-none ${theme.ring}`}
               placeholder="Enter your name"
             />
           </div>
           <div>
             <label className={`text-xs font-semibold ${theme.textSecondary} block mb-1.5`}>User ID</label>
             <div className={`p-3 bg-black/5 rounded-lg text-xs font-mono ${theme.textMuted} break-all select-all`}>
               {userId}
             </div>
           </div>
        </div>
      </section>

      {/* Preferences Section */}
      <section className={`${theme.panelBg} p-6 rounded-2xl border ${theme.border}`}>
        <h2 className={`text-sm font-bold ${theme.textMuted} uppercase tracking-wider mb-4 flex items-center gap-2`}>
           <Settings size={16} /> Preferences
        </h2>
        <div className="space-y-1">
           {/* Sound Toggle */}
           <div className={`flex items-center justify-between p-3 rounded-xl hover:bg-black/5 transition-colors`}>
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${soundEnabled ? theme.secondary : 'bg-slate-200 text-slate-400'}`}>
                    {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                 </div>
                 <div>
                    <div className={`font-medium ${theme.textPrimary}`}>Sound Effects</div>
                    <div className={`text-xs ${theme.textMuted}`}>Play sounds on timer completion</div>
                 </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} className="sr-only peer" />
                <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:${theme.primary.split(' ')[0]}`}></div>
              </label>
           </div>

           {/* Dark Mode Toggle */}
           <div className={`flex items-center justify-between p-3 rounded-xl hover:bg-black/5 transition-colors`}>
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeThemeId === 'midnight' || activeThemeId === 'obsidian' ? 'bg-slate-700 text-white' : 'bg-orange-100 text-orange-500'}`}>
                    {activeThemeId === 'midnight' || activeThemeId === 'obsidian' ? <Moon size={20} /> : <Sun size={20} />}
                 </div>
                 <div>
                    <div className={`font-medium ${theme.textPrimary}`}>Dark Mode</div>
                    <div className={`text-xs ${theme.textMuted}`}>Switch between Light and Dark themes</div>
                 </div>
              </div>
              <button 
                 onClick={toggleDarkMode}
                 className={`px-4 py-2 text-xs font-bold rounded-lg border ${theme.border} hover:bg-black/5 transition-colors ${theme.textPrimary}`}
              >
                Toggle
              </button>
           </div>
        </div>
      </section>

      {/* Theme Gallery Section (Moved from Planning) */}
      <section className={`${theme.panelBg} p-6 rounded-2xl border ${theme.border}`}>
         <h2 className={`text-sm font-bold ${theme.textMuted} uppercase tracking-wider mb-4 flex items-center gap-2`}>
           <Palette size={16} /> Appearance
         </h2>
         <div className="grid grid-cols-1 gap-2">
            {Object.values(THEMES).map(t => {
               const isLocked = userProfile.level < t.unlockLevel;
               const isActive = activeThemeId === t.id;
               const isSaved = savedThemeId === t.id;
               
               return (
                 <button
                   key={t.id}
                   onClick={() => handleThemeInteraction(t.id)}
                   className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                     isActive ? `${theme.secondary} ${theme.border} ring-1 ring-inset ring-current` : 
                     isLocked ? `hover:bg-black/5 ${theme.border}` : 
                     `hover:bg-black/5 ${theme.border}`
                   } ${isActive && !isSaved ? 'ring-dashed opacity-90' : ''}`}
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full border shadow-sm ${t.appBg}`}></div>
                     <div>
                       <div className={`text-sm font-bold flex items-center gap-2 ${isActive ? theme.accent : theme.textPrimary}`}>
                         {t.name}
                         {isActive && isLocked && <span className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Preview</span>}
                       </div>
                       <div className="text-[10px] opacity-70">
                         {isLocked ? `Unlocks Level ${t.unlockLevel}` : 'Unlocked'}
                       </div>
                     </div>
                   </div>
                   
                   {isSaved && <CheckCircle size={16} className={theme.success} />}
                   {!isSaved && isLocked && <Lock size={14} className={theme.textMuted} />}
                   {!isSaved && !isLocked && isActive && <div className="w-4 h-4 rounded-full border-2 border-current"></div>}
                 </button>
               );
            })}
         </div>
      </section>

      {/* System Section */}
      <section className={`${theme.panelBg} p-6 rounded-2xl border ${theme.border}`}>
        <h2 className={`text-sm font-bold ${theme.textMuted} uppercase tracking-wider mb-4 flex items-center gap-2`}>
           <Shield size={16} /> System
        </h2>
        <div className="space-y-4">
           {/* API Status */}
           <div className={`flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl`}>
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400">AI Service Active</div>
              </div>
              <div className="text-xs text-emerald-600/70 font-mono">gemini-2.5-flash</div>
           </div>

           <div className="pt-4 border-t border-dashed border-slate-200">
              <button 
                onClick={clearAppData}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
              >
                <AlertTriangle size={16} />
                <span className="font-semibold text-sm">Reset All Data</span>
              </button>
           </div>
        </div>
      </section>
    </div>
  );

  // --- Main Render ---
  
  // Loading Screen
  if (isLoadingData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-500 animate-pulse">
           <Loader2 size={48} className="animate-spin text-indigo-500" />
           <p className="font-medium text-sm">Syncing with cloud...</p>
        </div>
      </div>
    );
  }

  // Check if Active Timer
  if (view === AppView.ActiveTimer && activeBlockId && schedule) {
    return (
      <ActiveTimer 
        block={schedule.blocks.find(b => b.id === activeBlockId)!}
        soundEnabled={soundEnabled}
        onComplete={completeBlock}
        onCancel={() => setView(AppView.Schedule)}
      />
    );
  }

  return (
    <div className={`h-full flex ${theme.appBg} transition-colors duration-500`}>
      
      {/* Sync Status */}
      {isSaving && (
        <div className="fixed top-4 right-4 z-50 text-xs font-semibold text-slate-400 flex items-center gap-1.5 opacity-70 bg-white/50 px-2 py-1 rounded-full backdrop-blur-sm">
           <Loader2 size={10} className="animate-spin" /> Saving...
        </div>
      )}

      {/* End of Day Modal */}
      {showSummaryModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in-up">
            <div className={`${theme.panelBg} p-8 rounded-3xl max-w-sm w-full text-center border ${theme.border} shadow-2xl transform scale-100`}>
               <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <PartyPopper size={40} className="text-yellow-600" />
               </div>
               
               <h2 className={`text-2xl font-bold ${theme.textPrimary} mb-2`}>Day Complete!</h2>
               <p className={`${theme.textMuted} mb-8`}>You crushed your schedule. Here's your summary.</p>
               
               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 rounded-xl p-4">
                     <div className="text-2xl font-bold text-slate-800">{schedule?.blocks.filter(b => b.completed && b.type === BlockType.Work).length}</div>
                     <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Blocks</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                     <div className="text-2xl font-bold text-indigo-600">+{sessionXP}</div>
                     <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">XP Earned</div>
                  </div>
               </div>

               <button 
                 onClick={claimRewards}
                 className={`w-full py-4 rounded-xl ${theme.primary} ${theme.primaryHover} font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform`}
               >
                 Claim Rewards
               </button>
            </div>
         </div>
      )}

      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className={`hidden md:flex w-64 flex-col ${theme.panelBg} h-full p-6 shadow-sm z-30 transition-colors duration-300`}>
         <div className="flex items-center gap-3 mb-12">
            <div className={`w-8 h-8 ${theme.primary} rounded-lg flex items-center justify-center font-bold`}>F</div>
            <span className={`font-bold text-lg ${theme.textPrimary} tracking-tight`}>Focus by ChromaPages</span>
         </div>
         
         <nav className="flex-1 space-y-2">
            <button 
              onClick={() => setView(AppView.Planning)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === AppView.Planning ? `${theme.secondary}` : `${theme.textMuted} hover:bg-black/5 hover:${theme.textPrimary}`}`}
            >
              <LayoutDashboard size={20} /> Planning
            </button>
            <button 
              onClick={() => schedule && setView(AppView.Schedule)}
              disabled={!schedule}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === AppView.Schedule ? `${theme.secondary}` : `${theme.textMuted} hover:bg-black/5 hover:${theme.textPrimary} disabled:opacity-50 disabled:hover:bg-transparent`}`}
            >
              <Calendar size={20} /> Timeline
            </button>
            <button 
              onClick={() => setView(AppView.Rewards)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === AppView.Rewards ? `${theme.secondary}` : `${theme.textMuted} hover:bg-black/5 hover:${theme.textPrimary}`}`}
            >
              <Trophy size={20} /> Progress
            </button>
            <button 
              onClick={() => setView(AppView.Settings)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === AppView.Settings ? `${theme.secondary}` : `${theme.textMuted} hover:bg-black/5 hover:${theme.textPrimary}`}`}
            >
              <Settings size={20} /> Settings
            </button>
         </nav>

         <div className={`pt-6 border-t ${theme.border}`}>
            <div className="flex items-center gap-3 px-2">
               <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
               </div>
               <div>
                  <div className={`text-sm font-bold ${theme.textPrimary} truncate w-32`}>{userProfile.name || 'User'}</div>
                  <div className={`text-xs ${theme.textMuted}`}>Level {userProfile.level}</div>
               </div>
            </div>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
           {view === AppView.Planning && renderPlanningView()}
           {view === AppView.Schedule && renderScheduleView()}
           {view === AppView.Rewards && renderRewardsView()}
           {view === AppView.Settings && renderSettingsView()}
        </div>
      </main>

      {/* Mobile Bottom Nav (Hidden on Desktop) */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 ${theme.panelBg} border-t ${theme.border} px-6 py-4 flex justify-between items-center z-40 pb-safe transition-colors duration-300`}>
         <button 
           onClick={() => setView(AppView.Planning)}
           className={`flex flex-col items-center gap-1 ${view === AppView.Planning ? theme.accent : theme.textMuted}`}
         >
           <LayoutDashboard size={24} />
         </button>
         
         <button 
           onClick={() => schedule && setView(AppView.Schedule)}
           disabled={!schedule}
           className={`relative flex flex-col items-center gap-1 ${view === AppView.Schedule ? theme.accent : `${theme.textMuted} disabled:opacity-30`}`}
         >
           <Calendar size={24} />
           {schedule && !schedule.blocks.every(b => b.completed) && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
         </button>

         <button 
           onClick={() => setView(AppView.Rewards)}
           className={`flex flex-col items-center gap-1 ${view === AppView.Rewards ? theme.accent : theme.textMuted}`}
         >
           <Trophy size={24} />
         </button>

         <button 
           onClick={() => setView(AppView.Settings)}
           className={`flex flex-col items-center gap-1 ${view === AppView.Settings ? theme.accent : theme.textMuted}`}
         >
           <Settings size={24} />
         </button>
      </nav>

      {/* PREVIEW BANNER */}
      {view !== AppView.Settings && activeThemeId !== savedThemeId && (
        <div className="fixed bottom-24 right-4 md:right-8 left-4 md:left-auto md:w-96 z-50 animate-fade-in-up">
           <div className={`backdrop-blur-xl bg-slate-900/90 text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-4`}>
              <div>
                 <div className="text-sm font-bold flex items-center gap-2">
                   <Eye size={16} className="text-yellow-400" /> Preview Mode
                 </div>
                 <div className="text-xs text-slate-400 mt-1">
                   Reach Level {THEMES[activeThemeId].unlockLevel} to unlock {THEMES[activeThemeId].name}.
                 </div>
              </div>
              <button 
                onClick={cancelPreview}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                title="Revert to applied theme"
              >
                <RotateCcw size={18} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;