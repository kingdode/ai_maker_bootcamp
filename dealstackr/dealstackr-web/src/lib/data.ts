import { createClient } from '@supabase/supabase-js';
import { Offer, FeaturedDeal, DashboardStats, CrowdsourcedReport } from './types';
import { calculateDealScore, parseOfferValue } from './offerScoring';

// Initialize Supabase client with service role for server-side operations
// Service role bypasses RLS for admin operations - NEVER expose to client!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error('[DATA] ERROR: NEXT_PUBLIC_SUPABASE_URL is not set!');
}
if (!supabaseServiceKey) {
  console.error('[DATA] ERROR: SUPABASE_SERVICE_ROLE_KEY is not set!');
}

// Use service role key for server-side data operations
const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================================================
// OFFERS
// ============================================================================

export async function getOffers(): Promise<Offer[]> {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[DATA] Cannot fetch offers - Supabase not configured');
    return [];
  }
  
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .order('scanned_at', { ascending: false });
  
  if (error) {
    console.error('[DATA] Error fetching offers:', error.message, error.details);
    return [];
  }
  
  console.log('[DATA] Fetched', data?.length || 0, 'offers from Supabase');
  return data as Offer[];
}

export async function getOffersByIssuer(issuer: string): Promise<Offer[]> {
  const normalizedIssuer = issuer.toLowerCase() === 'amex' ? 'Amex' : 
                           issuer.toLowerCase() === 'chase' ? 'Chase' : 'Unknown';
  
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('issuer', normalizedIssuer)
    .order('scanned_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching offers by issuer:', error);
    return [];
  }
  
  return data as Offer[];
}

export async function getStackableOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('stackable', true)
    .order('scanned_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching stackable offers:', error);
    return [];
  }
  
  return data as Offer[];
}

