import { useState } from 'react';

import { BrandHeader, Button, ErrorText, Field, Screen } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error?.message ?? 'Password updated. You can continue to CineWrapped.');
    setLoading(false);
  };
  return (
    <Screen>
      <BrandHeader
        title="Choose a new password"
        body="Use at least eight characters, including a number and uppercase letter."
      />
      <Field label="New password" secureTextEntry value={password} onChangeText={setPassword} />
      {message === null ? null : <ErrorText>{message}</ErrorText>}
      <Button
        label="Update password"
        loading={loading}
        disabled={password.length < 8}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
