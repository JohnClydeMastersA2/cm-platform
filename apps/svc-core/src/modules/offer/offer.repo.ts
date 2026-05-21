import sql from "mssql";
import type { Offer } from "./offer.schema.js";

type OfferRow = {
  OfferId: number;
  AdvertiserId: number;
  AdvertiserName: string;
  OfferName: string;
  ExternalId: string | null;
  IsActive: boolean;
  CreatedAt: Date;
  CreatedBy: string | null;
  UpdatedAt: Date | null;
  UpdatedBy: string | null;
};

function mapOffer(row: OfferRow): Offer {
  return {
    offerId: row.OfferId,
    advertiserId: row.AdvertiserId,
    advertiserName: row.AdvertiserName,
    offerName: row.OfferName,
    externalId: row.ExternalId,
    isActive: row.IsActive,
    createdAt: row.CreatedAt,
    createdBy: row.CreatedBy,
    updatedAt: row.UpdatedAt,
    updatedBy: row.UpdatedBy,
  };
}

export async function listOffers(db: sql.ConnectionPool): Promise<Offer[]> {
  const result = await db.request().query<OfferRow>(`
    select
      o.OfferId,
      o.AdvertiserId,
      a.AdvertiserName,
      o.OfferName,
      o.ExternalId,
      o.IsActive,
      o.CreatedAt,
      o.CreatedBy,
      o.UpdatedAt,
      o.UpdatedBy
    from dbo.Offer o
    join dbo.Advertiser a
      on a.AdvertiserId = o.AdvertiserId
    order by o.OfferName;
  `);

  return result.recordset.map(mapOffer);
}

export async function getOfferById(
  db: sql.ConnectionPool,
  offerId: number,
): Promise<Offer | null> {
  const result = await db
    .request()
    .input("offerId", sql.Int, offerId)
    .query<OfferRow>(`
      select
        o.OfferId,
        o.AdvertiserId,
        a.AdvertiserName,
        o.OfferName,
        o.ExternalId,
        o.IsActive,
        o.CreatedAt,
        o.CreatedBy,
        o.UpdatedAt,
        o.UpdatedBy
      from dbo.Offer o
      join dbo.Advertiser a
        on a.AdvertiserId = o.AdvertiserId
      where o.OfferId = @offerId;
    `);

  const row = result.recordset[0];
  return row ? mapOffer(row) : null;
}