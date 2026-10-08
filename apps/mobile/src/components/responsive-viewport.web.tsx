import { useEffect } from 'react';
import { useTheme } from '../providers/theme-provider';

/** Keep the navigation viewport above mobile keyboards without restricting zoom. */
export function ResponsiveViewport() {
  const { colors } = useTheme();
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      if (viewport && viewport.scale !== 1) return;
      document.documentElement.style.setProperty(
        '--app-visible-height',
        `${viewport?.height ?? window.innerHeight}px`,
      );
    };
    update();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--app-visible-height');
    };
  }, []);
  return (
    <style>{`
    html, body, #root { width: 100%; min-width: 0; height: 100%; height: var(--app-visible-height, 100dvh); }
    body { margin: 0; background-color: ${colors.background}; }
    [dir="auto"] { overflow-wrap: anywhere; flex-shrink: 1; min-width: 0; max-width: 100%; }
    [role="button"], input, textarea { max-width: 100%; }
    [role="button"] { touch-action: manipulation; }
    [aria-modal="true"] { max-height: var(--app-visible-height, 100dvh); }
    @media (pointer: coarse) { input, textarea { font-size: 16px !important; } }
    :focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
  `}</style>
  );
}
