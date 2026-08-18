import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type {
  Publisher,
  PublisherLogin,
  PublisherPasswordSetup,
  PublisherRegistration,
} from "./publisher.schema.js";
import { hashPassword, verifyPassword } from "./password.js";

type PublisherRow = {
  publisher_id: number;
  publisher_name: string;
  external_id: string | null;
  is_active: boolean;
  created_at: Date;
  created_by: string | null;
  updated_at: Date | null;
  updated_by: string | null;
  contact_name: string | null;
  contact_email: string | null;
  website_url: string | null;
  registration_notes: string | null;
  registration_status: string;
  password_hash: string | null;
  password_set_at: Date | null;
  last_login_at: Date | null;
};

function mapPublisher(row: PublisherRow): Publisher {
  return {
    publisherId: row.publisher_id,
    publisherName: row.publisher_name,
    externalId: row.external_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    websiteUrl: row.website_url,
    registrationNotes: row.registration_notes,
    registrationStatus: row.registration_status,
    hasPassword: row.password_hash !== null,
    passwordSetAt: row.password_set_at,
    lastLoginAt: row.last_login_at,
  };
}

const publisherSelectColumns = `
  publisher_id,
  publisher_name,
  external_id,
  is_active,
  created_at,
  created_by,
  updated_at,
  updated_by,
  contact_name,
  contact_email,
  website_url,
  registration_notes,
  registration_status,
  password_hash,
  password_set_at,
  last_login_at
`;

export async function listPublishers(db: Pool): Promise<Publisher[]> {
  const result = await db.query<PublisherRow>(`
    select
      ${publisherSelectColumns}
    from publisher
    order by publisher_name;
  `);

  return result.rows.map(mapPublisher);
}

export async function getPublisherById(
  db: Pool,
  publisherId: number,
): Promise<Publisher | null> {
  const result = await db.query<PublisherRow>(
    `
      select
        ${publisherSelectColumns}
      from publisher
      where publisher_id = $1;
    `,
    [publisherId],
  );

  const row = result.rows[0];
  return row ? mapPublisher(row) : null;
}

export async function createPublisherRegistration(
  db: Pool,
  registration: PublisherRegistration,
): Promise<Publisher> {
  const notes = registration.registrationNotes?.trim() || null;

  const result = await db.query<PublisherRow>(
    `
      insert into publisher (
        publisher_name,
        external_id,
        is_active,
        created_by,
        contact_name,
        contact_email,
        website_url,
        registration_notes,
        registration_status
      )
      values (
        $1,
        $2,
        false,
        'publisher-registration',
        $3,
        $4,
        $5,
        $6,
        'pending'
      )
      returning ${publisherSelectColumns};
    `,
    [
      registration.publisherName,
      `PUB-REG-${randomUUID().replaceAll("-", "")}`,
      registration.contactName,
      registration.contactEmail,
      registration.websiteUrl,
      notes,
    ],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Publisher registration insert did not return a row");
  }

  return mapPublisher(row);
}

export async function setPublisherPassword(
  db: Pool,
  passwordSetup: PublisherPasswordSetup,
): Promise<Publisher | null> {
  const contactEmail = passwordSetup.contactEmail.toLowerCase();
  const passwordHash = await hashPassword(passwordSetup.password);

  const result = await db.query<PublisherRow>(
    `
      update publisher
      set
        password_hash = $2,
        password_set_at = now(),
        updated_at = now(),
        updated_by = 'publisher-password-setup'
      where lower(contact_email) = $1
        and registration_status = 'approved'
        and is_active = true
      returning ${publisherSelectColumns};
    `,
    [contactEmail, passwordHash],
  );

  const row = result.rows[0];
  return row ? mapPublisher(row) : null;
}

export async function loginPublisher(
  db: Pool,
  login: PublisherLogin,
): Promise<Publisher | null> {
  const contactEmail = login.contactEmail.toLowerCase();

  const result = await db.query<PublisherRow>(
    `
      select
        ${publisherSelectColumns}
      from publisher
      where lower(contact_email) = $1
        and registration_status = 'approved'
        and is_active = true;
    `,
    [contactEmail],
  );

  const row = result.rows[0];

  if (!row?.password_hash) {
    return null;
  }

  const passwordMatches = await verifyPassword(login.password, row.password_hash);

  if (!passwordMatches) {
    return null;
  }

  const updateResult = await db.query<PublisherRow>(
    `
      update publisher
      set last_login_at = now()
      where publisher_id = $1
      returning ${publisherSelectColumns};
    `,
    [row.publisher_id],
  );

  const updatedRow = updateResult.rows[0];
  return updatedRow ? mapPublisher(updatedRow) : mapPublisher(row);
}
