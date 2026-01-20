/**
 * CORS Configuration and Validation
 * 
 * Implements secure CORS policies that restrict API access to known origins only.
 * Replaces wildcard CORS with whitelist-based approach.
 */

/**
 * Get allowed origins based on environment
 */
export function getAllowedOrigins(): string[] {
  const origins = [
    process.env.NEXT_PUBLIC_APP_URL, // Production web app URL
    'http://localhost:3000', // Development
    'http://localhost:3001', // Alternative dev port
  ];

  // Add Chrome extension origin if extension ID is configured
  if (process.env.CHROME_EXTENSION_ID) {
    origins.push(`chrome-extension://${process.env.CHROME_EXTENSION_ID}`);
  }

  // Filter out undefined values
  return origins.filter((origin): origin is string => Boolean(origin));
}

/**
 * Validate and get CORS headers for a request
 * Returns appropriate headers based on origin validation
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  
  // Check if request origin is in allowed list
  const isAllowed = requestOrigin && allowedOrigins.includes(requestOrigin);
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-API-Key',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // Only set origin if it's in the allowed list
  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (process.env.NODE_ENV === 'development') {
    // In development, be more permissive but log warning
    console.warn(`[CORS] Allowing non-whitelisted origin in development: ${requestOrigin}`);
    headers['Access-Control-Allow-Origin'] = requestOrigin || '*';
  }

  return headers;
}

/**
 * Validate that request origin is allowed
 * Used for additional security checks beyond CORS headers
 */
export function isOriginAllowed(requestOrigin: string | null): boolean {
  if (!requestOrigin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(requestOrigin);
}

/**
 * Get CORS headers for OPTIONS preflight requests
 */
export function getPreflightHeaders(requestOrigin: string | null): Record<string, string> {
  return getCorsHeaders(requestOrigin);
}
