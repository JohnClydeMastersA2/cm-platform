export type AuthAccount = {
  accountId: number;
  emailAddress: string;
  emailVerifiedAt: Date | null;
  status: string;
  createdAt: Date;
  lastLoginAt: Date | null;
};

export type AuthSession = {
  authSessionId: number;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};
