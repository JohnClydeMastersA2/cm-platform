import {
  createChallengeToken,
  createSessionToken,
  hashChallengeToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "@cm/auth";
import type { AuthLogin, AuthRegister } from "@cm/contracts";
import sql from "mssql";
import type { AuthAccount, AuthSession } from "./auth.schema.js";

export const SESSION_COOKIE_NAME = "cm_session";

const SESSION_TTL_DAYS = 7;
const EMAIL_VERIFICATION_TTL_MINUTES = 5;
const EMAIL_VERIFICATION_CHALLENGE_TYPE = "email_verification";

type AccountRow = {
  AccountId: number;
  EmailAddress: string;
  PasswordHash: string;
  EmailVerifiedAt: Date | null;
  Status: string;
  CreatedAt: Date;
  LastLoginAt: Date | null;
};

type SessionRow = {
  AuthSessionId: number;
  CreatedAt: Date;
  ExpiresAt: Date;
  RevokedAt: Date | null;
};

const accountSelectColumns = `
  AccountId,
  EmailAddress,
  PasswordHash,
  EmailVerifiedAt,
  Status,
  CreatedAt,
  LastLoginAt
`;

function mapAccount(row: AccountRow): AuthAccount {
  return {
    accountId: row.AccountId,
    emailAddress: row.EmailAddress,
    emailVerifiedAt: row.EmailVerifiedAt,
    status: row.Status,
    createdAt: row.CreatedAt,
    lastLoginAt: row.LastLoginAt,
  };
}

function mapSession(row: SessionRow): AuthSession {
  return {
    authSessionId: row.AuthSessionId,
    createdAt: row.CreatedAt,
    expiresAt: row.ExpiresAt,
    revokedAt: row.RevokedAt,
  };
}

export async function registerAccount(
  db: sql.ConnectionPool,
  registration: AuthRegister,
): Promise<AuthAccount> {
  const emailAddress = registration.emailAddress.trim().toLowerCase();
  const passwordHash = await hashPassword(registration.password);

  const result = await db
    .request()
    .input("emailAddress", sql.VarChar(320), emailAddress)
    .input("passwordHash", sql.VarChar(500), passwordHash)
    .query<AccountRow>(`
      insert into dbo.Account (
        EmailAddress,
        PasswordHash
      )
      output
        inserted.AccountId,
        inserted.EmailAddress,
        inserted.PasswordHash,
        inserted.EmailVerifiedAt,
        inserted.Status,
        inserted.CreatedAt,
        inserted.LastLoginAt
      values (
        @emailAddress,
        @passwordHash
      );
    `);

  const row = result.recordset[0];

  if (!row) {
    throw new Error("Account insert did not return a row");
  }

  return mapAccount(row);
}

export async function createEmailVerificationChallenge(
  db: sql.ConnectionPool,
  accountId: number,
): Promise<string> {
  const verificationToken = createChallengeToken();
  const verificationTokenHash = hashChallengeToken(verificationToken);

  await db
    .request()
    .input("accountId", sql.Int, accountId)
    .input("challengeType", sql.VarChar(50), EMAIL_VERIFICATION_CHALLENGE_TYPE)
    .input("codeHash", sql.VarChar(128), verificationTokenHash)
    .input("ttlMinutes", sql.Int, EMAIL_VERIFICATION_TTL_MINUTES)
    .query(`
      update dbo.AuthChallenge
      set UsedAt = coalesce(UsedAt, sysutcdatetime())
      where AccountId = @accountId
        and ChallengeType = @challengeType
        and UsedAt is null;

      insert into dbo.AuthChallenge (
        AccountId,
        ChallengeType,
        CodeHash,
        ExpiresAt
      )
      values (
        @accountId,
        @challengeType,
        @codeHash,
        dateadd(minute, @ttlMinutes, sysutcdatetime())
      );
    `);

  return verificationToken;
}

export async function verifyEmailChallenge(
  db: sql.ConnectionPool,
  verificationToken: string,
): Promise<AuthAccount | null> {
  const verificationTokenHash = hashChallengeToken(verificationToken);

  const result = await db
    .request()
    .input("challengeType", sql.VarChar(50), EMAIL_VERIFICATION_CHALLENGE_TYPE)
    .input("codeHash", sql.VarChar(128), verificationTokenHash)
    .query<AccountRow>(`
      declare @accountId int;

      select top (1)
        @accountId = AccountId
      from dbo.AuthChallenge with (updlock, rowlock)
      where ChallengeType = @challengeType
        and CodeHash = @codeHash
        and UsedAt is null
        and ExpiresAt > sysutcdatetime()
      order by AuthChallengeId desc;

      if @accountId is not null
      begin
        update dbo.AuthChallenge
        set UsedAt = sysutcdatetime()
        where ChallengeType = @challengeType
          and CodeHash = @codeHash
          and UsedAt is null;

        update dbo.Account
        set EmailVerifiedAt = coalesce(EmailVerifiedAt, sysutcdatetime())
        output
          inserted.AccountId,
          inserted.EmailAddress,
          inserted.PasswordHash,
          inserted.EmailVerifiedAt,
          inserted.Status,
          inserted.CreatedAt,
          inserted.LastLoginAt
        where AccountId = @accountId
          and Status = 'active';
      end
    `);

  const row = result.recordset?.[0];
  return row ? mapAccount(row) : null;
}

export async function loginAccount(
  db: sql.ConnectionPool,
  login: AuthLogin,
): Promise<{ account: AuthAccount; sessionToken: string } | null> {
  const emailAddress = login.emailAddress.trim().toLowerCase();

  const result = await db
    .request()
    .input("emailAddress", sql.VarChar(320), emailAddress)
    .query<AccountRow>(`
      select
        ${accountSelectColumns}
      from dbo.Account
      where EmailAddress = @emailAddress
        and Status = 'active';
    `);

  const row = result.recordset[0];

  if (!row) {
    return null;
  }

  if (!(await verifyPassword(login.password, row.PasswordHash))) {
    return null;
  }

  const sessionToken = createSessionToken();
  const sessionTokenHash = hashSessionToken(sessionToken);

  await db
    .request()
    .input("accountId", sql.Int, row.AccountId)
    .input("sessionTokenHash", sql.VarChar(128), sessionTokenHash)
    .input("sessionTtlDays", sql.Int, SESSION_TTL_DAYS)
    .query(`
      insert into dbo.AuthSession (
        AccountId,
        SessionTokenHash,
        ExpiresAt
      )
      values (
        @accountId,
        @sessionTokenHash,
        dateadd(day, @sessionTtlDays, sysutcdatetime())
      );

      update dbo.Account
      set LastLoginAt = sysutcdatetime()
      where AccountId = @accountId;
    `);

  return {
    account: {
      ...mapAccount(row),
      lastLoginAt: new Date(),
    },
    sessionToken,
  };
}

export async function getAccountBySessionToken(
  db: sql.ConnectionPool,
  sessionToken: string,
): Promise<AuthAccount | null> {
  const sessionTokenHash = hashSessionToken(sessionToken);

  const result = await db
    .request()
    .input("sessionTokenHash", sql.VarChar(128), sessionTokenHash)
    .query<AccountRow>(`
      select
        a.AccountId,
        a.EmailAddress,
        a.PasswordHash,
        a.EmailVerifiedAt,
        a.Status,
        a.CreatedAt,
        a.LastLoginAt
      from dbo.AuthSession s
      join dbo.Account a
        on a.AccountId = s.AccountId
      where s.SessionTokenHash = @sessionTokenHash
        and s.RevokedAt is null
        and s.ExpiresAt > sysutcdatetime()
        and a.Status = 'active';
    `);

  const row = result.recordset[0];
  return row ? mapAccount(row) : null;
}

export async function getSessionByToken(
  db: sql.ConnectionPool,
  sessionToken: string,
): Promise<AuthSession | null> {
  const sessionTokenHash = hashSessionToken(sessionToken);

  const result = await db
    .request()
    .input("sessionTokenHash", sql.VarChar(128), sessionTokenHash)
    .query<SessionRow>(`
      select
        AuthSessionId,
        CreatedAt,
        ExpiresAt,
        RevokedAt
      from dbo.AuthSession
      where SessionTokenHash = @sessionTokenHash;
    `);

  const row = result.recordset[0];
  return row ? mapSession(row) : null;
}

export async function revokeSessionToken(
  db: sql.ConnectionPool,
  sessionToken: string,
): Promise<void> {
  const sessionTokenHash = hashSessionToken(sessionToken);

  await db
    .request()
    .input("sessionTokenHash", sql.VarChar(128), sessionTokenHash)
    .query(`
      update dbo.AuthSession
      set RevokedAt = coalesce(RevokedAt, sysutcdatetime())
      where SessionTokenHash = @sessionTokenHash;
    `);
}

export async function deleteDemoAccount(
  db: sql.ConnectionPool,
  accountId: number,
): Promise<void> {
  await db
    .request()
    .input("accountId", sql.Int, accountId)
    .query(`
      delete from dbo.Account
      where AccountId = @accountId;
    `);
}
