'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CheckSquare, 
  StickyNote, 
  Calendar, 
  MoreHorizontal, 
  Search,
  Settings,
  Lock,
  Target,
  Copy,
  LogOut,
  Command as CommandIcon
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

const NAV_ITEMS = [
  { href: '/today', label: 'Today', icon: LayoutDashboard },
  { href: '/planner', label: 'Planner', icon: Target },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/copy', label: 'Copy Board', icon: Copy },
  { href: '/vault', label: 'Vault', icon: Lock },
];

const SECONDARY_NAV = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/sign-out', label: 'Sign out', icon: LogOut },
];

const MOBILE_NAV = [
  { href: '/today', label: 'Today', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground font-sans">
      <div className="mx-auto flex min-h-dvh max-w-7xl relative">
        {/* Desktop Sidebar (Navigation Rail style) */}
        <aside className="hidden md:flex flex-col w-72 sticky top-0 h-screen bg-surface border-r border-outline-variant p-4">
          <div className="flex items-center gap-3 px-4 py-4 mb-6">
             <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary-on-container shadow-sm">
                <span className="font-bold text-xl">F</span>
             </div>
             <span className="font-bold text-xl tracking-tight">Focus</span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3.5 rounded-full text-sm font-medium transition-all group',
                    isActive 
                      ? 'bg-primary-container text-primary-on-container elevation-0' 
                      : 'text-foreground/70 hover:bg-surface-variant/50 hover:text-foreground'
                  )}
                >
                  <Icon size={24} className={cn(isActive && 'text-primary')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-2 mt-auto pt-4 border-t border-outline-variant space-y-1">
             {SECONDARY_NAV.map((item) => {
               const Icon = item.icon;
               return (
                 <Link
                   key={item.href}
                   href={item.href}
                   className="flex items-center gap-4 px-4 py-3 rounded-full text-sm font-medium text-foreground/70 hover:bg-surface-variant/50 hover:text-foreground transition-all"
                 >
                   <Icon size={20} />
                   {item.label}
                 </Link>
               );
             })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col bg-background">
          <div className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Bar (Material You style) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 bg-surface-container elevation-2 md:hidden pb-safe">
        <div className="flex items-center justify-around h-20 px-2">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 w-full h-full"
              >
                <div className={cn(
                   "w-16 h-8 rounded-full flex items-center justify-center transition-all",
                   isActive ? "bg-primary-container" : "bg-transparent"
                )}>
                   <Icon size={24} className={cn(isActive ? "text-primary-on-container" : "text-foreground/60")} />
                </div>
                <span className={cn(
                   "text-[12px] font-medium transition-colors",
                   isActive ? "text-foreground" : "text-foreground/60"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Command Bar Overlay (M3 Dialog inspired) */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[15vh] transition-all"
          onMouseDown={() => setCommandOpen(false)}
        >
          <Card
            elevation={3}
            className="w-full max-w-lg p-0 overflow-hidden bg-surface-container"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center p-4 gap-4 border-b border-outline-variant">
              <Search className="text-foreground/50" size={24} />
              <input 
                autoFocus
                placeholder="Search actions..." 
                className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-foreground/40"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-variant text-xs font-mono text-foreground/70">
                Esc
              </kbd>
            </div>
            <div className="p-2 max-h-[300px] overflow-y-auto">
               {['New Task', 'Quick Capture', 'Go to Today', 'Settings'].map(action => (
                   <button key={action} className="w-full text-left px-4 py-3.5 rounded-full hover:bg-surface-variant text-sm font-medium transition-colors flex items-center gap-3">
                     <div className="w-1 h-1 rounded-full bg-primary/50" />
                     {action}
                   </button>
               ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
