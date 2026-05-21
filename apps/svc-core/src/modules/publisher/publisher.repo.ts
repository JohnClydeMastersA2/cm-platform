import sql from "mssql";
import type {
  Publisher,
  PublisherLogin,
  PublisherPasswordSetup,
  PublisherRegistration,
} from "./publisher.schema.js";
import { hashPassword, verifyPassword } from "./password.js";

type PublisherRow = {
  PublisherId: number;
  PublisherName: string;
  ExternalId: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  CreatedBy: string | null;
  UpdatedAt: Date | null;
  UpdatedBy: string | null;
  ContactName: string | null;
  ContactEmail: string | null;
  WebsiteUrl: string | null;
  RegistrationNotes: string | null;
  RegistrationStatus: string;
  PasswordHash: string | null;
  PasswordSetAt: Date | null;
  LastLoginAt: Date | null;
};

function mapPublisher(row: PublisherRow): Publisher {
  return {
    publisherId: row.PublisherId,
    publisherName: row.PublisherName,
    externalId: row.ExternalId,
    isActive: row.IsActive,
    createdAt: row.CreatedAt,
    createdBy: row.CreatedBy,
    updatedAt: row.UpdatedAt,
    updatedBy: row.UpdatedBy,
    contactName: row.ContactName,
    contactEmail: row.ContactEmail,
    websiteUrl: row.WebsiteUrl,
    registrationNotes: row.RegistrationNotes,
    registrationStatus: row.RegistrationStatus,
    hasPassword: row.PasswordHash !== null,
    passwordSetAt: row.PasswordSetAt,
    lastLoginAt: row.LastLoginAt,
  };
}

const publisherSelectColumns = `
  PublisherId,
  PublisherName,
  ExternalId,
  IsActive,
  CreatedAt,
  CreatedBy,
  UpdatedAt,
  UpdatedBy,
  ContactName,
  ContactEmail,
  WebsiteUrl,
  RegistrationNotes,
  RegistrationStatus,
  PasswordHash,
  PasswordSetAt,
  LastLoginAt
`;

export async function listPublishers(db: sql.ConnectionPool): Promise<Publisher[]> {
  const result = await db.request().query<PublisherRow>(`
    select
      ${publisherSelectColumns}
    from dbo.Publisher
    order by PublisherName;
  `);

  return result.recordset.map(mapPublisher);
}

export async function getPublisherById(
  db: sql.ConnectionPool,
  publisherId: number,
): Promise<Publisher | null> {
  const result = await db
    .request()
    .input("publisherId", sql.Int, publisherId)
    .query<PublisherRow>(`
      select
        ${publisherSelectColumns}
      from dbo.Publisher
      where PublisherId = @publisherId;
    `);

  const row = result.recordset[0];
  return row ? mapPublisher(row) : null;
}

export async function createPublisherRegistration(
  db: sql.ConnectionPool,
  registration: PublisherRegistration,
): Promise<Publisher> {
  const notes = registration.registrationNotes?.trim() || null;

  const result = await db
    .request()
    .input("publisherName", sql.VarChar(255), registration.publisherName)
    .input("contactName", sql.VarChar(255), registration.contactName)
    .input("contactEmail", sql.VarChar(255), registration.contactEmail)
    .input("websiteUrl", sql.VarChar(500), registration.websiteUrl)
    .input("registrationNotes", sql.VarChar(sql.MAX), notes)
    .query<PublisherRow>(`
      insert into dbo.Publisher (
        PublisherName,
        ExternalId,
        IsActive,
        CreatedBy,
        ContactName,
        ContactEmail,
        WebsiteUrl,
        RegistrationNotes,
        RegistrationStatus
      )
      output
        inserted.PublisherId,
        inserted.PublisherName,
        inserted.ExternalId,
        inserted.IsActive,
        inserted.CreatedAt,
        inserted.CreatedBy,
        inserted.UpdatedAt,
        inserted.UpdatedBy,
        inserted.ContactName,
        inserted.ContactEmail,
        inserted.WebsiteUrl,
        inserted.RegistrationNotes,
        inserted.RegistrationStatus,
        inserted.PasswordHash,
        inserted.PasswordSetAt,
        inserted.LastLoginAt
      values (
        @publisherName,
        concat('PUB-REG-', replace(convert(varchar(36), newid()), '-', '')),
        0,
        'publisher-registration',
        @contactName,
        @contactEmail,
        @websiteUrl,
        @registrationNotes,
        'pending'
      );
    `);

  const row = result.recordset[0];

  if (!row) {
    throw new Error("Publisher registration insert did not return a row");
  }

  return mapPublisher(row);
}

