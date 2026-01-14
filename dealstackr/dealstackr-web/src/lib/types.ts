// Score band types
export type ScoreBand = 'elite' | 'strong' | 'decent' | 'low';

export interface ScoreBandInfo {
  band: ScoreBand;
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  description: string;
}

export interface DealScore {
  absoluteScore: number;
  percentScore: number;
  spendAdjustment: number;
  rawScore: number;
  finalScore: number;
  band: ScoreBand;
  bandInfo: ScoreBandInfo;
}

export interface Offer {
  id: string;
  merchant: string;
  offer_value: string;
  issuer: 'Chase' | 'Amex' | 'Unknown';
  card_name: string;
  channel: 'Online' | 'In-Store' | 'Both' | 'Unknown';
  expires_at?: string;
  scanned_at: string;
  stackable?: boolean;
  deal_score?: DealScore;
  crowdsourced?: {
    cashbackRate?: number;
    cashbackFixed?: number;      // Fixed $ amount (e.g., $3 back)
    cashbackType?: 'percent' | 'fixed';
    promoRate?: number;
    promoText?: string;          // Text description of promo (e.g., "Free shipping")
    portal?: string;             // Portal name (rakuten, honey, etc.)
    reportCount?: number;
    lastReportAt?: string;
  };
}

// Crowdsourced deal report from users
export interface CrowdsourcedReport {
  domain: string;
  merchant?: string;
  reports: {
    type: 'cashback' | 'promo' | 'nothing';
    portal?: string;
    rate?: number;
    fixedAmount?: number;
    cashbackType?: 'percent' | 'fixed';
    rateDisplay?: string;
    reportedAt: string;
  }[];
  aggregated: {
    cashback: {
      count: number;
      avgRate?: number;
      avgFixedAmount?: number;
      lastPortal?: string;
      lastReportAt?: string;
    };
    promo: {
      count: number;
      avgRate?: number;
      lastOffer?: string;
      lastReportAt?: string;
    };
  };
  totalReports: number;
  lastReportAt?: string;
}

export interface FeaturedDeal {
  id: string;
  title: string;
  description: string;
  merchant: string;
  totalValue: string;
  components: {
    cardOffer?: string;
    cashback?: string;
    promoCode?: string;
  };
  issuer: 'Chase' | 'Amex' | 'Both';
  validUntil?: string;
  minSpend?: number;           // Minimum spend required
  maxRedemption?: number;      // Maximum redemption amount
  createdAt: string;
  updatedAt: string;
  active: boolean;
  priority: number;
  
  // AI Summary fields (for Top Deals editorial content)
  sourceOfferId?: string;           // Link to the original Offer this was promoted from
  aiSummary?: {
    headline: string;               // AI-generated headline
    intro: string;                  // Opening paragraph
    vendorBackground?: string;      // What the vendor does/sells (paragraph)
    valueExplanation: string;       // Why this deal is good (paragraph)
    dealMerits?: string;            // Specific merits of this deal (paragraph)
    stackingNotes?: string;         // Rakuten, signup offers, etc.
    expirationNote?: string;        // Urgency messaging
    howToRedeem?: string;           // Step-by-step instructions
    generatedAt: string;            // When AI content was generated
  };
  merchantImages?: {                // Product/merchant images
    url: string;
    alt: string;
    source?: string;
  }[];
  featuredPublishedAt?: string;     // When this was published as a Top Deal
  dealScore?: number;               // DealStackr score for display
  stackType?: 'Triple Stack' | 'Double Stack' | 'Stack' | 'Deal'; // Type of deal stack
}

export interface DashboardStats {
  totalOffers: number;
  chaseOffers: number;
  amexOffers: number;
  stackableOffers: number;
  lastUpdated: string;
}
