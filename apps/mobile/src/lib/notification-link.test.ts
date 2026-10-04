import { describe, expect, it } from 'vitest';
import { notificationLink } from './notification-link';
describe('push notification links', () => {
  it('accepts supported internal destinations', () => {
    expect(notificationLink('/notifications')).toBe('/notifications');
    expect(notificationLink('/users/movie_fan')).toBe('/users/movie_fan');
    expect(notificationLink('/media/10000000-0000-4000-8000-000000000001')).toBeTruthy();
  });
  it.each([
    'https://example.test',
    '//example.test',
    '/users/../settings',
    '/settings/security',
    '/media/not-a-uuid',
    null,
  ])('rejects an untrusted destination %s', (value) => {
    expect(notificationLink(value)).toBeNull();
  });
});
