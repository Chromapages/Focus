import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Sparkles, Layout, CheckCircle2, Shield } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-secondary/10 rounded-full blur-[120px] -z-10" />
      
      {/* Header */}
      <header className="px-6 py-8 md:px-12 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <span className="text-white font-bold text-lg italic">F</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Focus</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Button variant="primary" size="sm" asChild>
            <Link href="/today">Open App</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto mt-12 mb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-accent mb-6 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles size={12} />
          Your New Productivity OS
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
          Focus on what <br /> matters most.
        </h1>
        
        <p className="text-lg md:text-xl text-foreground/60 mb-10 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
          A single-user productivity operating system for tasks, notes, calendar, and AI-driven outcomes. Streamlined for clarity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <Button variant="primary" size="lg" className="px-10 h-14 text-base" asChild>
            <Link href="/today" className="flex items-center gap-2">
              Get Started <ArrowRight size={18} />
            </Link>
          </Button>
          <Button variant="secondary" size="lg" className="px-10 h-14 text-base" asChild>
             <Link href="/settings">Configure Focus</Link>
          </Button>
        </div>

        {/* Feature Grid Preview */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
           {[
             { title: 'Task Matrix', desc: 'Organize by priority and due dates.', icon: CheckCircle2 },
             { title: 'Second Brain', desc: 'A unified vault for notes and data.', icon: Layout },
             { title: 'Secure Vault', desc: 'Privately stored user-owned records.', icon: Shield },
           ].map((feature, i) => (
             <div key={i} className="glass p-6 rounded-2xl text-left border-white/5 hover:border-white/10 transition-colors group">
               <feature.icon size={24} className="text-accent mb-4 group-hover:scale-110 transition-transform" />
               <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
               <p className="text-sm text-foreground/40">{feature.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-border-subtle bg-surface-primary/30 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm italic">F</span>
            </div>
            <span className="text-sm font-semibold text-foreground/60">Focus (ChromaPages)</span>
          </div>
          <p className="text-xs text-foreground/30">
            Next: Firebase Google Sign-in • Google Calendar Sync • AI Pipeline
          </p>
        </div>
      </footer>
    </main>
  );
}

// Helper to allow Button to behave like its child (next/link)
function asChildHelper(children: React.ReactNode) {
  return children;
}
