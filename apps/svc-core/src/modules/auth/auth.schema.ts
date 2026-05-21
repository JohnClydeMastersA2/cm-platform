export type AuthAccount = {
  accountId: number;
  emailAddress: string;
  emailVerifiedAt: Date | null;
  status: string;
  createdAt: Date;
  lastLoginAt: Date | null;
};
