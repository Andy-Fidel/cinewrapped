import type { ActivityHeatmapDay } from '@cinewrapped/shared-types';

export function calendarDateParts(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => parts.find((value) => value.type === name)!.value;
  return {
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    key: `${part('year')}-${part('month')}-${part('day')}`,
  };
}

export function viewingGoalProgress(
  days: Pick<ActivityHeatmapDay, 'date' | 'count'>[],
  timezone: string,
  period: 'annual' | 'monthly',
  target: number | null,
  now = new Date(),
) {
  const today = calendarDateParts(timezone, now);
  const prefix = period === 'annual' ? today.key.slice(0, 4) : today.key.slice(0, 7);
  const count = days
    .filter((day) => day.date.startsWith(prefix) && day.date <= today.key)
    .reduce((total, day) => total + day.count, 0);
  const start = Date.UTC(today.year, period === 'annual' ? 0 : today.month - 1, 1);
  const end =
    period === 'annual' ? Date.UTC(today.year + 1, 0, 1) : Date.UTC(today.year, today.month, 1);
  const totalDays = (end - start) / 86400000;
  const elapsedDays = (Date.UTC(today.year, today.month - 1, today.day) - start) / 86400000 + 1;
  const enabled = target !== null && target > 0;
  return {
    count,
    totalDays,
    elapsedDays,
    percent: enabled ? Math.min(100, Math.round((count / target) * 100)) : 0,
    remaining: enabled ? Math.max(0, target - count) : null,
    paceDelta: enabled ? count - Math.floor((target * elapsedDays) / totalDays) : null,
  };
}

export function parseViewingGoal(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+$/u.test(value.trim()))
    throw new Error('Enter a whole number from 1 to 10,000, or leave blank to disable.');
  const goal = Number(value.trim());
  if (goal < 1 || goal > 10000)
    throw new Error('Enter a whole number from 1 to 10,000, or leave blank to disable.');
  return goal;
}
