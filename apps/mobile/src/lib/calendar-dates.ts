export function nextClockTime(now: Date, hour: number, minute: number): Date {
  const result = new Date(now);
  result.setHours(hour, minute, 0, 0);
  if (result.getTime() <= now.getTime()) result.setDate(result.getDate() + 1);
  return result;
}

export function nextWeekdayTime(now: Date, weekday: number, hour: number, minute: number): Date {
  const result = new Date(now);
  const daysUntilTarget = (weekday - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + daysUntilTarget);
  result.setHours(hour, minute, 0, 0);
  if (result.getTime() <= now.getTime()) result.setDate(result.getDate() + 7);
  return result;
}
