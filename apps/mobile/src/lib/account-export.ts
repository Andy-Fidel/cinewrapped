import { accountExportCollections } from '@cinewrapped/shared-types';
import { Platform } from 'react-native';
import { api } from './api';
import { supabase } from './supabase';

interface ExportPage {
  records: unknown[];
  nextCursor: string | null;
  asOf: string;
}

export async function downloadAccountExport(
  onProgress: (collection: string) => void,
): Promise<void> {
  const owner = (await supabase.auth.getSession()).data.session?.user.id;
  if (!owner) throw new Error('Sign in before exporting your account.');
  const data: Record<string, unknown[]> = {};
  let asOf: string | undefined;
  for (const collection of accountExportCollections) {
    onProgress(collection);
    data[collection] = [];
    let cursor: string | null = null;
    do {
      if ((await supabase.auth.getSession()).data.session?.user.id !== owner)
        throw new Error('Your account changed. Start a new export.');
      const query = new URLSearchParams({
        collection,
        ...(asOf ? { asOf } : {}),
        ...(cursor ? { cursor } : {}),
      });
      const page: ExportPage = await api.request<ExportPage>(`data-transfer/export?${query}`);
      if ((await supabase.auth.getSession()).data.session?.user.id !== owner)
        throw new Error('Your account changed. Start a new export.');
      asOf = page.asOf;
      data[collection].push(...page.records);
      cursor = page.nextCursor;
    } while (cursor !== null);
  }
  const content = JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      asOf,
      note: 'Application records, read page by page. Changes to existing records during export may be included. Attachment metadata is included; media files and credentials are excluded.',
      data,
    },
    null,
    2,
  );
  const name = `cinewrapped-export-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const { isAvailableAsync, shareAsync } = await import('expo-sharing');
  if (!(await isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, name);
  try {
    file.create({ overwrite: true });
    file.write(content);
    await shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save CineWrapped account export',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
