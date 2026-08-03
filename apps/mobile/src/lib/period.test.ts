import { describe, expect, it } from 'vitest';

import { yearPeriod } from './period.js';

describe('yearPeriod', () => {
  it('converts local calendar boundaries through an IANA timezone', () => {
    expect(yearPeriod(2026, 'America/New_York')).toEqual({
      periodStart: '2026-01-01T05:00:00.000Z',
      periodEnd: '2027-01-01T05:00:00.000Z',
    });
  });
});
