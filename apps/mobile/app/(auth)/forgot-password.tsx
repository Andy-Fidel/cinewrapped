import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { BrandHeader, Button, ErrorText, Field, Screen, useColors } from '../../src/components/ui';
import { passwordRecoveryUrl } from '../../src/lib/auth-links';
import { supabase } from '../../src/lib/supabase';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: passwordRecoveryUrl,
    });
    setMessage(error?.message ?? 'If that account exists, a secure reset link is on its way.');
    setLoading(false);
  };
  return (
    <Screen>
      <BrandHeader
        title="Reset password"
        body="We’ll send a time-limited recovery link to your verified email."
      />
      <Field
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {message === null ? null : <ErrorText>{message}</ErrorText>}
      <Button
        label="Send reset link"
        loading={loading}
        disabled={!email.includes('@')}
        onPress={() => void submit()}
      />
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
        <Link href="/(auth)/login" style={{ color: colors.brand }}>
          Back to sign in
        </Link>
      </Text>
    </Screen>
  );
}
