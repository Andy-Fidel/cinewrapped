export interface AuthPrincipal {
  subject: string;
  email: string;
  sessionId: string;
  expiresAt: Date | null;
  displayName: string | null;
}
