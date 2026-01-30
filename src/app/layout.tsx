import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Focus (ChromaPages)',
  description: 'Single-user productivity OS for tasks, notes, calendar, vault, and AI meeting outcomes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
