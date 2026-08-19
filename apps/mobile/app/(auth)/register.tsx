import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';

import {
  BrandHeader,
  BrandLogo,
  Button,
  ErrorText,
  Field,
  PasswordField,
  Screen,
  useColors,
} from '../../src/components/ui';
import { errorMessage } from '../../src/lib/error-message';
import { haptics } from '../../src/lib/haptics';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/auth-provider';

const schema = z.object({
  displayName: z.string().trim().min(1, 'Please enter your name.').max(80),
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Must include an uppercase letter.')
    .regex(/[0-9]/, 'Must include a number.'),
});
type FormValues = z.infer<typeof schema>;

const PERKS = [
  { icon: 'film-outline', text: '1-Tap Watch Logger' },
  { icon: 'stats-chart-outline', text: 'CineWrapped Annual' },
  { icon: 'trophy-outline', text: 'Trivia & 3D Trophies' },
  { icon: 'people-outline', text: 'Clubs & Reviews' },
] as const;

export default function RegisterScreen() {
  const colors = useColors();
  const { oauth } = useAuth();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '' },
    mode: 'onChange',
  });

  const passwordVal = watch('password') ?? '';
  const displayNameVal = watch('displayName') ?? '';

  // Password criteria computation
  const hasMinLength = passwordVal.length >= 8;
  const hasUppercase = /[A-Z]/.test(passwordVal);
  const hasNumber = /[0-9]/.test(passwordVal);
  const criteriaPassed = [hasMinLength, hasUppercase, hasNumber].filter(Boolean).length;

  const strengthColor = useMemo(() => {
    if (criteriaPassed === 3) return '#10B981'; // Emerald strong
    if (criteriaPassed === 2) return '#F59E0B'; // Amber fair
    if (criteriaPassed === 1) return '#EF4444'; // Red weak
    return colors.border;
  }, [criteriaPassed, colors.border]);

  const strengthLabel = useMemo(() => {
    if (criteriaPassed === 3) return 'Strong';
    if (criteriaPassed === 2) return 'Fair';
    if (criteriaPassed === 1) return 'Weak';
    return '';
  }, [criteriaPassed]);

  // Clean handle preview
  const handlePreview = useMemo(() => {
    const clean = displayNameVal
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    return clean ? `@${clean}` : '@username';
  }, [displayNameVal]);

  const submit = handleSubmit(async ({ displayName, email, password }) => {
    try {
      haptics.clapperSnap();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName } },
      });
      if (error !== null) {
        setError('root', { message: error.message });
      } else if (data.session === null) {
        setValue('password', '');
        setError('root', { message: 'Check your email to verify your account, then sign in.' });
      }
    } catch (error) {
      setError('root', { message: errorMessage(error) });
    }
  });

  const social = async (provider: 'google' | 'apple') => {
    try {
      haptics.selection();
      await oauth(provider);
    } catch (error) {
      setError('root', { message: errorMessage(error) });
    }
  };

  return (
    <Screen>
      <View style={styles.screenContent}>
        {/* Brand Hero Crest */}
        <View style={styles.heroHeader}>
          <BrandLogo size="xl" variant="full" style={{ marginBottom: 4 }} />
          <BrandHeader
            showLogo={false}
            title="Create Your Account"
            body="Your profile begins private. You control every log, rating, and review."
          />
        </View>

        {/* Member Perks Ticker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.perksContainer}
        >
          {PERKS.map((perk, index) => (
            <View
              key={index}
              style={[
                styles.perkChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name={perk.icon} size={14} color={colors.brand} />
              <Text style={[styles.perkText, { color: colors.textPrimary }]}>{perk.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Main Registration Form Card */}
        <View
          style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Display Name Input */}
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <Field
                label="Your Name or Moniker"
                autoComplete="name"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.displayName?.message}
              />
            )}
          />

          {/* Live Handle Preview Tag */}
          {displayNameVal ? (
            <View style={styles.handleBadgeRow}>
              <Text style={[styles.handleBadgeLabel, { color: colors.textSecondary }]}>
                Handle preview:
              </Text>
              <View style={[styles.handlePill, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={[styles.handlePillText, { color: colors.brand }]}>
                  cinewrapped.app/{handlePreview}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Email Address Input */}
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Field
                label="Email Address"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.email?.message}
              />
            )}
          />

          {/* Password Input */}
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordField
                label="Create Password"
                autoCapitalize="none"
                autoComplete="new-password"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.password?.message}
              />
            )}
          />

          {/* Live Interactive Password Strength & Requirements Meter */}
          {passwordVal.length > 0 ? (
            <View style={styles.strengthMeterContainer}>
              {/* Strength Bar */}
              <View style={styles.strengthBarRow}>
                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        backgroundColor: strengthColor,
                        width: `${(criteriaPassed / 3) * 100}%`,
                      },
                    ]}
                  />
                </View>
                {strengthLabel ? (
                  <Text style={[styles.strengthLabelText, { color: strengthColor }]}>
                    {strengthLabel}
                  </Text>
                ) : null}
              </View>

              {/* Requirement Checkpoints */}
              <View style={styles.criteriaRow}>
                <View style={styles.criterionItem}>
                  <Ionicons
                    name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasMinLength ? '#10B981' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.criterionText,
                      { color: hasMinLength ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    8+ chars
                  </Text>
                </View>

                <View style={styles.criterionItem}>
                  <Ionicons
                    name={hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasUppercase ? '#10B981' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.criterionText,
                      { color: hasUppercase ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    Uppercase
                  </Text>
                </View>

                <View style={styles.criterionItem}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasNumber ? '#10B981' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.criterionText,
                      { color: hasNumber ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    Number
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {errors.root?.message === undefined ? null : (
            <ErrorText>{errors.root.message}</ErrorText>
          )}

          {/* Create Account CTA */}
          <Button
            label="Create Free Account"
            loading={isSubmitting}
            onPress={() => void submit()}
          />
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
            OR SIGN UP WITH
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* 1-Tap Social OAuth Buttons */}
        <View style={styles.socialButtonsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void social('google')}
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
              Google
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => void social('apple')}
            style={({ pressed }) => [
              styles.socialButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
              Apple
            </Text>
          </Pressable>
        </View>

        {/* Navigation Link to Sign In */}
        <View style={styles.links}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Already a member?{' '}
            <Link href="/(auth)/login" style={[styles.linkText, { color: colors.brand }]}>
              Sign in
            </Link>
          </Text>
        </View>

        {/* Cinephile Privacy Shield */}
        <View style={styles.securityNoteRow}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textDisabled} />
          <Text style={[styles.securityNoteText, { color: colors.textDisabled }]}>
            Private by default · 0 ads · 0 data selling
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: 16, paddingBottom: 24 },
  heroHeader: { alignItems: 'flex-start', gap: 8 },
  perksContainer: { gap: 8, paddingVertical: 2 },
  perkChip: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  perkText: { fontSize: 12, fontWeight: '700' },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  handleBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: -6,
  },
  handleBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  handlePill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  handlePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  strengthMeterContainer: {
    gap: 8,
    marginTop: -4,
  },
  strengthBarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  strengthTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  strengthFill: {
    borderRadius: 4,
    height: '100%',
  },
  strengthLabelText: {
    fontSize: 11,
    fontWeight: '800',
  },
  criteriaRow: {
    flexDirection: 'row',
    gap: 14,
  },
  criterionItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  criterionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  socialButtonsRow: { flexDirection: 'row', gap: 10 },
  socialButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
  },
  links: { alignItems: 'center', gap: 12, marginTop: 4 },
  linkText: { fontWeight: '700' },
  securityNoteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: 4,
  },
  securityNoteText: { fontSize: 11, fontWeight: '500' },
});
