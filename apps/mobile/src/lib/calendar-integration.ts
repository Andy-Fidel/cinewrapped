import * as Linking from 'expo-linking';
import { exportTextFile } from './file-export';
import {
  type CalendarEventPayload,
  buildGoogleCalendarUrl,
  generateIcsContent,
} from './calendar-integration-core';
export * from './calendar-integration-core';

/** Opens a provider template; the user still chooses whether to save the event. */
export async function openGoogleCalendar(event: CalendarEventPayload): Promise<void> {
  await Linking.openURL(buildGoogleCalendarUrl(event));
}

export async function openAppleCalendar(event: CalendarEventPayload) {
  const cleanId = (event.id ?? 'watch-plan').replace(/[^a-zA-Z0-9_-]/gu, '').slice(0, 64);
  return exportTextFile(
    generateIcsContent(event),
    `cinewrapped-${cleanId}.ics`,
    'text/calendar',
    `Add "${event.title}" to Calendar`,
    'com.apple.ical.ics',
  );
}
