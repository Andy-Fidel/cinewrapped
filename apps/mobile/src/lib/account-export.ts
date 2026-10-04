import { accountExportCollections } from '@cinewrapped/shared-types';
import { exportTextFile } from './file-export';
import { api } from './api';
import { supabase } from './supabase';

interface ExportPage {
  records: unknown[];
  nextCursor: string | null;
  asOf: string;
}

export async function downloadAccountExport(onProgress: (collection: string) => void) {
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
  return exportTextFile(content, name, 'application/json', 'Save CineWrapped account export');
}
