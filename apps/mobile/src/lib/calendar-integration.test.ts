import { describe, expect, it } from 'vitest';

import {
  buildGoogleCalendarUrl,
  formatGoogleCalendarDate,
  generateIcsContent,
} from './calendar-integration-core';

describe('calendar integration core', () => {
  it('formats Google Calendar UTC compact dates properly', () => {
    const d = new Date('2026-08-25T20:00:00.000Z');
    expect(formatGoogleCalendarDate(d)).toBe('20260825T200000Z');
  });

  it('builds a valid Google Calendar URL template', () => {
    const url = buildGoogleCalendarUrl({
      title: 'Inception Watch Party',
      startsAt: '2026-08-25T20:00:00.000Z',
      durationMinutes: 150,
      notes: 'Bring popcorn!',
      mediaTitle: 'Inception',
    });

    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Inception+Watch+Party');
    expect(url).toContain('20260825T200000Z%2F20260825T223000Z');
    expect(url).toContain('Bring+popcorn%21');
  });

  it('generates standard RFC-5545 iCalendar content with Apple Calendar reminders', () => {
    const ics = generateIcsContent({
      id: 'event-123',
      title: 'Dune: Part Two',
      startsAt: '2026-09-01T19:00:00.000Z',
      durationMinutes: 165,
      notes: 'IMAX 70mm screening',
      reminderMinutes: [30, 60],
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:event-123@cinewrapped.app');
    expect(ics).toContain('SUMMARY:Dune: Part Two');
    expect(ics).toContain('DESCRIPTION:IMAX 70mm screening');
    expect(ics).toContain('DTSTART:20260901T190000Z');
    expect(ics).toContain('DTEND:20260901T214500Z');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT30M');
    expect(ics).toContain('TRIGGER:-PT60M');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
