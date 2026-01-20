/**
 * API Input Validation Schemas
 * 
 * Uses Zod for runtime type validation and sanitization of all API inputs.
 * Prevents malformed data from entering the system.
 */

import { z } from 'zod';

// ============================================================================
// Offer Validation Schema
// ============================================================================

export const OfferSchema = z.object({
  id: z.string().max(100).optional(),
  merchant: z.string()
    .min(1, 'Merchant name is required')
    .max(100, 'Merchant name too long')
    .trim(),
  offer_value: z.string()
    .min(1, 'Offer value is required')
    .max(200, 'Offer value too long')
    .trim(),
  issuer: z.enum(['chase', 'amex', 'Chase', 'Amex', 'Unknown'], {
    message: 'Issuer must be Chase or Amex'
  }).transform(val => {
    // Normalize to proper case
    const lower = val.toLowerCase();
    if (lower === 'chase') return 'Chase' as const;
    if (lower === 'amex') return 'Amex' as const;
    return 'Unknown' as const;
  }),
  card_name: z.string()
    .max(100, 'Card name too long')
    .trim()
    .default('Unknown'),
  channel: z.enum(['online', 'in_store', 'Online', 'In-Store', 'Both', 'Unknown'], {
    message: 'Invalid channel value'
  }).default('Unknown').transform(val => {
    // Normalize to proper case
    const lower = val.toLowerCase();
    if (lower === 'online') return 'Online' as const;
    if (lower === 'in-store' || lower === 'in_store') return 'In-Store' as const;
    if (lower === 'both') return 'Both' as const;
    return 'Unknown' as const;
  }),
  expires_at: z.string()
    .datetime({ message: 'Invalid expiration date format' })
    .optional()
    .transform(val => val === null ? undefined : val),
  scanned_at: z.string()
    .datetime({ message: 'Invalid scan date format' })
    .default(() => new Date().toISOString()),
  stackable: z.boolean().optional().default(false),
  deal_score: z.object({
    absoluteScore: z.number().min(0).max(100),
    percentScore: z.number().min(0).max(100),
    spendAdjustment: z.number().min(0).max(100),
    rawScore: z.number(),
    finalScore: z.number().min(0).max(100),
    band: z.enum(['elite', 'strong', 'decent', 'low']),
    bandInfo: z.object({
      band: z.enum(['elite', 'strong', 'decent', 'low']),
      label: z.string(),
      emoji: z.string(),
      colorClass: z.string(),
      bgClass: z.string(),
      description: z.string()
    })
  }).optional(),
  points: z.object({
    amount: z.number().min(0).max(1000000),
    program: z.string().max(100),
    valueCentsPerPoint: z.number().min(0).max(10),
    estimatedValue: z.number().min(0).max(100000)
  }).optional(),
  crowdsourced: z.object({
    cashbackRate: z.number().min(0).max(100).optional(),
    cashbackFixed: z.number().min(0).optional(),
    cashbackType: z.enum(['percent', 'fixed']).optional(),
    promoRate: z.number().min(0).max(100).optional(),
    promoText: z.string().max(500).optional(),
    portal: z.string().max(100).optional(),
    reportCount: z.number().min(0).optional(),
    lastReportAt: z.string().datetime().optional()
  }).optional()
}).transform(data => ({
  ...data,
  // Ensure id is always present
  id: data.id || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}));

export const OffersArraySchema = z.array(OfferSchema)
  .min(1, 'At least one offer is required')
  .max(1000, 'Too many offers (max 1000 per request)');

export type ValidatedOffer = z.infer<typeof OfferSchema>;

// ============================================================================
// Featured Deal Validation Schema
// ============================================================================

export const FeaturedDealSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  description: z.string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long')
    .trim(),
  merchant: z.string()
    .min(1, 'Merchant is required')
    .max(100, 'Merchant name too long')
    .trim(),
  totalValue: z.string()
    .min(1, 'Total value is required')
    .max(100, 'Total value too long')
    .trim(),
  components: z.object({
    cardOffer: z.string().max(200).optional(),
    cashback: z.string().max(200).optional(),
    promoCode: z.string().max(100).optional()
  }),
  issuer: z.enum(['Chase', 'Amex', 'Both'], {
    message: 'Issuer must be Chase, Amex, or Both'
  }),
  validUntil: z.string().datetime().optional(),
  minSpend: z.number().min(0).max(1000000).optional(),
  maxRedemption: z.number().min(0).max(1000000).optional(),
  active: z.boolean().default(true),
  priority: z.number().min(0).max(100).default(1),
  sourceOfferId: z.string().max(100).optional(),
  aiSummary: z.object({
    headline: z.string().max(200),
    intro: z.string().max(2000),
    vendorBackground: z.string().max(5000).optional(),
    valueExplanation: z.string().max(5000),
    dealMerits: z.string().max(5000).optional(),
    stackingNotes: z.string().max(5000).optional(),
    expirationNote: z.string().max(2000).optional(),
    howToRedeem: z.string().max(5000).optional(),
    generatedAt: z.string().datetime()
  }).optional(),
  merchantImages: z.array(z.object({
    url: z.string().url({ message: 'Invalid image URL' }).max(500),
    alt: z.string().max(200),
    source: z.string().max(200).optional()
  })).max(10).optional(),
  featuredPublishedAt: z.string().datetime().optional(),
  dealScore: z.number().min(0).max(100).optional(),
  stackType: z.enum(['Triple Stack', 'Double Stack', 'Stack', 'Deal']).optional(),
  articleContent: z.string().max(20000).optional()
});

