function zonedMidnight(year: number, month: number, day: number, timezone: string): Date {
  const target = Date.UTC(year, month - 1, day);
  let guess = target;
  for (let index = 0; index < 3; index += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(guess));
    const number = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    const represented = Date.UTC(
      number('year'),
      number('month') - 1,
      number('day'),
      number('hour'),
      number('minute'),
      number('second'),
    );
    guess += target - represented;
  }
  return new Date(guess);
}

export function yearPeriod(year: number, timezone: string) {
  return {
    periodStart: zonedMidnight(year, 1, 1, timezone).toISOString(),
    periodEnd: zonedMidnight(year + 1, 1, 1, timezone).toISOString(),
  };
}
