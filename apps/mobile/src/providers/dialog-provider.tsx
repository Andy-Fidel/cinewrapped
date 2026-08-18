import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '../components/ui';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface DialogContextValue {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  showError: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
}

interface DialogRequest {
  id: number;
  kind: 'CONFIRM' | 'ERROR' | 'INFO';
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string | null;
  destructive: boolean;
  resolve: (accepted: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const nextId = useRef(1);
  const completed = useRef(new Set<number>());
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const active = queue[0];

  const enqueue = useCallback((request: Omit<DialogRequest, 'id'>) => {
    const id = nextId.current;
    nextId.current += 1;
    setQueue((current) => [...current, { ...request, id }]);
  }, []);

  const confirm = useCallback(
    (options: ConfirmationOptions) =>
      new Promise<boolean>((resolve) => {
        enqueue({
          kind: 'CONFIRM',
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'Confirm',
          cancelLabel: options.cancelLabel ?? 'Cancel',
          destructive: options.destructive ?? false,
          resolve,
        });
      }),
    [enqueue],
  );

  const showError = useCallback(
    (title: string, message: string) =>
      enqueue({
        kind: 'ERROR',
        title,
        message,
        confirmLabel: 'OK',
        cancelLabel: null,
        destructive: false,
        resolve: () => undefined,
      }),
    [enqueue],
  );

  const showInfo = useCallback(
    (title: string, message: string) =>
      enqueue({
        kind: 'INFO',
        title,
        message,
        confirmLabel: 'Done',
        cancelLabel: null,
        destructive: false,
        resolve: () => undefined,
      }),
    [enqueue],
  );

  const finish = useCallback(
    (accepted: boolean) => {
      if (active === undefined || completed.current.has(active.id)) return;
      completed.current.add(active.id);
      active.resolve(accepted);
      setQueue((current) =>
        current[0]?.id === active.id
          ? current.slice(1)
          : current.filter(({ id }) => id !== active.id),
      );
    },
    [active],
  );

  const value = useMemo(() => ({ confirm, showError, showInfo }), [confirm, showError, showInfo]);
  const icon =
    active?.kind === 'ERROR'
      ? ('close-circle-outline' as const)
      : active?.kind === 'INFO'
        ? ('information-circle-outline' as const)
        : ('help-circle-outline' as const);
  const iconColor = active?.kind === 'ERROR' ? colors.danger : colors.brand;
  const primaryBackground = active?.destructive ? colors.danger : colors.brand;

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal
        animationType="fade"
        onRequestClose={() => finish(false)}
        statusBarTranslucent
        transparent
        visible={active !== undefined}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Dismiss dialog"
            onPress={() => finish(false)}
            style={StyleSheet.absoluteFill}
          />
          {active === undefined ? null : (
            <View
              accessibilityViewIsModal
              style={[
                styles.dialog,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor:
                      active.kind === 'ERROR' ? 'rgba(239, 68, 68, 0.12)' : colors.surfaceRaised,
                  },
                ]}
              >
                <Ionicons color={iconColor} name={icon} size={30} />
              </View>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.textPrimary }]}
              >
                {active.title}
              </Text>
              <ScrollView style={styles.messageScroll}>
                <Text
                  accessibilityLiveRegion="assertive"
                  accessibilityRole={active.kind === 'ERROR' ? 'alert' : 'text'}
                  style={[styles.message, { color: colors.textSecondary }]}
                >
                  {active.message}
                </Text>
              </ScrollView>
              <View style={styles.actions}>
                {active.cancelLabel === null ? null : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => finish(false)}
                    style={({ pressed }) => [
                      styles.button,
                      {
                        backgroundColor: colors.surfaceRaised,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                      {active.cancelLabel}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => finish(true)}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: primaryBackground, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: colors.onBrand }]}>
                    {active.confirmLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext);
  if (value === null) throw new Error('useDialog must be used inside DialogProvider.');
  return value;
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 12,
    gap: 13,
    maxWidth: 420,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    width: '100%',
  },
  icon: {
    alignItems: 'center',
    borderRadius: 999,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  title: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  messageScroll: { maxHeight: 220, width: '100%' },
  message: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 5, width: '100%' },
  button: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  buttonText: { fontSize: 15, fontWeight: '800' },
});
