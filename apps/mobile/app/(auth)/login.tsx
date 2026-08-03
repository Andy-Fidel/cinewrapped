import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { BrandHeader, Button, ErrorText, Field, Screen, useColors } from '../../src/components/ui';
import { errorMessage } from '../../src/lib/error-message';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/auth-provider';

const schema = z.object({ email: z.email(), password: z.string().min(8) });
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
      <BrandHeader
        title="Welcome back"
        body="Track every watch, then see the story your taste tells."
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Field
            label="Email"
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
          <Field
            label="Password"
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />
      {errors.root?.message === undefined ? null : <ErrorText>{errors.root.message}</ErrorText>}
      <Button label="Sign in" loading={isSubmitting} onPress={() => void submit()} />
      <Button
        label="Continue with Google"
        variant="secondary"
        onPress={() => void social('google')}
      />
      <Button
        label="Continue with Apple"
        variant="secondary"
        onPress={() => void social('apple')}
      />
      <View style={styles.links}>
        <Link href="/(auth)/forgot-password" style={{ color: colors.brand }}>
          Forgot password?
        </Link>
        <Text style={{ color: colors.textSecondary }}>
          New here?{' '}
          <Link href="/(auth)/register" style={{ color: colors.brand }}>
            Create account
          </Link>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ links: { alignItems: 'center', gap: 14, marginTop: 4 } });
