import { describe, expect, it } from 'vitest';

import { nextClockTime, nextWeekdayTime } from './calendar-dates';

describe('calendar date presets', () => {
  it('uses tonight when the screening time has not passed', () => {
    const now = new Date(2026, 7, 14, 19, 0);
    expect(nextClockTime(now, 20, 0)).toEqual(new Date(2026, 7, 14, 20, 0));
  });

  it('moves tonight to tomorrow after the screening time', () => {
    const now = new Date(2026, 7, 14, 21, 0);
    expect(nextClockTime(now, 20, 0)).toEqual(new Date(2026, 7, 15, 20, 0));
  });

  it('uses the current Friday when its screening time has not passed', () => {
    const fridayMorning = new Date(2026, 7, 14, 9, 0);
    expect(nextWeekdayTime(fridayMorning, 5, 20, 30)).toEqual(new Date(2026, 7, 14, 20, 30));
  });

  it('uses next Friday after the current Friday screening time', () => {
    const fridayNight = new Date(2026, 7, 14, 21, 0);
    expect(nextWeekdayTime(fridayNight, 5, 20, 30)).toEqual(new Date(2026, 7, 21, 20, 30));
  });
});
