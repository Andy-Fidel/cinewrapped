import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { rememberShareDestination } from '../lib/share-destination';
export function ShareLoginRedirect({ path }: { path: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    rememberShareDestination(path);
    setReady(true);
  }, [path]);
  return ready ? <Redirect href="/(auth)/login" /> : null;
}
