import { AppShell } from '@/components/shell/AppShell';
import { AuthGate } from '@/components/auth/AuthGate';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <AuthGate>{children}</AuthGate>
    </AppShell>
  );
}
