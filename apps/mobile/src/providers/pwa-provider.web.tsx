import { useEffect, useState, type PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { Button, useColors } from '../components/ui';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaProvider({ children }: PropsWithChildren) {
  const colors = useColors();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [update, setUpdate] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIos(!installed && /iPad|iPhone|iPod/.test(navigator.userAgent));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setPrompt(null);
      setIos(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const onState = () => {
      if (active && installing?.state === 'installed' && navigator.serviceWorker.controller)
        setUpdate(true);
    };
    const onUpdate = () => {
      installing?.removeEventListener('statechange', onState);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', onState);
    };
    const checkUpdate = () => {
      if (document.visibilityState === 'visible') void registration?.update().catch(() => {});
    };
    if (!__DEV__ && window.isSecureContext && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((result) => {
          if (!active) return;
          registration = result;
          setUpdate(Boolean(result.waiting));
          result.addEventListener('updatefound', onUpdate);
          onUpdate();
        })
        .catch(() => {
          if (active) setError('Offline startup is unavailable. You can still use the app online.');
        });
    }
    document.addEventListener('visibilitychange', checkUpdate);
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      document.removeEventListener('visibilitychange', checkUpdate);
      registration?.removeEventListener('updatefound', onUpdate);
      installing?.removeEventListener('statechange', onState);
    };
  }, []);
  const install = async () => {
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch {
      setError('Use your browser’s menu to install CineWrapped.');
    }
  };
  return (
    <View style={{ flex: 1 }}>
      {children}
      {!dismissed && (prompt || ios || update || error) ? (
        <View style={{ backgroundColor: colors.surfaceRaised, padding: 12, gap: 8 }}>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.textPrimary }}>
            {error ||
              (update
                ? 'An update is ready. Close all CineWrapped tabs and reopen the app when you’re ready.'
                : ios
                  ? 'Install CineWrapped: in Safari, tap Share, then Add to Home Screen.'
                  : 'Keep CineWrapped on your home screen for quick access.')}
          </Text>
          {prompt && !update ? (
            <Button label="Install CineWrapped" onPress={() => void install()} />
          ) : null}
          <Button label="Dismiss" variant="secondary" onPress={() => setDismissed(true)} />
        </View>
      ) : null}
    </View>
  );
}
