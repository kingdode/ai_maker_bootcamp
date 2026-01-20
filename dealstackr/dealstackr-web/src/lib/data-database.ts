import { PrismaClient } from '../generated/prisma';
import { Offer, FeaturedDeal, DashboardStats, CrowdsourcedReport } from './types';
import { calculateDealScore, parseOfferValue } from './offerScoring';

// Initialize Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================================================
// OFFERS
// ============================================================================

export async function getOffers(): Promise<Offer[]> {
  const offers = await prisma.offer.findMany({
    orderBy: { scanned_at: 'desc' }
  });
  
  return offers.map(offer => ({
    ...offer,
    deal_score: offer.deal_score as any,
    crowdsourced: offer.crowdsourced as any
  }));
}

export async function getOffersByIssuer(issuer: string): Promise<Offer[]> {
  const normalizedIssuer = issuer.toLowerCase() === 'amex' ? 'Amex' : 
                           issuer.toLowerCase() === 'chase' ? 'Chase' : 'Unknown';
  
  const offers = await prisma.offer.findMany({
    where: { issuer: normalizedIssuer },
    orderBy: { scanned_at: 'desc' }
  });
  
  return offers.map(offer => ({
    ...offer,
    deal_score: offer.deal_score as any,
    crowdsourced: offer.crowdsourced as any
  }));
}

export async function getStackableOffers(): Promise<Offer[]> {
  const offers = await prisma.offer.findMany({
    where: { stackable: true },
    orderBy: { scanned_at: 'desc' }
  });
  
  return offers.map(offer => ({
    ...offer,
    deal_score: offer.deal_score as any,
    crowdsourced: offer.crowdsourced as any
  }));
}

export async function getStats(): Promise<DashboardStats> {
  const [totalOffers, totalAmex, totalChase, stackable] = await Promise.all([
    prisma.offer.count(),
    prisma.offer.count({ where: { issuer: 'Amex' } }),
    prisma.offer.count({ where: { issuer: 'Chase' } }),
    prisma.offer.count({ where: { stackable: true } })
  ]);
  
  return {
    totalOffers,
    byIssuer: {
      amex: totalAmex,
      chase: totalChase
    },
    stackable
  };
}

