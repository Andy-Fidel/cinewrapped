import { afterEach, expect, it } from 'vitest';
import {
  clearShareDestination,
  getShareDestination,
  rememberShareDestination,
  validShareDestination,
} from './share-destination';
afterEach(clearShareDestination);
it('retains only public media and trivia destinations through login', () => {
  const path = '/media/00000000-0000-0000-0000-000000000001';
  rememberShareDestination(path);
  expect(getShareDestination()).toBe(path);
  clearShareDestination();
  expect(getShareDestination()).toBeNull();
  expect(validShareDestination('/trivia')).toBe('/trivia');
  for (const path of [
    '//evil.test',
    'https://evil.test',
    '/settings/privacy',
    '/wraps/private',
    '/media/../../settings',
    '/trivia?url=evil',
  ])
    expect(validShareDestination(path)).toBeNull();
});
