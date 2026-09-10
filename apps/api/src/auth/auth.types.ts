export interface AuthPrincipal {
  subject: string;
  email: string;
  sessionId: string;
  expiresAt: Date | null;
  displayName: string | null;
  assuranceLevel: 'aal1' | 'aal2' | null;
}
