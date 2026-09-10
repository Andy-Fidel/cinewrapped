'use client';

import { LoaderCircle, ShieldX } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAdmin } from '../lib/admin-context';
import { Header } from './header';
import { Sidebar } from './sidebar';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, error, signOut } = useAdmin();
  const isSignIn = pathname === '/sign-in';

  useEffect(() => {
    if (!isSignIn && status === 'unauthenticated') router.replace('/sign-in');
  }, [isSignIn, router, status]);

  if (isSignIn) return <>{children}</>;
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-100">
        <LoaderCircle
          className="h-7 w-7 animate-spin text-red-500"
          aria-label="Loading admin session"
        />
      </main>
    );
  }
  if (status === 'forbidden') {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-zinc-900 p-8 text-center">
          <ShieldX className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <h1 className="text-xl font-bold">Administrator access required</h1>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <button
            type="button"
            className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
            onClick={() => void signOut().then(() => router.replace('/sign-in'))}
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
