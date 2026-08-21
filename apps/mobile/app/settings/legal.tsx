import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, useColors } from '../../src/components/ui';
import { haptics } from '../../src/lib/haptics';

export default function LegalSettingsScreen() {
  const colors = useColors();

  const legalItems = [
    {
      id: 'terms',
      title: 'Terms of Service & EULA',
      subtitle: 'Community guidelines & zero-tolerance policy',
      icon: 'document-text-outline',
      route: '/settings/terms' as const,
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'Data handling, safety & retention disclosures',
      icon: 'shield-checkmark-outline',
      route: '/settings/privacy-policy' as const,
    },
  ];

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Legal & Compliance',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {legalItems.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => {
                haptics.selection();
                router.push(item.route);
              }}
              style={({ pressed }) => [
                styles.itemRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: index < legalItems.length - 1 ? 1 : 0,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name={item.icon as any} size={20} color={colors.brand} />
              </View>

              <View style={styles.textWrap}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
            </Pressable>
          ))}
        </View>

        <View style={styles.attributionBox}>
          <Text style={[styles.attributionText, { color: colors.textSecondary }]}>
            CineWrapped v0.1.0 (Build 2026.1)
          </Text>
          <Text style={[styles.attributionSub, { color: colors.textSecondary }]}>
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 12,
  },
  attributionBox: {
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  attributionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  attributionSub: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 280,
  },
});
