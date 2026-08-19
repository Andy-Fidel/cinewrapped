export interface CalendarEventPayload {
  id?: string | undefined;
  title: string;
  startsAt: string | Date;
  durationMinutes?: number | undefined;
  notes?: string | null | undefined;
  mediaTitle?: string | null | undefined;
  reminderMinutes?: number[] | undefined;
  timezone?: string | undefined;
}

/**
 * Format a Date or ISO string into UTC compact format for Google Calendar (YYYYMMDDTHHmmssZ)
 */
export function formatGoogleCalendarDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d
    .toISOString()
    .replace(/[-:]/gu, '')
    .replace(/\.\d{3}Z$/u, 'Z');
}

/**
 * Builds a direct Google Calendar web/app template URL.
 */
export function buildGoogleCalendarUrl(event: CalendarEventPayload): string {
  const start = typeof event.startsAt === 'string' ? new Date(event.startsAt) : event.startsAt;
  const duration = event.durationMinutes ?? 120;
  const end = new Date(start.getTime() + duration * 60_000);

  const lines: string[] = [];
  if (event.notes) lines.push(event.notes);
  if (event.mediaTitle && event.mediaTitle !== event.title) {
    lines.push(`🎬 Title: ${event.mediaTitle}`);
  }
  lines.push('🍿 Scheduled with CineWrapped (https://cinewrapped.app)');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(end)}`,
    details: lines.join('\n\n'),
    location: 'CineWrapped Watch Night',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an RFC-5545 compliant iCalendar string for Apple / iOS Calendar import.
 */
export function generateIcsContent(event: CalendarEventPayload): string {
  const eventId = event.id ?? `cinewrapped-${Date.now()}`;
  const start = typeof event.startsAt === 'string' ? new Date(event.startsAt) : event.startsAt;
  const duration = event.durationMinutes ?? 120;
  const end = new Date(start.getTime() + duration * 60_000);
  const now = new Date();

  const formatIcs = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/gu, '')
      .replace(/\.\d{3}Z$/u, 'Z');

  const escapeIcs = (value: string) =>
    value.replace(/([\\,;])/gu, '\\$1').replace(/\r\n|\n|\r/gu, '\\n');

  const notesLines: string[] = [];
  if (event.notes) notesLines.push(event.notes);
  if (event.mediaTitle && event.mediaTitle !== event.title) {
    notesLines.push(`Title: ${event.mediaTitle}`);
  }
  notesLines.push('Scheduled with CineWrapped — https://cinewrapped.app');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CineWrapped//Cinema Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${eventId}@cinewrapped.app`,
    `DTSTAMP:${formatIcs(now)}`,
    `DTSTART:${formatIcs(start)}`,
    `DTEND:${formatIcs(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(notesLines.join('\\n\\n'))}`,
    'LOCATION:CineWrapped Watch Night',
    'STATUS:CONFIRMED',
    'CATEGORIES:Cinema,Entertainment,Movies',
  ];

  // Add Alarm / Reminder for Apple Calendar
  const reminders =
    event.reminderMinutes && event.reminderMinutes.length > 0
      ? event.reminderMinutes
      : [30];

  for (const reminder of reminders) {
    icsLines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcs(`Movie Time: ${event.title}`)}`,
      `TRIGGER:-PT${reminder}M`,
      'END:VALARM',
    );
  }

  icsLines.push('END:VEVENT', 'END:VCALENDAR', '');
  return icsLines.join('\r\n');
}
