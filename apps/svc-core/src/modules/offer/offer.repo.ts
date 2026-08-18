import type { Pool } from "pg";
import type { Offer } from "./offer.schema.js";

type OfferRow = {
  offer_id: number;
  advertiser_id: number;
  advertiser_name: string;
  offer_name: string;
  external_id: string | null;
  is_active: boolean;
  created_at: Date;
  created_by: string | null;
  updated_at: Date | null;
  updated_by: string | null;
};

function mapOffer(row: OfferRow): Offer {
  return {
    offerId: row.offer_id,
    advertiserId: row.advertiser_id,
    advertiserName: row.advertiser_name,
    offerName: row.offer_name,
    externalId: row.external_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function listOffers(db: Pool): Promise<Offer[]> {
  const result = await db.query<OfferRow>(`
    select
      o.offer_id,
      o.advertiser_id,
      a.advertiser_name,
      o.offer_name,
      o.external_id,
      o.is_active,
      o.created_at,
      o.created_by,
      o.updated_at,
      o.updated_by
    from offer o
    join advertiser a
      on a.advertiser_id = o.advertiser_id
    order by o.offer_name;
  `);

  return result.rows.map(mapOffer);
}

export async function getOfferById(
  db: Pool,
  offerId: number,
): Promise<Offer | null> {
  const result = await db.query<OfferRow>(
    `
      select
        o.offer_id,
        o.advertiser_id,
        a.advertiser_name,
        o.offer_name,
        o.external_id,
        o.is_active,
        o.created_at,
        o.created_by,
        o.updated_at,
        o.updated_by
      from offer o
      join advertiser a
        on a.advertiser_id = o.advertiser_id
      where o.offer_id = $1;
    `,
    [offerId],
  );

  const row = result.rows[0];
  return row ? mapOffer(row) : null;
}