export async function setPublisherPassword(
  db: sql.ConnectionPool,
  passwordSetup: PublisherPasswordSetup,
): Promise<Publisher | null> {
  const contactEmail = passwordSetup.contactEmail.toLowerCase();
  const passwordHash = await hashPassword(passwordSetup.password);

  const result = await db
    .request()
    .input("contactEmail", sql.VarChar(255), contactEmail)
    .input("passwordHash", sql.VarChar(500), passwordHash)
    .query<PublisherRow>(`
      update dbo.Publisher
      set
        PasswordHash = @passwordHash,
        PasswordSetAt = sysutcdatetime(),
        UpdatedAt = sysutcdatetime(),
        UpdatedBy = 'publisher-password-setup'
      output
        inserted.PublisherId,
        inserted.PublisherName,
        inserted.ExternalId,
        inserted.IsActive,
        inserted.CreatedAt,
        inserted.CreatedBy,
        inserted.UpdatedAt,
        inserted.UpdatedBy,
        inserted.ContactName,
        inserted.ContactEmail,
        inserted.WebsiteUrl,
        inserted.RegistrationNotes,
        inserted.RegistrationStatus,
        inserted.PasswordHash,
        inserted.PasswordSetAt,
        inserted.LastLoginAt
      where lower(ContactEmail) = @contactEmail
        and RegistrationStatus = 'approved'
        and IsActive = 1;
    `);

  const row = result.recordset[0];
  return row ? mapPublisher(row) : null;
}

export async function loginPublisher(
  db: sql.ConnectionPool,
  login: PublisherLogin,
): Promise<Publisher | null> {
  const contactEmail = login.contactEmail.toLowerCase();

  const result = await db
    .request()
    .input("contactEmail", sql.VarChar(255), contactEmail)
    .query<PublisherRow>(`
      select
        ${publisherSelectColumns}
      from dbo.Publisher
      where lower(ContactEmail) = @contactEmail
        and RegistrationStatus = 'approved'
        and IsActive = 1;
    `);

  const row = result.recordset[0];

  if (!row?.PasswordHash) {
    return null;
  }

  const passwordMatches = await verifyPassword(login.password, row.PasswordHash);

  if (!passwordMatches) {
    return null;
  }

  const updateResult = await db
    .request()
    .input("publisherId", sql.Int, row.PublisherId)
    .query<PublisherRow>(`
      update dbo.Publisher
      set LastLoginAt = sysutcdatetime()
      output
        inserted.PublisherId,
        inserted.PublisherName,
        inserted.ExternalId,
        inserted.IsActive,
        inserted.CreatedAt,
        inserted.CreatedBy,
        inserted.UpdatedAt,
        inserted.UpdatedBy,
        inserted.ContactName,
        inserted.ContactEmail,
        inserted.WebsiteUrl,
        inserted.RegistrationNotes,
        inserted.RegistrationStatus,
        inserted.PasswordHash,
        inserted.PasswordSetAt,
        inserted.LastLoginAt
      where PublisherId = @publisherId;
    `);

  const updatedRow = updateResult.recordset[0];
  return updatedRow ? mapPublisher(updatedRow) : mapPublisher(row);
}
