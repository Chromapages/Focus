import React, { useState } from 'react';
import AppLayout from './layout/AppLayout';
import PlanningView from './features/planning/PlanningView';
import SettingsView from './features/profile/SettingsView';
import ScheduleView from './features/schedule/ScheduleView';
import AddTaskSheet from './features/planning/AddTaskSheet';
import { ToastContainer } from './components/ui/Toast';
import BattlePass from './components/BattlePass';
import LiveAssistant from './components/LiveAssistant';
import ActiveTimer from './components/ActiveTimer';
import { AppProvider, useApp } from './context/AppContext';
import { AppView, LEVEL_THRESHOLDS } from './types';

const AppContent: React.FC = () => {
  const {
    userProfile, setUserProfile,
    tasks, setTasks,
    appointments, setAppointments,
    schedule, setSchedule,
    theme,
    toasts, removeToast
  } = useApp();

  const [view, setView] = useState<AppView>(AppView.Planning);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const addTask = (newTask: any) => {
    setTasks(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 15),
      completed: false,
      ...newTask
    }]);
  };

  const addAppointment = (newApp: any) => {
    setAppointments(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 15),
      ...newApp
    }]);
  };

  const handleActiveTimerComplete = (actualStart: string, actualEnd: string) => {
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
  };

  return (
    <div className={`h-full w-full ${theme.appBg} text-brand-text`}>
      {view === AppView.VoiceAssistant && (
        <LiveAssistant
          theme={theme}
          onClose={() => setView(AppView.Planning)}
          tasks={tasks}
          appointments={appointments}
          onAddTask={addTask}
          onSetAppointment={addAppointment}
        />
      )}

      <AppLayout
        currentView={view}
        onViewChange={setView}
        userProfile={userProfile}
        onAddTask={() => setIsAddTaskOpen(true)}
      >
        {view === AppView.Planning && <PlanningView onViewChange={setView} />}

        {view === AppView.Schedule && schedule && (
          <ScheduleView onViewChange={setView} setActiveBlockId={setActiveBlockId} />
        )}

        {view === AppView.Rewards && (
          <div className="animate-fade-in-up space-y-8">
            <header>
              <h1 className="text-4xl font-heading font-thin tracking-tight text-brand-primary">The Journey</h1>
              <p className="text-slate-500 text-lg font-light">Track your growth and claim system-wide custom skins.</p>
            </header>
            <BattlePass userProfile={userProfile} />
          </div>
        )}

        {view === AppView.Settings && <SettingsView />}
      </AppLayout>

      <AddTaskSheet
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onAddTask={addTask}
      />

      {activeBlockId && schedule && (
        <ActiveTimer
          block={schedule.blocks.find(b => b.id === activeBlockId)!}
          soundEnabled={soundEnabled}
          onComplete={handleActiveTimerComplete}
          onCancel={() => setActiveBlockId(null)}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
