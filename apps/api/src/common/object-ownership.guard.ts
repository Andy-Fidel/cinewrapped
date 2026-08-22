import { AppException } from './app.exception.js';

export interface OwnershipCheckOptions {
  resourceName?: string;
  allowRoles?: string[];
}

/**
 * Zero-Trust Object-Level Ownership Assertion
 * Enforces that user-provided object IDs cannot be mutated or deleted unless the actor
 * owns the entity or possesses an explicit administrative moderation role.
 */
export function assertOwnership(
  actorUserId: string,
  ownerUserId: string,
  resourceName = 'resource',
): void {
  if (actorUserId !== ownerUserId) {
    throw new AppException(
      403,
      'FORBIDDEN_OWNERSHIP',
      `You do not have permission to modify or delete this ${resourceName}.`,
    );
  }
}

/**
 * Role & Ownership Combined Check
 */
export function assertCanMutate(
  actorUserId: string,
  ownerUserId: string,
  actorRoles: string[] = [],
  resourceName = 'resource',
): void {
  const isOwner = actorUserId === ownerUserId;
  const isAuthorizedRole = actorRoles.includes('ADMIN') || actorRoles.includes('MODERATOR');

  if (!isOwner && !isAuthorizedRole) {
    throw new AppException(
      403,
      'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
      `You must be the owner of this ${resourceName} or an authorized moderator to perform this action.`,
    );
  }
}