export async function getStats(): Promise<DashboardStats> {
  const [allOffers, amexOffers, chaseOffers, stackableOffers] = await Promise.all([
    supabase.from('offers').select('id', { count: 'exact', head: true }),
    supabase.from('offers').select('id', { count: 'exact', head: true }).eq('issuer', 'Amex'),
    supabase.from('offers').select('id', { count: 'exact', head: true }).eq('issuer', 'Chase'),
    supabase.from('offers').select('id', { count: 'exact', head: true }).eq('stackable', true)
  ]);
  
  return {
    totalOffers: allOffers.count || 0,
    amexOffers: amexOffers.count || 0,
    chaseOffers: chaseOffers.count || 0,
    stackableOffers: stackableOffers.count || 0,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Normalize a string for deduplication
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove special characters that vary
 */
function normalizeForDedup(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Collapse spaces
    .replace(/[®™©]/g, '')          // Remove trademark symbols
    .replace(/[''""`]/g, "'")       // Normalize quotes
    .replace(/[–—]/g, '-');         // Normalize dashes
}

/**
 * Generate a consistent dedup key for an offer
 */
function getOfferDedupeKey(offer: Offer): string {
  const merchant = normalizeForDedup(offer.merchant);
  const offerValue = normalizeForDedup(offer.offer_value);
  const issuer = normalizeForDedup(offer.issuer);
  const cardName = normalizeForDedup(offer.card_name || '');
  return `${merchant}|${offerValue}|${issuer}|${cardName}`;
}

export async function syncOffers(newOffers: Offer[]): Promise<{ success: boolean; count: number; message: string }> {
  try {
    // Data quality filter
    const qualityFiltered = newOffers.filter(offer => {
      if (offer.issuer?.toLowerCase() === 'amex') {
        if (!offer.expires_at) return false;
      }
      return true;
    });

    // Get existing offers to check for duplicates
    const { data: existingOffers } = await supabase
      .from('offers')
      .select('id, merchant, offer_value, issuer, card_name');
    
    // Build a map of existing offers by their dedup key
    const existingByKey = new Map<string, string>();
    if (existingOffers) {
      for (const existing of existingOffers) {
        const key = getOfferDedupeKey(existing as Offer);
        existingByKey.set(key, existing.id);
      }
    }

    // Deduplicate new offers and match to existing IDs
    const seen = new Map<string, Offer>();
    for (const offer of qualityFiltered) {
      const key = getOfferDedupeKey(offer);
      const existing = seen.get(key);
      
      if (!existing || new Date(offer.scanned_at) > new Date(existing.scanned_at)) {
        const deal_score = offer.deal_score ?? calculateDealScore(offer.offer_value);
        const parsedValue = parseOfferValue(offer.offer_value);
        
        // Use existing ID if this offer already exists in DB, otherwise generate new
        const existingId = existingByKey.get(key);
        
        seen.set(key, {
          ...offer,
          id: existingId || offer.id || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          deal_score,
          // Add points info if detected
          points: parsedValue.points ? {
            amount: parsedValue.points.amount,
            program: parsedValue.points.program,
            valueCentsPerPoint: 1.5,
            estimatedValue: parsedValue.points.estimatedValue
          } : undefined
        });
      }
    }
    
    const deduped = Array.from(seen.values());
    
    if (deduped.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'No offers to sync'
      };
    }
    
    // Upsert to database - now IDs will match existing offers
    const { error } = await supabase
      .from('offers')
      .upsert(deduped, { onConflict: 'id' });
    
    if (error) {
      console.error('[DATA] Error syncing offers:', error);
      return {
        success: false,
        count: 0,
        message: `Error: ${error.message}`
      };
    }
    
    const newCount = deduped.filter(o => !existingByKey.has(getOfferDedupeKey(o))).length;
    const updatedCount = deduped.length - newCount;
    
    console.log(`[DATA] Synced ${deduped.length} offers (${newCount} new, ${updatedCount} updated)`);
    
    return {
      success: true,
      count: deduped.length,
      message: `Synced ${deduped.length} offers (${newCount} new, ${updatedCount} updated, ${newOffers.length - qualityFiltered.length} filtered, ${qualityFiltered.length - deduped.length} duplicates)`
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

/**
 * Remove duplicate offers from the database
 * Keeps the most recently scanned version of each offer
 */
export async function deduplicateOffers(): Promise<{ removed: number; kept: number }> {
  try {
    const { data: allOffers, error } = await supabase
      .from('offers')
      .select('*')
      .order('scanned_at', { ascending: false });
    
    if (error || !allOffers) {
      console.error('[DATA] Error fetching offers for dedup:', error);
      return { removed: 0, kept: 0 };
    }
    
    // Group by dedup key, keeping the first (most recent) one
    const seen = new Map<string, Offer>();
    const duplicateIds: string[] = [];
    
    for (const offer of allOffers) {
      const key = getOfferDedupeKey(offer as Offer);
      if (seen.has(key)) {
        // This is a duplicate - mark for deletion
        duplicateIds.push(offer.id);
      } else {
        seen.set(key, offer as Offer);
      }
    }
    
    if (duplicateIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('offers')
        .delete()
        .in('id', duplicateIds);
      
      if (deleteError) {
        console.error('[DATA] Error deleting duplicates:', deleteError);
        return { removed: 0, kept: seen.size };
      }
      
      console.log(`[DATA] Removed ${duplicateIds.length} duplicate offers, kept ${seen.size}`);
    }
    
    return { removed: duplicateIds.length, kept: seen.size };
  } catch (error) {
    console.error('[DATA] Error in deduplicateOffers:', error);
    return { removed: 0, kept: 0 };
  }
}

export async function clearOffers(): Promise<void> {
  await supabase.from('offers').delete().neq('id', '');
}

export async function getLastSyncInfo(): Promise<{ lastSync: string | null; totalOffers: number }> {
  const [lastOffer, count] = await Promise.all([
    supabase.from('offers').select('scanned_at').order('scanned_at', { ascending: false }).limit(1).single(),
    supabase.from('offers').select('id', { count: 'exact', head: true })
  ]);
  
  return {
    lastSync: lastOffer.data?.scanned_at || null,
    totalOffers: count.count || 0
  };
}

// ============================================================================
// FEATURED DEALS
// ============================================================================

export async function getFeaturedDeals(): Promise<FeaturedDeal[]> {
  const { data, error } = await supabase
    .from('featured_deals')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching featured deals:', error);
    return [];
  }
  
  return data as FeaturedDeal[];
}

export async function getAllFeaturedDeals(): Promise<FeaturedDeal[]> {
  const { data, error } = await supabase
    .from('featured_deals')
    .select('*')
    .order('active', { ascending: false })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching all featured deals:', error);
    return [];
  }
  
  return data as FeaturedDeal[];
}

export async function getFeaturedDealById(id: string): Promise<FeaturedDeal | null> {
  const { data, error } = await supabase
    .from('featured_deals')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching featured deal:', error);
    return null;
  }
  
  return data as FeaturedDeal;
}

export async function createFeaturedDeal(deal: Omit<FeaturedDeal, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeaturedDeal> {
  const { data, error } = await supabase
    .from('featured_deals')
    .insert([deal])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating featured deal:', error);
    throw error;
  }
  
  return data as FeaturedDeal;
}

export async function updateFeaturedDeal(id: string, updates: Partial<FeaturedDeal>): Promise<FeaturedDeal | null> {
  const { data, error } = await supabase
    .from('featured_deals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating featured deal:', error);
    return null;
  }
  
  return data as FeaturedDeal;
}

export async function deleteFeaturedDeal(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('featured_deals')
    .delete()
    .eq('id', id);
  
  return !error;
}

// ============================================================================
// CROWDSOURCED REPORTS (keeping simple for now - can stay file-based or migrate later)
// ============================================================================

export async function getCrowdsourcedReports(): Promise<Record<string, CrowdsourcedReport>> {
  const { data, error } = await supabase
    .from('crowdsourced_reports')
    .select('*');
  
  if (error) {
    console.error('Error fetching crowdsourced reports:', error);
    return {};
  }
  
  const result: Record<string, CrowdsourcedReport> = {};
  for (const report of data) {
    result[report.domain] = report as unknown as CrowdsourcedReport;
  }
  
  return result;
}

// Legacy sync functions (keeping for backward compatibility)
export function getOffers_LEGACY() {
  console.warn('Using legacy file-based getOffers - this should be migrated');
  return [];
}
