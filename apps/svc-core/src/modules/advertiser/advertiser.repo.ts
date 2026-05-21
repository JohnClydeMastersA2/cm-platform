import sql from "mssql";
import type { Advertiser } from "./advertiser.schema.js";

type AdvertiserRow = {
  AdvertiserId: number;
  AdvertiserName: string;
  ExternalId: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  CreatedBy: string | null;
  UpdatedAt: Date | null;
  UpdatedBy: string | null;
};

function mapAdvertiser(row: AdvertiserRow): Advertiser {
  return {
    advertiserId: row.AdvertiserId,
    advertiserName: row.AdvertiserName,
    externalId: row.ExternalId,
    isActive: row.IsActive,
    createdAt: row.CreatedAt,
    createdBy: row.CreatedBy,
    updatedAt: row.UpdatedAt,
    updatedBy: row.UpdatedBy,
  };
}

export async function listAdvertisers(db: sql.ConnectionPool): Promise<Advertiser[]> {
  const result = await db.request().query<AdvertiserRow>(`
    select
      AdvertiserId,
      AdvertiserName,
      ExternalId,
      IsActive,
      CreatedAt,
      CreatedBy,
      UpdatedAt,
      UpdatedBy
    from dbo.Advertiser
    order by AdvertiserName;
  `);

  return result.recordset.map(mapAdvertiser);
}

export async function getAdvertiserById(
  db: sql.ConnectionPool,
  advertiserId: number,
): Promise<Advertiser | null> {
  const result = await db
    .request()
    .input("advertiserId", sql.Int, advertiserId)
    .query<AdvertiserRow>(`
      select
        AdvertiserId,
        AdvertiserName,
        ExternalId,
        IsActive,
        CreatedAt,
        CreatedBy,
        UpdatedAt,
        UpdatedBy
      from dbo.Advertiser
      where AdvertiserId = @advertiserId;
    `);

  const row = result.recordset[0];
  return row ? mapAdvertiser(row) : null;
}