import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from './ui';

export function SettingsCard({
  children,
  icon,
  title,
  body,
}: PropsWithChildren<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
}>) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeaderRow}>
        <Ionicons name={icon} size={20} color={colors.brand} />
        <Text style={[styles.heading, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {body === undefined ? null : (
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      )}
      {children}
    </View>
  );
}

export function SettingsLink({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityHint={detail}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.linkIcon, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <View style={styles.grow}>
        <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.linkDetail, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color={colors.textDisabled} />
    </Pressable>
  );
}

export function ToggleRow({
  label,
  body,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  body?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.toggleRow, { opacity: pressed || disabled ? 0.65 : 1 }]}
    >
      <View style={styles.grow}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
        {body === undefined ? null : (
          <Text style={[styles.toggleBody, { color: colors.textSecondary }]}>{body}</Text>
        )}
      </View>
      <View
        style={[
          styles.switchTrack,
          { backgroundColor: value ? colors.brand : colors.surfaceRaised },
        ]}
      >
        <View
          style={[
            styles.switchThumb,
            { backgroundColor: value ? colors.onBrand : colors.textDisabled },
            value ? styles.switchThumbOn : null,
          ]}
        />
      </View>
    </Pressable>
  );
}

export function ChoiceRow<TValue extends string | number>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: TValue;
  options: ReadonlyArray<{ label: string; value: TValue }>;
  disabled?: boolean;
  onChange: (value: TValue) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.choiceWrap}>
      <Text style={[styles.choiceLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.choices}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled || selected}
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: selected ? colors.brand : colors.surfaceRaised,
                  borderColor: selected ? colors.brand : colors.border,
                  opacity: pressed || disabled ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.onBrand : colors.textPrimary,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SelectChip({
  label,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.surfaceRaised,
          borderColor: selected ? colors.brand : colors.border,
          opacity: pressed || disabled ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.onBrand : colors.textPrimary,
          fontSize: 12,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const settingsControlStyles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fields: { gap: 12 },
});

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, gap: 14, padding: 18 },
  sectionHeaderRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  heading: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  grow: { flex: 1 },
  link: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 14,
  },
  linkIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  linkLabel: { fontSize: 15, fontWeight: '800' },
  linkDetail: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 16, minHeight: 50 },
  toggleLabel: { fontSize: 14, fontWeight: '700' },
  toggleBody: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  switchTrack: { borderRadius: 14, height: 28, padding: 3, width: 48 },
  switchThumb: { borderRadius: 11, height: 22, width: 22 },
  switchThumbOn: { marginLeft: 20 },
  choiceWrap: { gap: 8 },
  choiceLabel: { fontSize: 14, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 82,
    paddingHorizontal: 12,
  },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
});
