/**
 * Simple In-Memory Rate Limiter
 * 
 * For production, consider using:
 * - Upstash Rate Limit (serverless-friendly)
 * - Redis-based rate limiting
 * - Vercel Edge Config
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Time window in seconds
   * @default 900 (15 minutes)
   */
  windowSeconds?: number;
  
  /**
   * Maximum requests per window
   * @default 100
   */
  maxRequests?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier (IP address, user ID, API key, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 * 
 * @example
 * ```typescript
 * const ip = request.headers.get('x-forwarded-for') || 'unknown';
 * const result = checkRateLimit(ip, { maxRequests: 100, windowSeconds: 900 });
 * 
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests. Try again later.' },
 *     { 
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': result.limit.toString(),
 *         'X-RateLimit-Remaining': result.remaining.toString(),
 *         'X-RateLimit-Reset': result.reset.toString()
 *       }
 *     }
 *   );
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const windowSeconds = config.windowSeconds ?? 900; // 15 minutes default
  const maxRequests = config.maxRequests ?? 100;
  
  const now = Date.now();
  const resetTime = now + (windowSeconds * 1000);
  
  // Get or create entry
  let entry = rateLimitStore.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    // New window
    entry = {
      count: 1,
      resetTime
    };
    rateLimitStore.set(identifier, entry);
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Math.floor(resetTime / 1000)
    };
  }
  
  // Check if over limit
  if (entry.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: Math.floor(entry.resetTime / 1000)
    };
  }
  
  // Increment counter
  entry.count++;
  
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    reset: Math.floor(entry.resetTime / 1000)
  };
}

/**
 * Get the client identifier from a request
 * Uses IP address, with fallbacks
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers (Railway, Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';
  
  return ip.trim();
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    ...(result.success ? {} : { 'Retry-After': ((result.reset * 1000) - Date.now()).toString() })
  };
}
