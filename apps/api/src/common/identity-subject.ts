import { createHash } from 'node:crypto';

export function hashIdentitySubject(subject: string): string {
  return createHash('sha256').update(subject, 'utf8').digest('hex');
}
