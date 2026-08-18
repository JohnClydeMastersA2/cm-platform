import type { Pool } from "pg";
import type { Advertiser } from "./advertiser.schema.js";

type AdvertiserRow = {
  advertiser_id: number;
  advertiser_name: string;
  external_id: string | null;
  is_active: boolean;
  created_at: Date;
  created_by: string | null;
  updated_at: Date | null;
  updated_by: string | null;
};

function mapAdvertiser(row: AdvertiserRow): Advertiser {
  return {
    advertiserId: row.advertiser_id,
    advertiserName: row.advertiser_name,
    externalId: row.external_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function listAdvertisers(db: Pool): Promise<Advertiser[]> {
  const result = await db.query<AdvertiserRow>(`
    select
      advertiser_id,
      advertiser_name,
      external_id,
      is_active,
      created_at,
      created_by,
      updated_at,
      updated_by
    from advertiser
    order by advertiser_name;
  `);

  return result.rows.map(mapAdvertiser);
}

export async function getAdvertiserById(
  db: Pool,
  advertiserId: number,
): Promise<Advertiser | null> {
  const result = await db.query<AdvertiserRow>(
    `
      select
        advertiser_id,
        advertiser_name,
        external_id,
        is_active,
        created_at,
        created_by,
        updated_at,
        updated_by
      from advertiser
      where advertiser_id = $1;
    `,
    [advertiserId],
  );

  const row = result.rows[0];
  return row ? mapAdvertiser(row) : null;
}
