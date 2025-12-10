

export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  estimatedMinutes: number; // User input estimate
  isDueToday: boolean;
  completed: boolean;
  notes?: string;
  imageUrl?: string;
}

export enum BlockType {
  Work = 'work',
  Break = 'break',
}

export interface ScheduleBlock {
  id: string;
  type: BlockType;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  durationMinutes: number;
  taskIds: string[]; // IDs of tasks assigned to this block
  label?: string; // e.g., "Deep Work", "Coffee Break"
  completed: boolean;
}

export interface DailySchedule {
  blocks: ScheduleBlock[];
  overflowTaskIds: string[]; // Tasks that didn't fit
}

export interface UserProfile {
  name?: string;
  xp: number;
  level: number;
  streakDays: number;
}

export interface PartnerSchedule {
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

export enum AppView {
  Onboarding = 'onboarding',
  Planning = 'planning',
  Schedule = 'schedule',
  ActiveTimer = 'activeTimer',
  Rewards = 'rewards',
  Settings = 'settings',
}

export const LEVEL_THRESHOLDS = [0, 500, 1200, 2200, 3500, 5000, 7000, 10000];

export const REWARDS = [
  { level: 1, name: "Starter Kit", description: "Unlock custom themes" },
  { level: 2, name: "Dark Mode", description: "Unlock Midnight Theme" },
  { level: 3, name: "Zen Theme", description: "Unlock Matcha Zen theme" },
  { level: 4, name: "Golden Theme", description: "Unlock Golden Hour theme" },
  { level: 5, name: "Obsidian Theme", description: "Unlock Obsidian theme" },
];

// --- THEME SYSTEM ---

export interface Theme {
  id: string;
  name: string;
  unlockLevel: number;
  // Colors & UI Tokens (Tailwind Classes)
  appBg: string;
  panelBg: string; // Glass panels
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string; // Main action buttons, active states
  primaryHover: string;
  secondary: string; // Less important elements
  accent: string; // Highlights
  border: string;
  ring: string; // Focus rings
  // Semantic colors
  success: string;
  danger: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Focus',
    unlockLevel: 1,
    appBg: 'bg-slate-50/50',
    panelBg: 'bg-white/70 backdrop-blur-lg border border-white/50',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    primary: 'bg-indigo-600 text-white',
    primaryHover: 'hover:bg-indigo-700',
    secondary: 'bg-indigo-50 text-indigo-700',
    accent: 'text-indigo-600',
    border: 'border-slate-200',
    ring: 'focus:ring-indigo-500',
    success: 'text-emerald-600',
    danger: 'text-red-500'
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Synth',
    unlockLevel: 1, // Accessible early as "Dark Mode"
    appBg: 'bg-slate-900',
    panelBg: 'bg-slate-800/60 backdrop-blur-xl border border-white/10',
    textPrimary: 'text-slate-50',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-500',
    primary: 'bg-fuchsia-600 text-white shadow-[0_0_15px_rgba(192,38,211,0.5)]',
    primaryHover: 'hover:bg-fuchsia-500',
    secondary: 'bg-slate-700 text-cyan-300',
    accent: 'text-cyan-400',
    border: 'border-slate-700',
    ring: 'focus:ring-fuchsia-500',
    success: 'text-cyan-400',
    danger: 'text-rose-500'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    unlockLevel: 2,
    appBg: 'bg-zinc-950',
    panelBg: 'bg-black border border-zinc-800',
    textPrimary: 'text-white',
    textSecondary: 'text-zinc-300',
    textMuted: 'text-zinc-600',
    primary: 'bg-white text-black font-bold',
    primaryHover: 'hover:bg-zinc-200',
    secondary: 'bg-zinc-900 text-zinc-300 border border-zinc-800',
    accent: 'text-white',
    border: 'border-zinc-800',
    ring: 'focus:ring-white',
    success: 'text-zinc-400',
    danger: 'text-red-500'
  },
  forest: {
    id: 'forest',
    name: 'Matcha Zen',
    unlockLevel: 3,
    appBg: 'bg-stone-100',
    panelBg: 'bg-[#f5f5f0]/80 backdrop-blur-md border border-stone-200',
    textPrimary: 'text-stone-800',
    textSecondary: 'text-stone-600',
    textMuted: 'text-stone-400',
    primary: 'bg-emerald-700 text-stone-50',
    primaryHover: 'hover:bg-emerald-800',
    secondary: 'bg-emerald-100 text-emerald-800',
    accent: 'text-emerald-700',
    border: 'border-stone-200',
    ring: 'focus:ring-emerald-600',
    success: 'text-emerald-700',
    danger: 'text-orange-700'
  },
  sunset: {
    id: 'sunset',
    name: 'Golden Hour',
    unlockLevel: 4,
    appBg: 'bg-orange-50',
    panelBg: 'bg-white/60 backdrop-blur-md border border-orange-100',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-800',
    textMuted: 'text-slate-500',
    primary: 'bg-rose-500 text-white',
    primaryHover: 'hover:bg-rose-600',
    secondary: 'bg-amber-100 text-amber-800',
    accent: 'text-rose-500',
    border: 'border-orange-200',
    ring: 'focus:ring-rose-500',
    success: 'text-orange-600',
    danger: 'text-red-600'
  }
};