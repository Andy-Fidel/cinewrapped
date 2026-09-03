import { Ionicons } from '@expo/vector-icons';
import { type PropsWithChildren, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  type DimensionValue,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '../providers/theme-provider';

export { ThemeOverride, useTheme } from '../providers/theme-provider';

export function useColors() {
  return useTheme().colors;
}

export function Screen({
  children,
  scroll = true,
  edges,
}: PropsWithChildren<{ scroll?: boolean; edges?: Edge[] }>) {
  const colors = useColors();
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView
      {...(edges === undefined ? {} : { edges })}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      {scroll ? (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

import { BrandLogo } from './brand-logo';

export { BrandLogo } from './brand-logo';

export function BrandHeader({
  title,
  body,
  eyebrow = 'CINEWRAPPED',
  action,
  showLogo = true,
}: {
  title: string;
  body?: string | undefined;
  eyebrow?: string | undefined;
  action?: ReactNode;
  showLogo?: boolean | undefined;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={{ flex: 1, gap: 4 }}>
          {showLogo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <BrandLogo size="sm" variant="mark" />
              {eyebrow ? (
                <Text style={[styles.eyebrow, { color: colors.brand }]}>{eyebrow}</Text>
              ) : null}
            </View>
          ) : eyebrow ? (
            <Text style={[styles.eyebrow, { color: colors.brand }]}>{eyebrow}</Text>
          ) : null}
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {title}
          </Text>
        </View>
        {action}
      </View>
      {body === undefined ? null : (
        <Text maxFontSizeMultiplier={1.2} style={[styles.body, { color: colors.textSecondary }]}>
          {body}
        </Text>
      )}
    </View>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Text style={[styles.sectionEyebrow, { color: colors.brand }]}>{eyebrow}</Text>
        ) : null}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: colors.brand }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function PosterImage({
  uri,
  size = 'md',
  rounded = 10,
  style,
}: {
  uri: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'fill';
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();

  const dimensions =
    size === 'xs'
      ? { width: 32, height: 48 }
      : size === 'sm'
        ? { width: 44, height: 66 }
        : size === 'md'
          ? { width: 64, height: 96 }
          : size === 'lg'
            ? { width: 88, height: 132 }
            : { aspectRatio: 2 / 3, width: '100%' as const };

  return (
    <View
      style={[
        styles.posterWrapper,
        dimensions,
        {
          borderRadius: rounded,
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { borderRadius: rounded }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.posterFallback, { borderRadius: rounded }]}>
          <Ionicons
            name="film-outline"
            size={size === 'xs' ? 14 : size === 'sm' ? 18 : 24}
            color={colors.textDisabled}
          />
        </View>
      )}
    </View>
  );
}

export function StarRating({
  rating,
  size = 'sm',
  showLabel = true,
  style,
}: {
  rating: number | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (rating === null) return null;

  return (
    <View style={[styles.starRatingBadge, size === 'md' && styles.starRatingBadgeMd, style]}>
      <Ionicons name="star" size={size === 'md' ? 13 : 10} color="#FFD700" />
      {showLabel && (
        <Text style={[styles.starRatingText, size === 'md' && styles.starRatingTextMd]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

export function Card({
  children,
  variant = 'default',
  style,
}: PropsWithChildren<{
  variant?: 'default' | 'raised' | 'highlight';
  style?: StyleProp<ViewStyle>;
}>) {
  const colors = useColors();
  const bg = variant === 'raised' ? colors.surfaceRaised : colors.surface;
  const borderColor = variant === 'highlight' ? colors.brand : colors.border;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'highlight' ? 1.5 : 1.2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function EmptyState({
  icon = 'film-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.emptyContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}
      >
        <Ionicons name={icon} size={32} color={colors.brand} />
      </View>
      <Text style={[styles.emptyTitleText, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.emptySubtitleText, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.emptyActionBtn,
            { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="sparkles" size={16} color={colors.onBrand} />
          <Text style={[styles.emptyActionBtnText, { color: colors.onBrand }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string | undefined }) {
  return <LabeledInput error={error} label={label} inputProps={props} />;
}

export function PasswordField({
  label,
  error,
  ...props
}: Omit<TextInputProps, 'secureTextEntry'> & { label: string; error?: string | undefined }) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  return (
    <LabeledInput
      error={error}
      label={label}
      inputProps={{
        autoCapitalize: props.autoCapitalize ?? 'none',
        autoCorrect: props.autoCorrect ?? false,
        ...props,
        secureTextEntry: !visible,
      }}
      trailing={
        <Pressable
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setVisible((current) => !current)}
          style={styles.visibilityToggle}
        >
          <Ionicons
            color={colors.textSecondary}
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
          />
        </Pressable>
      }
    />
  );
}

function LabeledInput({
  error,
  inputProps,
  label,
  trailing,
}: {
  error?: string | undefined;
  inputProps: TextInputProps;
  label: string;
  trailing?: ReactNode;
}) {
  const colors = useColors();
  const { style, ...props } = inputProps;
  return (
    <View style={styles.fieldWrap}>
      <Text maxFontSizeMultiplier={1.2} style={[styles.label, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textDisabled}
          style={[
            styles.fieldInput,
            trailing === undefined ? null : styles.fieldInputWithTrailing,
            { color: colors.textPrimary },
            style,
          ]}
          {...props}
          maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? 1.2}
        />
        {trailing}
      </View>
      {error === undefined ? null : (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading = false,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const colors = useColors();
  const background = variant === 'primary' ? colors.brand : colors.surfaceRaised;
  const foreground =
    variant === 'primary'
      ? colors.onBrand
      : variant === 'danger'
        ? colors.danger
        : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: pressed || disabled ? 0.65 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text maxFontSizeMultiplier={1.2} style={[styles.buttonText, { color: foreground }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Skeleton({
  width,
  height,
  rounded = 10,
  style,
}: {
  width?: number | string | undefined;
  height?: number | string | undefined;
  rounded?: number | undefined;
  style?: StyleProp<ViewStyle> | undefined;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as DimensionValue,
          height: height as DimensionValue,
          borderRadius: rounded,
          backgroundColor: colors.surfaceRaised,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonText({
  lines = 2,
  style,
}: {
  lines?: number | undefined;
  style?: StyleProp<ViewStyle> | undefined;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 && lines > 1 ? '65%' : '100%'}
          rounded={4}
        />
      ))}
    </View>
  );
}

export function ErrorText({ children }: PropsWithChildren) {
  const colors = useColors();
  return (
    <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 640,
    minWidth: 0,
    padding: 20,
    paddingBottom: 36,
    width: '100%',
  },
  header: { gap: 8, marginBottom: 10, marginTop: 12 },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { flexShrink: 1, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  body: { flexShrink: 1, fontSize: 14, lineHeight: 20 },

  // Section Header
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 12,
  },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionAction: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  sectionActionText: { fontSize: 13, fontWeight: '700' },

  // Poster Image (Strict 2:3 ratio)
  posterWrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  posterFallback: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },

  // Star Rating Badge
  starRatingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 5,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  starRatingBadgeMd: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  starRatingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  starRatingTextMd: {
    fontSize: 12,
  },

  // Card
  cardContainer: {
    borderRadius: 16,
    gap: 12,
    padding: 16,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.2,
    gap: 10,
    padding: 24,
    textAlign: 'center',
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  emptyTitleText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySubtitleText: { fontSize: 13, lineHeight: 18, maxWidth: 280, textAlign: 'center' },
  emptyActionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionBtnText: { fontSize: 13, fontWeight: '800' },

  // Fields
  fieldWrap: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600' },
  field: {
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    position: 'relative',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fieldInputWithTrailing: { paddingRight: 50 },
  visibilityToggle: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 50,
  },
  error: { fontSize: 13, lineHeight: 18 },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 20,
  },
  buttonText: { flexShrink: 1, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
