import {
  createChallengeToken,
  createSessionToken,
  hashChallengeToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "@cm/auth";
import type { AuthLogin, AuthRegister } from "@cm/contracts";
import type { Pool } from "pg";
import type { AuthAccount, AuthSession } from "./auth.schema.js";

export const SESSION_COOKIE_NAME = "cm_session";

const SESSION_TTL_DAYS = 7;
const EMAIL_VERIFICATION_TTL_MINUTES = 5;
const EMAIL_VERIFICATION_CHALLENGE_TYPE = "email_verification";

type AccountRow = {
  account_id: number;
  email_address: string;
  password_hash: string;
  email_verified_at: Date | null;
  status: string;
  created_at: Date;
  last_login_at: Date | null;
};

type SessionRow = {
  auth_session_id: number;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
};

const accountSelectColumns = `
  account_id,
  email_address,
  password_hash,
  email_verified_at,
  status,
  created_at,
  last_login_at
`;

function mapAccount(row: AccountRow): AuthAccount {
  return {
    accountId: row.account_id,
    emailAddress: row.email_address,
    emailVerifiedAt: row.email_verified_at,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function mapSession(row: SessionRow): AuthSession {
  return {
    authSessionId: row.auth_session_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

export async function registerAccount(
  db: Pool,
  registration: AuthRegister,
): Promise<AuthAccount> {
  const emailAddress = registration.emailAddress.trim().toLowerCase();
  const passwordHash = await hashPassword(registration.password);

  const result = await db.query<AccountRow>(
    `
      insert into account (
        email_address,
        password_hash
      )
      values (
        $1,
        $2
      )
      returning ${accountSelectColumns};
    `,
    [emailAddress, passwordHash],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Account insert did not return a row");
  }

  return mapAccount(row);
}

export async function createEmailVerificationChallenge(
  db: Pool,
  accountId: number,
): Promise<string> {
  const verificationToken = createChallengeToken();
  const verificationTokenHash = hashChallengeToken(verificationToken);
  const client = await db.connect();

  try {
    await client.query("begin");
    await client.query(
      `
        update auth_challenge
        set used_at = coalesce(used_at, now())
        where account_id = $1
          and challenge_type = $2
          and used_at is null;
      `,
      [accountId, EMAIL_VERIFICATION_CHALLENGE_TYPE],
    );
    await client.query(
      `
        insert into auth_challenge (
          account_id,
          challenge_type,
          code_hash,
          expires_at
        )
        values (
          $1,
          $2,
          $3,
          now() + ($4 * interval '1 minute')
        );
      `,
      [accountId, EMAIL_VERIFICATION_CHALLENGE_TYPE, verificationTokenHash, EMAIL_VERIFICATION_TTL_MINUTES],
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  return verificationToken;
}

export async function verifyEmailChallenge(
  db: Pool,
  verificationToken: string,
): Promise<AuthAccount | null> {
  const verificationTokenHash = hashChallengeToken(verificationToken);
  const client = await db.connect();

  try {
    await client.query("begin");

    const result = await client.query<AccountRow>(
      `
        with selected_challenge as (
          select auth_challenge_id, account_id
          from auth_challenge
          where challenge_type = $1
            and code_hash = $2
            and used_at is null
            and expires_at > now()
          order by auth_challenge_id desc
          limit 1
          for update
        ),
        used_challenge as (
          update auth_challenge c
          set used_at = now()
          from selected_challenge s
          where c.auth_challenge_id = s.auth_challenge_id
          returning s.account_id
        )
        update account a
        set email_verified_at = coalesce(a.email_verified_at, now())
        from used_challenge u
        where a.account_id = u.account_id
          and a.status = 'active'
        returning
          a.account_id,
          a.email_address,
          a.password_hash,
          a.email_verified_at,
          a.status,
          a.created_at,
          a.last_login_at;
      `,
      [EMAIL_VERIFICATION_CHALLENGE_TYPE, verificationTokenHash],
    );

    await client.query("commit");

    const row = result.rows[0];
    return row ? mapAccount(row) : null;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function loginAccount(
  db: Pool,
  login: AuthLogin,
): Promise<{ account: AuthAccount; sessionToken: string } | null> {
  const emailAddress = login.emailAddress.trim().toLowerCase();

  const result = await db.query<AccountRow>(
    `
      select
        ${accountSelectColumns}
      from account
      where email_address = $1
        and status = 'active';
    `,
    [emailAddress],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  if (!(await verifyPassword(login.password, row.password_hash))) {
    return null;
  }

  const sessionToken = createSessionToken();
  const sessionTokenHash = hashSessionToken(sessionToken);
  const client = await db.connect();

  try {
    await client.query("begin");
    await client.query(
      `
        insert into auth_session (
          account_id,
          session_token_hash,
          expires_at
        )
        values (
          $1,
          $2,
          now() + ($3 * interval '1 day')
        );
      `,
      [row.account_id, sessionTokenHash, SESSION_TTL_DAYS],
    );
    await client.query(
      `
        update account
        set last_login_at = now()
        where account_id = $1;
      `,
      [row.account_id],
    );
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  return {
    account: {
      ...mapAccount(row),
      lastLoginAt: new Date(),
    },
    sessionToken,
  };
}

export async function getAccountBySessionToken(
  db: Pool,
  sessionToken: string,
): Promise<AuthAccount | null> {
  const sessionTokenHash = hashSessionToken(sessionToken);

  const result = await db.query<AccountRow>(
    `
      select
        a.account_id,
        a.email_address,
        a.password_hash,
        a.email_verified_at,
        a.status,
        a.created_at,
        a.last_login_at
      from auth_session s
      join account a
        on a.account_id = s.account_id
      where s.session_token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
        and a.status = 'active';
    `,
    [sessionTokenHash],
  );

  const row = result.rows[0];
  return row ? mapAccount(row) : null;
}

export async function getSessionByToken(
  db: Pool,
  sessionToken: string,
): Promise<AuthSession | null> {
  const sessionTokenHash = hashSessionToken(sessionToken);

  const result = await db.query<SessionRow>(
    `
      select
        auth_session_id,
        created_at,
        expires_at,
        revoked_at
      from auth_session
      where session_token_hash = $1;
    `,
    [sessionTokenHash],
  );

  const row = result.rows[0];
  return row ? mapSession(row) : null;
}

export async function revokeSessionToken(
  db: Pool,
  sessionToken: string,
): Promise<void> {
  const sessionTokenHash = hashSessionToken(sessionToken);

  await db.query(
    `
      update auth_session
      set revoked_at = coalesce(revoked_at, now())
      where session_token_hash = $1;
    `,
    [sessionTokenHash],
  );
}

export async function deleteDemoAccount(
  db: Pool,
  accountId: number,
): Promise<void> {
  await db.query(
    `
      delete from account
      where account_id = $1;
    `,
    [accountId],
  );
}
