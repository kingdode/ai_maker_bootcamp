/**
 * Type definitions for offer data structure
 * Matches the format provided by the Dealstackr Chrome extension
 */

export type OfferType = 'percent' | 'flat';
export type Issuer = 'chase' | 'amex';
export type Channel = 'online' | 'in_store' | 'unknown';

export interface Offer {
  merchant: string;
  offer_value: string;
  offer_type: OfferType;
  issuer: Issuer;
  card_name: string;
  channel: Channel;
  last_scanned_at: string; // ISO date string
}

/**
 * Extension storage format (from Chrome extension)
 * This matches the actual structure stored by the Dealstackr extension
 */
export interface ExtensionOffer {
  merchant_name: string;
  offer_value: string;
  offer_type: OfferType;
  issuer: Issuer;
  card_type: string; // e.g., "Chase Sapphire Reserve", "Amex Gold"
  channel: Channel;
  scanned_at: string; // ISO date string
  scanned_date?: string; // Human-readable date
  cohort_date?: string; // Cohort date in YYYY-MM-DD format
  source_url?: string; // URL where offer was scanned from
  // Backward compatibility fields
  merchant?: string;
  card_name?: string;
  last_scanned_at?: string;
}

export interface DealCohorts {
  [cohortDate: string]: ExtensionOffer[];
}

