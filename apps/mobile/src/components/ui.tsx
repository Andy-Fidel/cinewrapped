import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../providers/theme-provider';

export function useColors() {
  return useTheme().colors;
}

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const colors = useColors();
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function BrandHeader({ title, body }: { title: string; body?: string }) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <Text style={[styles.eyebrow, { color: colors.brand }]}>CINEWRAPPED</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {body === undefined ? null : (
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      )}
    </View>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string | undefined }) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textDisabled}
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            color: colors.textPrimary,
          },
        ]}
        {...props}
      />
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
        <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
      )}
    </Pressable>
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
  content: { alignSelf: 'center', gap: 18, maxWidth: 640, padding: 24, width: '100%' },
  header: { gap: 10, marginBottom: 10, marginTop: 24 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.4, lineHeight: 38 },
  body: { fontSize: 16, lineHeight: 24 },
  fieldWrap: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600' },
  field: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  error: { fontSize: 13, lineHeight: 18 },
  button: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
