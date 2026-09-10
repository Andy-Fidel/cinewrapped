'use client';

import { LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAdmin } from '../lib/admin-context';
import { Badge } from './ui/badge';

export function Header() {
  const router = useRouter();
  const { session, signOut } = useAdmin();
  const role = session?.roles[0]?.replaceAll('_', ' ') ?? 'ADMIN';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 px-8 backdrop-blur-xl">
      <div>
        <p className="text-xs font-semibold text-zinc-100">{session?.displayName}</p>
        <p className="text-[11px] text-zinc-500">{session?.email}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="success" className="gap-1 py-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          MFA verified · {role}
        </Badge>
        <button
          type="button"
          aria-label="Sign out"
          className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:border-zinc-700 hover:text-white"
          onClick={() => void signOut().then(() => router.replace('/sign-in'))}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
