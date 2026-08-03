import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import { ClubsService } from '../src/clubs/clubs.service.js';
import type { PrismaService } from '../src/database/prisma.service.js';

const principal: AuthPrincipal = {
  subject: 'auth-viewer',
  email: 'viewer@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Viewer',
};

const viewer = {
  id: '20000000-0000-4000-8000-000000000000',
  authSubject: principal.subject,
  username: 'viewer',
  displayName: 'Viewer',
  avatarUrl: null,
  bio: null,
  deletedAt: null,
};

describe('ClubsService', () => {
  it('does not let a member self-join an invite-only club', async () => {
    const findMembership = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      club: {
        findFirst: vi.fn(() =>
          Promise.resolve({ id: 'club-1', membershipType: 'INVITE_ONLY', visibility: 'PUBLIC' }),
        ),
      },
      clubMember: { findUnique: findMembership },
    } as unknown as PrismaService;

    await expect(new ClubsService(prisma).join(principal, 'club-1')).rejects.toMatchObject({
      code: 'CLUB_INVITE_REQUIRED',
    });
    expect(findMembership).not.toHaveBeenCalled();
  });

  it('does not expose a private club through self-service approval requests', async () => {
    const findMembership = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      club: {
        findFirst: vi.fn(() =>
          Promise.resolve({ id: 'club-1', membershipType: 'APPROVAL', visibility: 'PRIVATE' }),
        ),
      },
      clubMember: { findUnique: findMembership },
    } as unknown as PrismaService;

    await expect(new ClubsService(prisma).join(principal, 'club-1')).rejects.toMatchObject({
      code: 'CLUB_INVITE_REQUIRED',
    });
    expect(findMembership).not.toHaveBeenCalled();
  });

  it('allows active members to discuss but reserves announcements for managers', async () => {
    const create = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      clubMember: {
        findFirst: vi.fn(() => Promise.resolve({ role: 'MEMBER', status: 'ACTIVE' })),
      },
      clubPost: { create },
    } as unknown as PrismaService;

    await expect(
      new ClubsService(prisma).createPost(principal, 'club-1', {
        postType: 'ANNOUNCEMENT',
        title: 'Important',
        body: 'Screening moved.',
        containsSpoilers: false,
      }),
    ).rejects.toMatchObject({ code: 'CLUB_MANAGER_REQUIRED' });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a vote for an option belonging to another poll', async () => {
    const transaction = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(() => Promise.resolve(viewer)) },
      clubMember: {
        findFirst: vi.fn(() => Promise.resolve({ role: 'MEMBER', status: 'ACTIVE' })),
      },
      clubPoll: {
        findFirst: vi.fn(() =>
          Promise.resolve({
            id: 'poll-1',
            status: 'OPEN',
            closesAt: null,
            allowMultiple: false,
            options: [{ id: 'option-1' }],
          }),
        ),
      },
      clubPollVote: { findUnique: vi.fn() },
      $transaction: transaction,
    } as unknown as PrismaService;

    await expect(
      new ClubsService(prisma).votePoll(principal, 'club-1', 'poll-1', {
        optionId: 'option-elsewhere',
      }),
    ).rejects.toMatchObject({ code: 'CLUB_POLL_OPTION_INVALID' });
    expect(transaction).not.toHaveBeenCalled();
  });
});
