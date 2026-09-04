import { Platform } from 'react-native';

export function platformFontScaleLimit(defaultLimit: number): number {
  return Platform.OS === 'android' ? 1 : defaultLimit;
}
