'use client';

import { LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { useAdmin } from '../../lib/admin-context';
import { adminApi } from '../../lib/admin-api';
import { supabase } from '../../lib/supabase';

type Step = 'PASSWORD' | 'VERIFY_TOTP' | 'ENROLL_TOTP';

export default function AdminSignInPage() {
  const router = useRouter();
  const { status, refreshSession } = useAdmin();
  const [step, setStep] = useState<Step>('PASSWORD');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [router, status]);

  async function bootstrapAdminSession(): Promise<void> {
    await adminApi('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        locale: navigator.language || 'en-US',
        platform: 'WEB',
        deviceName: 'CineWrapped Admin',
      }),
    });
  }

  async function prepareMfa(): Promise<void> {
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw assurance.error;
    if (assurance.data.currentLevel === 'aal2') {
      await bootstrapAdminSession();
      await refreshSession();
      router.replace('/');
      return;
    }
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    const verifiedFactor = factors.data.totp[0];
    if (verifiedFactor) {
      setFactorId(verifiedFactor.id);
      setStep('VERIFY_TOTP');
      return;
    }
    const enrollment = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'CineWrapped Admin',
    });
    if (enrollment.error) throw enrollment.error;
    setFactorId(enrollment.data.id);
    setQrCode(enrollment.data.totp.qr_code);
    setSecret(enrollment.data.totp.secret);
    setStep('ENROLL_TOTP');
  }

  async function signIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) {
      setError('The email address or password is incorrect.');
      setBusy(false);
      return;
    }
    try {
      await prepareMfa();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'MFA setup could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (result.error) {
        setError('That authentication code is invalid or expired.');
        return;
      }
      await bootstrapAdminSession();
      await refreshSession();
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Admin access could not be opened.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl shadow-black/40">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">CineWrapped</p>
            <h1 className="text-xl font-bold">Admin access</h1>
          </div>
        </div>

        {step === 'PASSWORD' ? (
          <form className="space-y-4" onSubmit={(event) => void signIn(event)}>
            <p className="text-sm text-zinc-400">
              Sign in with your assigned administrator account.
            </p>
            <label className="block text-sm font-medium">
              Email
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-red-500"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              Continue securely
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={(event) => void verifyTotp(event)}>
            {step === 'ENROLL_TOTP' ? (
              <>
                <p className="text-sm text-zinc-300">
                  Scan this QR code with an authenticator app. MFA is required for every admin
                  session.
                </p>
                {qrCode && (
                  <div className="mx-auto w-fit rounded-xl bg-white p-3">
                    <Image
                      src={qrCode}
                      alt="Authenticator enrollment QR code"
                      width={190}
                      height={190}
                      unoptimized
                    />
                  </div>
                )}
                {secret && (
                  <details className="rounded-lg border border-zinc-700 p-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer font-semibold">
                      Enter setup key manually
                    </summary>
                    <code className="mt-2 block break-all text-zinc-200">{secret}</code>
                  </details>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-300">
                Enter the six-digit code from your authenticator app.
              </p>
            )}
            <label className="block text-sm font-medium">
              Authentication code
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-center text-2xl tracking-[0.35em] outline-none focus:border-red-500"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <button
              disabled={busy || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 disabled:opacity-60"
            >
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Verify and open admin
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
