const storageKey = 'cinewrapped:pending-public-share';
let pending: string | null = null;
export function validShareDestination(value: unknown): string | null {
  return typeof value === 'string' &&
    (/^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value) ||
      value === '/trivia')
    ? value
    : null;
}
export function rememberShareDestination(path: string): void {
  pending = validShareDestination(path);
  if (!pending) {
    clearShareDestination();
    return;
  }
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, pending);
  } catch {
    /* In-memory navigation still works when browser storage is unavailable. */
  }
}
export function getShareDestination(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined')
      return validShareDestination(sessionStorage.getItem(storageKey)) ?? pending;
  } catch {
    /* Use memory when storage is blocked. */
  }
  return pending;
}
export function clearShareDestination(): void {
  pending = null;
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(storageKey);
  } catch {
    /* No persistent storage to clear. */
  }
}
