import { useRef } from 'react';
import { useDialog } from '../providers/dialog-provider';
import { errorMessage } from './error-message';
import { downloadShareText, shareTextContent, type TextShareContent } from './text-sharing';

export function useTextShare() {
  const { confirm, showError } = useDialog();
  const active = useRef(false);
  return (content: TextShareContent) => {
    if (active.current) return;
    active.current = true;
    // No awaited preparation before sharing: keep the original browser click activation.
    void shareTextContent(content)
      .then(async (outcome) => {
        if (
          outcome === 'unsupported' &&
          (await confirm({
            title: 'Share text',
            message:
              'Sharing is unavailable in this browser. Download the text and link to share manually?',
            confirmLabel: 'Download text',
          }))
        )
          downloadShareText(content);
      })
      .catch((error: unknown) => showError('Could not share', errorMessage(error)))
      .finally(() => {
        active.current = false;
      });
  };
}
