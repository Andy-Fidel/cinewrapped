import type { Metadata } from 'next';

import { Header } from '../components/header';
import { Sidebar } from '../components/sidebar';
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
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 p-8 overflow-y-auto">{children}</main>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
