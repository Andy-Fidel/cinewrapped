import type { Metadata } from 'next';

import { AdminShell } from '../components/admin-shell';
import { AppProviders } from '../lib/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'CineWrapped Operations & Admin Portal',
  description:
    'Mission-critical administration, moderation, and infrastructure operations for CineWrapped.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <AppProviders>
          <AdminShell>{children}</AdminShell>
        </AppProviders>
      </body>
    </html>
  );
}
