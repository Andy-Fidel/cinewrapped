import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';

import {
  type CalendarEventPayload,
  buildGoogleCalendarUrl,
  generateIcsContent,
} from './calendar-integration-core';

export * from './calendar-integration-core';

/**
 * Opens Google Calendar via web or native app.
 */
export async function openGoogleCalendar(event: CalendarEventPayload): Promise<void> {
  const url = buildGoogleCalendarUrl(event);
  await Linking.openURL(url);
}

/**
 * Triggers iOS / Apple Calendar native import via .ics file share or calendar handler.
 */
export async function openAppleCalendar(event: CalendarEventPayload): Promise<void> {
  const icsData = generateIcsContent(event);
  const cleanId = (event.id ?? 'watch-plan').replace(/[^a-zA-Z0-9_-]/gu, '').slice(0, 16);
  const filename = `cinewrapped-${cleanId}.ics`;

  const file = new File(Paths.cache, filename);
  file.create();
  file.write(icsData);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/calendar',
      dialogTitle: `Add "${event.title}" to Calendar`,
      UTI: 'com.apple.ical.ics',
    });
  } else {
    await Linking.openURL(`data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}`);
  }
}
