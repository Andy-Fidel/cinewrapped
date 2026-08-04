import type { ReviewAssistantResult, ReviewAssistantStyle } from '@cinewrapped/shared-types';
import { Injectable } from '@nestjs/common';

export interface ReviewDraftContext {
  title: string;
  releaseYear: number | null;
  notes: string;
  style: ReviewAssistantStyle;
  containsSpoilers: boolean;
}

export interface AiProvider {
  reviewDraft(context: ReviewDraftContext): Promise<ReviewAssistantResult>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

function sentence(value: string): string {
  const trimmed = value.trim().replace(/\s+/gu, ' ');
  return /[.!?]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}

@Injectable()
export class GroundedAiProvider implements AiProvider {
  public reviewDraft(context: ReviewDraftContext): Promise<ReviewAssistantResult> {
    const title =
      context.releaseYear === null ? context.title : `${context.title} (${context.releaseYear})`;
    const notes = sentence(context.notes);
    const draft =
      context.style === 'SHORT'
        ? `${title}: ${notes}`
        : context.style === 'DETAILED'
          ? `${title}\n\nMy take: ${notes}\n\nWhat stayed with me: ${notes}`
          : context.style === 'FUNNY'
            ? `${title} really said “movie night plans” and then gave me this: ${notes}`
            : context.style === 'SOCIAL_CAPTION'
              ? `Just watched ${title}. ${notes} #CineWrapped`
              : `${title}: ${notes}`;
    return Promise.resolve({
      draft,
      style: context.style,
      source: 'LOCAL_GROUNDED',
      requiresApproval: true,
      notice: context.containsSpoilers
        ? 'Built only from your notes and title facts. Review the spoiler flag and approve before publishing.'
        : 'Built only from your notes and title facts. Review and approve before publishing.',
    });
  }
}