export async function syncOffers(newOffers: Offer[]): Promise<{ success: boolean; count: number; message: string }> {
  try {
    // Data quality filter: Amex offers must have expiration dates
    const qualityFiltered = newOffers.filter(offer => {
      if (offer.issuer?.toLowerCase() === 'amex') {
        if (!offer.expires_at) {
          return false;
        }
      }
      return true;
    });

    // Deduplicate by merchant + offer_value + issuer + card_name
    const seen = new Map<string, Offer>();
    for (const offer of qualityFiltered) {
      const key = `${offer.merchant}|${offer.offer_value}|${offer.issuer}|${offer.card_name}`;
      const existing = seen.get(key);
      if (!existing || new Date(offer.scanned_at) > new Date(existing.scanned_at)) {
        // Calculate DealStackr Score if not present
        const deal_score = offer.deal_score ?? calculateDealScore(offer.offer_value);
        
        // Parse offer value for points and estimated value
        const parsedValue = parseOfferValue(offer.offer_value);

        seen.set(key, {
          ...offer,
          id: offer.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          deal_score,
          estimated_value: parsedValue.estimatedValue,
          points_program: parsedValue.pointsProgram,
          points_amount: parsedValue.pointsAmount
        });
      }
    }
    
    const deduped = Array.from(seen.values());
    
    // Upsert all offers (insert or update)
    const upsertPromises = deduped.map(offer =>
      prisma.offer.upsert({
        where: { id: offer.id },
        update: {
          ...offer,
          deal_score: offer.deal_score as any,
          crowdsourced: offer.crowdsourced as any,
          expires_at: offer.expires_at ? new Date(offer.expires_at) : null,
          scanned_at: new Date(offer.scanned_at)
        },
        create: {
          ...offer,
          deal_score: offer.deal_score as any,
          crowdsourced: offer.crowdsourced as any,
          expires_at: offer.expires_at ? new Date(offer.expires_at) : null,
          scanned_at: new Date(offer.scanned_at)
        }
      })
    );
    
    await Promise.all(upsertPromises);
    
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

export async function clearOffers(): Promise<void> {
  await prisma.offer.deleteMany();
}

export async function getLastSyncInfo(): Promise<{ lastSync: string | null; totalOffers: number }> {
  const lastOffer = await prisma.offer.findFirst({
    orderBy: { scanned_at: 'desc' },
    select: { scanned_at: true }
  });
  
  const totalOffers = await prisma.offer.count();
  
  return {
    lastSync: lastOffer?.scanned_at.toISOString() || null,
    totalOffers
  };
}

// ============================================================================
// FEATURED DEALS
// ============================================================================

export async function getFeaturedDeals(): Promise<FeaturedDeal[]> {
  const deals = await prisma.featuredDeal.findMany({
    where: { active: true },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });
  
  return deals.map(deal => ({
    ...deal,
    cardOffer: deal.cardOffer as any,
    stackedOffers: deal.stackedOffers as any,
    aiSummary: deal.aiSummary as any,
    merchantImages: deal.merchantImages as any
  }));
}

export async function getAllFeaturedDeals(): Promise<FeaturedDeal[]> {
  const deals = await prisma.featuredDeal.findMany({
    orderBy: [
      { active: 'desc' },
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });
  
  return deals.map(deal => ({
    ...deal,
    cardOffer: deal.cardOffer as any,
    stackedOffers: deal.stackedOffers as any,
    aiSummary: deal.aiSummary as any,
    merchantImages: deal.merchantImages as any
  }));
}

export async function getFeaturedDealById(id: string): Promise<FeaturedDeal | null> {
  const deal = await prisma.featuredDeal.findUnique({
    where: { id }
  });
  
  if (!deal) return null;
  
  return {
    ...deal,
    cardOffer: deal.cardOffer as any,
    stackedOffers: deal.stackedOffers as any,
    aiSummary: deal.aiSummary as any,
    merchantImages: deal.merchantImages as any
  };
}

export async function createFeaturedDeal(deal: Omit<FeaturedDeal, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeaturedDeal> {
  const created = await prisma.featuredDeal.create({
    data: {
      ...deal,
      cardOffer: deal.cardOffer as any,
      stackedOffers: deal.stackedOffers as any,
      aiSummary: deal.aiSummary as any,
      merchantImages: deal.merchantImages as any
    }
  });
  
  return {
    ...created,
    cardOffer: created.cardOffer as any,
    stackedOffers: created.stackedOffers as any,
    aiSummary: created.aiSummary as any,
    merchantImages: created.merchantImages as any
  };
}

export async function updateFeaturedDeal(id: string, updates: Partial<FeaturedDeal>): Promise<FeaturedDeal | null> {
  try {
    const updated = await prisma.featuredDeal.update({
      where: { id },
      data: {
        ...updates,
        cardOffer: updates.cardOffer as any,
        stackedOffers: updates.stackedOffers as any,
        aiSummary: updates.aiSummary as any,
        merchantImages: updates.merchantImages as any
      }
    });
    
    return {
      ...updated,
      cardOffer: updated.cardOffer as any,
      stackedOffers: updated.stackedOffers as any,
      aiSummary: updated.aiSummary as any,
      merchantImages: updated.merchantImages as any
    };
  } catch (error) {
    return null;
  }
}

export async function deleteFeaturedDeal(id: string): Promise<boolean> {
  try {
    await prisma.featuredDeal.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// CROWDSOURCED REPORTS
// ============================================================================

export async function getCrowdsourcedReports(): Promise<Record<string, CrowdsourcedReport>> {
  const reports = await prisma.crowdsourcedReport.findMany();
  
  const result: Record<string, CrowdsourcedReport> = {};
  for (const report of reports) {
    result[report.domain] = {
      domain: report.domain,
      reports: report.reports as any,
      aggregated: report.aggregated as any,
      totalReports: report.totalReports,
      lastReportAt: report.lastReportAt.toISOString()
    };
  }
  
  return result;
}

export async function upsertCrowdsourcedReport(domain: string, data: Omit<CrowdsourcedReport, 'domain'>): Promise<void> {
  await prisma.crowdsourcedReport.upsert({
    where: { domain },
    update: {
      reports: data.reports as any,
      aggregated: data.aggregated as any,
      totalReports: data.totalReports,
      lastReportAt: new Date(data.lastReportAt)
    },
    create: {
      domain,
      reports: data.reports as any,
      aggregated: data.aggregated as any,
      totalReports: data.totalReports,
      lastReportAt: new Date(data.lastReportAt)
    }
  });
}

export async function deleteCrowdsourcedReport(domain: string): Promise<boolean> {
  try {
    await prisma.crowdsourcedReport.delete({
      where: { domain }
    });
    return true;
  } catch (error) {
    return false;
  }
}
