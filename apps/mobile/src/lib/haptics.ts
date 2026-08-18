import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * CineWrapped Tactile Haptic Engine
 * Provides tuned haptic feedback profiles for ratings, film logging, reactions, and roulette spins.
 */
class HapticsEngine {
  private isAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

  /**
   * Light selection tick - for tab switching, filter chips, and segmented controls.
   */
  public selection(): void {
    if (!this.isAvailable) return;
    try {
      void ExpoHaptics.selectionAsync();
    } catch {
      // Graceful fallback on unsupported platforms
    }
  }

  /**
   * Subtle tick for star rating increments and sliders.
   */
  public ratingStep(): void {
    if (!this.isAvailable) return;
    try {
      void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }
  }

  /**
   * Clapperboard snap - Satisfying tactile feedback when logging a viewing,
   * saving to private journal, or marking a film as Watched.
   */
  public clapperSnap(): void {
    if (!this.isAvailable) return;
    try {
      void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore
    }
  }

  /**
   * Double-pulse heart / reaction feedback when liking, favoriting, or adding to watchlist.
   */
  public heartReact(): void {
    if (!this.isAvailable) return;
    try {
      void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
      setTimeout(() => {
        void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
      }, 70);
    } catch {
      // Ignore
    }
  }

  /**
   * Roulette & Picker ticker - Light micro-haptic for wheel rotations.
   */
  public spinTick(): void {
    if (!this.isAvailable) return;
    try {
      void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }
  }

  /**
   * Celebration fanfare - Heavy victory feedback when a roulette match is picked
   * or a film trophy / achievement is unlocked.
   */
  public celebration(): void {
    if (!this.isAvailable) return;
    try {
      void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore
    }
  }

  /**
   * Error buzz - For failed operations, invalid inputs, or blocked actions.
   */
  public error(): void {
    if (!this.isAvailable) return;
    try {
      void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
    } catch {
      // Ignore
    }
  }

  /**
   * Warning / delete confirmation haptic.
   */
  public warning(): void {
    if (!this.isAvailable) return;
    try {
      void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
    } catch {
      // Ignore
    }
  }
}

export const haptics = new HapticsEngine();
