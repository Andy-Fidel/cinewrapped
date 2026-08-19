import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/auth-provider';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const colors = useColors();
  const { oauth } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error !== null) setError('root', { message: error.message });
    } catch (error) {
      setError('root', { message: errorMessage(error) });
    }
  });

  const social = async (provider: 'google' | 'apple') => {
    try {
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
          <BrandLogo size="xl" variant="full" style={{ marginBottom: 8 }} />
          <BrandHeader
            showLogo={false}
            title="Welcome Back"
            body="Track every watch, then see the story your taste tells."
          />
        </View>

        {/* Main Login Form Card */}
        <View
          style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Field
                label="Email Address"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordField
                label="Password"
                autoCapitalize="none"
                autoComplete="current-password"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.password?.message}
              />
            )}
          />

          {errors.root?.message === undefined ? null : <ErrorText>{errors.root.message}</ErrorText>}

          <Button label="Sign In" loading={isSubmitting} onPress={() => void submit()} />
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
            OR CONTINUE WITH
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Social OAuth Buttons */}
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

        {/* Navigation Links & Footer */}
        <View style={styles.links}>
          <Link href="/(auth)/forgot-password" style={[styles.linkText, { color: colors.brand }]}>
            Forgot password?
          </Link>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            New here?{' '}
            <Link href="/(auth)/register" style={[styles.linkText, { color: colors.brand }]}>
              Create account
            </Link>
          </Text>
        </View>

        {/* Security Note */}
        <View style={styles.securityNoteRow}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textDisabled} />
          <Text style={[styles.securityNoteText, { color: colors.textDisabled }]}>
            End-to-end encrypted authentication
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: 18 },
  heroHeader: { alignItems: 'flex-start', gap: 12 },
  logoBadge: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
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
  links: { alignItems: 'center', gap: 12, marginTop: 8 },
  linkText: { fontWeight: '700' },
  securityNoteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: 10,
  },
  securityNoteText: { fontSize: 11, fontWeight: '500' },
});
