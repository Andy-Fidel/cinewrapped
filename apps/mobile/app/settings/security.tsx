import type { SessionSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { SettingsCard } from '../../src/components/settings-controls';
import { Button, PasswordField, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/auth-provider';
import { useDialog } from '../../src/providers/dialog-provider';

export default function SecuritySettingsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session, signOut } = useAuth();
  const { confirm, showError, showInfo } = useDialog();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const deleteAccount = useMutation({
    mutationFn: () => api.request('users/me', { method: 'DELETE' }),
    onSuccess: async () => {
      showInfo(
        'Account Deleted',
        'Your CineWrapped account and personal data have been permanently erased.',
      );
      await signOut();
    },
    onError: (error) => showError('Could not delete account', errorMessage(error)),
  });

  const handleDeleteAccount = async () => {
    const accepted = await confirm({
      title: 'Permanently delete your account?',
      message:
        'All your viewing history, ratings, reviews, lists, and annual wraps will be immediately and irreversibly deleted.',
      confirmLabel: 'Delete Forever',
      destructive: true,
    });
    if (accepted) {
      deleteAccount.mutate();
    }
  };

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.request<SessionSummary[]>('auth/sessions'),
  });
  const revoke = useMutation({
    mutationFn: (sessionId: string) =>
      api.request(`auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (error) => showError('Could not revoke session', errorMessage(error)),
  });
  const revokeOthers = useMutation({
    mutationFn: () =>
      api.request('auth/sessions/revoke-others', {
        method: 'POST',
        idempotencyKey: `revoke-${randomUUID()}`,
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (error) => showError('Could not sign out other devices', errorMessage(error)),
  });

  const changePassword = async () => {
    if (password !== confirmPassword) {
      setPasswordMessage('The passwords do not match.');
      showError('Passwords do not match', 'Enter the same new password in both fields.');
      return;
    }
    setChangingPassword(true);
    setPasswordMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error === null) {
      setPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated.');
      showInfo('Password updated', 'Your new password is ready to use.');
    } else {
      setPasswordMessage(error.message);
      showError('Could not update password', error.message);
    }
    setChangingPassword(false);
  };

  const revokeSession = async (sessionId: string) => {
    const accepted = await confirm({
      title: 'Revoke this session?',
      message: 'That device will be signed out of CineWrapped immediately.',
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (accepted) revoke.mutate(sessionId);
  };

  const revokeOtherSessions = async () => {
    const accepted = await confirm({
      title: 'Sign out other devices?',
      message: 'Every other active CineWrapped session will be revoked.',
      confirmLabel: 'Sign Out Devices',
      destructive: true,
    });
    if (accepted) revokeOthers.mutate();
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Security & Sessions',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      <SettingsCard
        icon="key-outline"
        title="Password"
        body={`Signed in as ${session?.user.email ?? 'your CineWrapped account'}. Use at least eight characters.`}
      >
        <PasswordField
          autoComplete="new-password"
          label="New password"
          value={password}
          onChangeText={setPassword}
        />
        <PasswordField
          autoComplete="new-password"
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {passwordMessage === null ? null : (
          <Text accessibilityRole="alert" style={{ color: colors.textSecondary }}>
            {passwordMessage}
          </Text>
        )}
        <Button
          label="Update Password"
          loading={changingPassword}
          disabled={password.length < 8 || confirmPassword.length < 8}
          onPress={() => void changePassword()}
        />
      </SettingsCard>

      <SettingsCard
        icon="hardware-chip-outline"
        title="Active Sessions"
        body="Review devices with access to your account and revoke any you do not recognize."
      >
        {sessions.isPending ? <ActivityIndicator color={colors.brand} /> : null}
        <View style={styles.sessionsList}>
          {sessions.data?.map((sessionItem) => {
            const isRevoking = revoke.isPending && revoke.variables === sessionItem.id;
            return (
              <View
                key={sessionItem.id}
                style={[styles.sessionRow, { borderColor: colors.border }]}
              >
                <Ionicons
                  name={sessionItem.current ? 'phone-portrait-outline' : 'laptop-outline'}
                  size={20}
                  color={colors.brand}
                />
                <View style={styles.sessionTextWrap}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
                    {sessionItem.current
                      ? 'This Device'
                      : (sessionItem.deviceName ?? sessionItem.platform)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Last seen {new Date(sessionItem.lastSeenAt).toLocaleString()}
                  </Text>
                </View>
                {sessionItem.current ? (
                  <Text style={{ color: colors.brand, fontSize: 11, fontWeight: '700' }}>
                    CURRENT
                  </Text>
                ) : (
                  <View style={styles.revokeButton}>
                    <Button
                      label="Revoke"
                      variant="secondary"
                      loading={isRevoking}
                      disabled={revoke.isPending || revokeOthers.isPending}
                      onPress={() => void revokeSession(sessionItem.id)}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <Button
          label="Sign Out Other Devices"
          variant="secondary"
          loading={revokeOthers.isPending}
          disabled={revoke.isPending}
          onPress={() => void revokeOtherSessions()}
        />
      </SettingsCard>

      <SettingsCard
        icon="trash-outline"
        title="Delete Account"
        body="Permanently erase your CineWrapped profile, ratings, viewing history, and personal data. This action cannot be undone."
      >
        <Button
          label="Delete CineWrapped Account"
          variant="danger"
          loading={deleteAccount.isPending}
          onPress={() => void handleDeleteAccount()}
        />
      </SettingsCard>

      {sessions.isError || revoke.isError || revokeOthers.isError || deleteAccount.isError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {errorMessage(
            revoke.error ?? revokeOthers.error ?? sessions.error ?? deleteAccount.error,
          )}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sessionsList: { gap: 8 },
  sessionRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  sessionTextWrap: { flex: 1, gap: 2 },
  revokeButton: { minWidth: 92 },
});