export type ValidatedFeaturedDeal = z.infer<typeof FeaturedDealSchema>;

// ============================================================================
// Crowdsourced Report Validation Schema
// ============================================================================

export const CrowdsourcedReportSchema = z.object({
  domain: z.string()
    .min(1, 'Domain is required')
    .max(100, 'Domain too long')
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid domain format')
    .transform(val => val.toLowerCase().replace(/^www\./, '')),
  merchant: z.string().max(100).optional(),
  reports: z.array(z.object({
    type: z.enum(['cashback', 'promo', 'nothing']),
    portal: z.string().max(100).optional(),
    rate: z.number().min(0).max(100).optional(),
    fixedAmount: z.number().min(0).max(10000).optional(),
    cashbackType: z.enum(['percent', 'fixed']).optional(),
    rateDisplay: z.string().max(100).optional(),
    reportedAt: z.string().datetime(),
    reporterHash: z.string().max(100).optional()
  })).max(50, 'Too many reports (max 50)'),
  aggregated: z.object({
    cashback: z.object({
      count: z.number().min(0),
      avgRate: z.number().min(0).max(100).optional(),
      avgFixedAmount: z.number().min(0).optional(),
      lastPortal: z.string().max(100).optional(),
      lastReportAt: z.string().datetime().optional()
    }),
    promo: z.object({
      count: z.number().min(0),
      avgRate: z.number().min(0).max(100).optional(),
      lastOffer: z.string().max(500).optional(),
      lastReportAt: z.string().datetime().optional()
    })
  }),
  totalReports: z.number().min(0).max(1000),
  lastReportAt: z.string().datetime().optional()
});

export const CrowdsourcedDealsSchema = z.record(
  z.string(), // domain key
  CrowdsourcedReportSchema
).refine(
  (data) => Object.keys(data).length <= 1000,
  { message: 'Too many domains (max 1000)' }
);

export type ValidatedCrowdsourcedReport = z.infer<typeof CrowdsourcedReportSchema>;

// ============================================================================
// AI Article Generation Validation
// ============================================================================

export const ArticleRequestSchema = z.object({
  merchant: z.string()
    .min(1, 'Merchant is required')
    .max(100, 'Merchant name too long')
    .trim(),
  offerValue: z.string()
    .min(1, 'Offer value is required')
    .max(200, 'Offer value too long')
    .trim(),
  issuer: z.string()
    .min(1, 'Issuer is required')
    .max(50, 'Issuer name too long')
    .trim(),
  cardName: z.string().max(100).optional(),
  minSpend: z.number().min(0).max(1000000).optional(),
  maxRedemption: z.number().min(0).max(1000000).optional(),
  expiresAt: z.string().datetime().optional(),
  cashback: z.string().max(200).optional(),
  promoCode: z.string().max(100).optional(),
  dealScore: z.number().min(0).max(100).optional(),
  stackType: z.string().max(50).optional()
});

export type ValidatedArticleRequest = z.infer<typeof ArticleRequestSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates and sanitizes API input data
 * Returns validated data or throws ZodError with detailed validation errors
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Re-throw with formatted error messages
      const formattedErrors = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError('Input validation failed', formattedErrors);
    }
    throw error;
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates API key format
 */
export function validateApiKey(key: string | null): boolean {
  if (!key) return false;
  // API key should be at least 32 characters and alphanumeric
  return key.length >= 32 && /^[a-zA-Z0-9]+$/.test(key);
}

/**
 * Sanitizes HTML/script content from user input
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Uses constant-time comparison to avoid leaking information about
 * which characters matched/mismatched
 * 
 * @param a - First string (user input)
 * @param b - Second string (secret)
 * @returns true if strings are equal
 */
export function timingSafeCompare(a: string | null, b: string | null | undefined): boolean {
  // Handle null/undefined cases
  if (!a || !b) return false;
  
  // Convert to buffers for constant-time comparison
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  
  // Different lengths - still do comparison to prevent length leaking
  if (bufferA.length !== bufferB.length) {
    // Compare with self to maintain constant time
    try {
      const { timingSafeEqual } = require('crypto');
      timingSafeEqual(bufferA, bufferA);
    } catch {
      // Fallback if crypto not available
    }
    return false;
  }
  
  try {
    const { timingSafeEqual } = require('crypto');
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    // Fallback for environments without crypto module (edge runtime)
    // This is less secure but better than crashing
    let result = 0;
    for (let i = 0; i < bufferA.length; i++) {
      result |= bufferA[i] ^ bufferB[i];
    }
    return result === 0;
  }
}
