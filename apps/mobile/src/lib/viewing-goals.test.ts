import { describe, expect, it } from 'vitest';
import { calendarDateParts, parseViewingGoal, viewingGoalProgress } from './viewing-goals';

describe('viewing goals', () => {
  it('uses the profile calendar day at a year boundary', () => {
    const now = new Date('2027-01-01T00:30:00Z');
    expect(calendarDateParts('America/Los_Angeles', now).key).toBe('2026-12-31');
    expect(calendarDateParts('Pacific/Kiritimati', now).key).toBe('2027-01-01');
  });
  it('counts each month separately and excludes future records', () => {
    const days = [
      { date: '2024-01-10', count: 2 },
      { date: '2024-02-01', count: 3 },
      { date: '2024-02-29', count: 8 },
      { date: '2023-02-01', count: 9 },
    ];
    const now = new Date('2024-02-15T12:00:00Z');
    expect(viewingGoalProgress(days, 'UTC', 'monthly', 10, now)).toMatchObject({
      count: 3,
      totalDays: 29,
      elapsedDays: 15,
      remaining: 7,
      percent: 30,
    });
    expect(viewingGoalProgress(days, 'UTC', 'annual', 4, now)).toMatchObject({
      count: 5,
      totalDays: 366,
      remaining: 0,
      percent: 100,
    });
  });
  it('uses calendar days across daylight saving changes', () => {
    expect(
      viewingGoalProgress([], 'America/New_York', 'monthly', 31, new Date('2026-03-09T04:05:00Z')),
    ).toMatchObject({ elapsedDays: 9, totalDays: 31, paceDelta: -9 });
  });
  it('supports disabled goals and validates whole-number limits', () => {
    expect(parseViewingGoal(' ')).toBeNull();
    expect(parseViewingGoal(' 10000 ')).toBe(10000);
    for (const value of ['0', '-1', '1.5', '10001', '1e2', 'abc'])
      expect(() => parseViewingGoal(value)).toThrow();
    expect(viewingGoalProgress([], 'UTC', 'annual', null)).toMatchObject({
      remaining: null,
      paceDelta: null,
      percent: 0,
    });
  });
});
