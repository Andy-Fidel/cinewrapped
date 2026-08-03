import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';

import {
  BrandHeader,
  Button,
  ErrorText,
  Field,
  PasswordField,
  Screen,
  useColors,
} from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';

const schema = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Add an uppercase letter.')
    .regex(/[0-9]/, 'Add a number.'),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const colors = useColors();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '' },
  });
  const submit = handleSubmit(async ({ displayName, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    });
    if (error !== null) setError('root', { message: error.message });
    else if (data.session === null) {
      setValue('password', '');
      setError('root', { message: 'Check your email to verify your account, then sign in.' });
    }
  });
  return (
    <Screen>
      <BrandHeader
        title="Start your reel"
        body="Your profile begins private. You control what becomes social."
      />
      <Controller
        control={control}
        name="displayName"
        render={({ field }) => (
          <Field
            label="Display name"
            autoComplete="name"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={errors.displayName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Field
            label="Email"
            autoCapitalize="none"
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
            autoComplete="new-password"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />
      {errors.root?.message === undefined ? null : <ErrorText>{errors.root.message}</ErrorText>}
      <Button label="Create account" loading={isSubmitting} onPress={() => void submit()} />
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
        Already a member?{' '}
        <Link href="/(auth)/login" style={{ color: colors.brand }}>
          Sign in
        </Link>
      </Text>
    </Screen>
  );
}
