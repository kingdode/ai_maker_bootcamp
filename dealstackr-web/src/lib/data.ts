import { Offer, FeaturedDeal, DashboardStats } from './types';
import { calculateDealScore } from './offerScoring';
import fs from 'fs';
import path from 'path';

// File-based storage for persistence
const DATA_DIR = path.join(process.cwd(), '.data');
const OFFERS_FILE = path.join(DATA_DIR, 'offers.json');
const FEATURED_FILE = path.join(DATA_DIR, 'featured.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load offers from file
function loadOffers(): Offer[] {
  ensureDataDir();
  try {
    if (fs.existsSync(OFFERS_FILE)) {
      const data = fs.readFileSync(OFFERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading offers:', error);
  }
  return [];
}

// Save offers to file
function saveOffers(offers: Offer[]) {
  ensureDataDir();
  fs.writeFileSync(OFFERS_FILE, JSON.stringify(offers, null, 2));
}

// Load featured deals from file
function loadFeaturedDeals(): FeaturedDeal[] {
  ensureDataDir();
  try {
    if (fs.existsSync(FEATURED_FILE)) {
      const data = fs.readFileSync(FEATURED_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading featured deals:', error);
  }
  return [];
}

// Save featured deals to file
function saveFeaturedDeals(deals: FeaturedDeal[]) {
  ensureDataDir();
  fs.writeFileSync(FEATURED_FILE, JSON.stringify(deals, null, 2));
}

// In-memory cache
let offersCache: Offer[] | null = null;
let featuredCache: FeaturedDeal[] | null = null;

function getOffersCache(): Offer[] {
  if (offersCache === null) {
    offersCache = loadOffers();
  }
  return offersCache;
}

function getFeaturedCache(): FeaturedDeal[] {
  if (featuredCache === null) {
    featuredCache = loadFeaturedDeals();
  }
  return featuredCache;
}

// Featured Deals functions
export function getFeaturedDeals(): FeaturedDeal[] {
  return getFeaturedCache().filter(d => d.active).sort((a, b) => a.priority - b.priority);
}

export function getAllFeaturedDeals(): FeaturedDeal[] {
  return [...getFeaturedCache()].sort((a, b) => a.priority - b.priority);
}

export function getFeaturedDealById(id: string): FeaturedDeal | undefined {
  return getFeaturedCache().find(d => d.id === id);
}

export function createFeaturedDeal(deal: Omit<FeaturedDeal, 'id' | 'createdAt' | 'updatedAt'>): FeaturedDeal {
  const deals = getFeaturedCache();
  const newDeal: FeaturedDeal = {
    ...deal,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  deals.push(newDeal);
  featuredCache = deals;
  saveFeaturedDeals(deals);
  return newDeal;
}

export function updateFeaturedDeal(id: string, updates: Partial<FeaturedDeal>): FeaturedDeal | null {
  const deals = getFeaturedCache();
  const index = deals.findIndex(d => d.id === id);
  if (index === -1) return null;
  
  deals[index] = {
    ...deals[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  featuredCache = deals;
  saveFeaturedDeals(deals);
  return deals[index];
}

export function deleteFeaturedDeal(id: string): boolean {
  const deals = getFeaturedCache();
  const index = deals.findIndex(d => d.id === id);
  if (index === -1) return false;
  
  deals.splice(index, 1);
  featuredCache = deals;
  saveFeaturedDeals(deals);
  return true;
}

// Offers functions
export function getOffers(): Offer[] {
  // Ensure all offers have deal scores, then sort by score (highest first)
  return [...getOffersCache()]
    .map(offer => ({
      ...offer,
      deal_score: offer.deal_score ?? calculateDealScore(offer.offer_value)
    }))
    .sort((a, b) => (b.deal_score?.finalScore ?? 0) - (a.deal_score?.finalScore ?? 0));
}

export function getOffersByIssuer(issuer: 'Chase' | 'Amex'): Offer[] {
  return getOffersCache().filter(o => o.issuer === issuer);
}

export function getOfferById(id: string): Offer | undefined {
  return getOffersCache().find(o => o.id === id);
}

export function getStackableOffers(): Offer[] {
  return getOffersCache().filter(o => o.stackable);
}

export function getStats(): DashboardStats {
  const offers = getOffersCache();
  return {
    totalOffers: offers.length,
    chaseOffers: offers.filter(o => o.issuer === 'Chase').length,
    amexOffers: offers.filter(o => o.issuer === 'Amex').length,
    stackableOffers: offers.filter(o => o.stackable).length,
    lastUpdated: new Date().toISOString()
  };
}

// Sync offers from Chrome extension
export function syncOffers(newOffers: Offer[]): { success: boolean; count: number; message: string } {
  try {
    // Deduplicate by merchant + offer_value + issuer
    const seen = new Map<string, Offer>();
    for (const offer of newOffers) {
      const key = `${offer.merchant}|${offer.offer_value}|${offer.issuer}|${offer.card_name}`;
      const existing = seen.get(key);
      if (!existing || new Date(offer.scanned_at) > new Date(existing.scanned_at)) {
        // Calculate DealStackr Score if not present
        const deal_score = offer.deal_score ?? calculateDealScore(offer.offer_value);
        
        seen.set(key, {
          ...offer,
          id: offer.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          deal_score
        });
      }
    }
    
    const deduped = Array.from(seen.values());
    offersCache = deduped;
    saveOffers(deduped);
    
    return {
      success: true,
      count: deduped.length,
      message: `Synced ${deduped.length} offers (${newOffers.length - deduped.length} duplicates removed)`
    };
  } catch (error) {
    console.error('Error syncing offers:', error);
    return {
      success: false,
      count: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Clear all offers
export function clearOffers(): void {
  offersCache = [];
  saveOffers([]);
}

// Get last sync info
export function getLastSyncInfo(): { lastSync: string | null; offerCount: number } {
  const offers = getOffersCache();
  if (offers.length === 0) {
    return { lastSync: null, offerCount: 0 };
  }
  
  const mostRecent = offers.reduce((latest, offer) => {
    const offerDate = new Date(offer.scanned_at);
    return offerDate > latest ? offerDate : latest;
  }, new Date(0));
  
  return {
    lastSync: mostRecent.toISOString(),
    offerCount: offers.length
  };
}
