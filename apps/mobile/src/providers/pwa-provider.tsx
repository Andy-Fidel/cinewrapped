import type { PropsWithChildren } from 'react';

// Installation and service workers belong only to the web build.
export function PwaProvider({ children }: PropsWithChildren) {
  return children;
}
