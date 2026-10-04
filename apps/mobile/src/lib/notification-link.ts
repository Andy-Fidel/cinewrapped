export function notificationLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (
    value === '/notifications' ||
    /^\/users\/[A-Za-z0-9_]{1,30}$/u.test(value) ||
    /^\/media\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value)
  )
    return value;
  return null;
}
