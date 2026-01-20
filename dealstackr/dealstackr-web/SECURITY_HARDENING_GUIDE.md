# 🔐 Additional Security Hardening & Code Cleanup

**Date:** 2026-01-20  
**Status:** Post-Database Migration

---

## 🧹 Part 1: Unnecessary Code to Remove

### 1. Legacy File-Based Storage Code ❌

**Files to DELETE:**

```bash
# Old file-based data layer (replaced with Supabase version)
dealstackr-web/src/lib/data-file-backup.ts

# Old database-specific layer we created but aren't using
dealstackr-web/src/lib/data-database.ts

# Test file for points parsing (no longer needed)
dealstackr-web/test-points-parsing.js
```

**Data directory (can be removed):**
```bash
# No longer used - data is in Supabase
dealstackr-web/.data/
```

**Commands to clean up:**
```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp/dealstackr/dealstackr-web

# Remove legacy files
rm -f src/lib/data-file-backup.ts
rm -f src/lib/data-database.ts
rm -f test-points-parsing.js

# Remove old data directory (optional - doesn't hurt to keep)
# rm -rf .data/

# Commit cleanup
git add .
git commit -m "🧹 Remove legacy file-based storage code"
git push origin main
```

---

## 🔒 Part 2: Additional Security Improvements

### Priority 1: Critical (Do Now)

#### 1. Add Rate Limiting ⭐⭐⭐

**Why:** Prevent API abuse and brute-force attacks

**Install:**
```bash
npm install express-rate-limit
```

**Add to API routes:**
```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

// Apply to offers route
// src/app/api/offers/route.ts
import { apiLimiter } from '@/middleware/rateLimit';
```

#### 2. Use Supabase Service Role for Server Operations ⭐⭐⭐

**Why:** Current setup uses `anon` key which has limited RLS permissions

**Update `src/lib/data.ts`:**
```typescript
// BEFORE (less secure):
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// AFTER (more secure):
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Server-side only!
```

**Add to `.env.local` and Railway:**
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
```

**Get it from:** Supabase → Settings → API → `service_role` secret (NOT anon!)

#### 3. Enable HTTPS-Only Cookies ⭐⭐

**Update middleware:**
```typescript
// src/middleware.ts
cookies: {
  setAll(cookiesToSet) {
    cookiesToSet.forEach(({ name, value, options }) =>
      supabaseResponse.cookies.set(name, value, {
        ...options,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
        sameSite: 'strict', // Prevent CSRF
        httpOnly: true // Prevent XSS
      })
    );
  },
}
```

---

### Priority 2: Important (Do Soon)

#### 4. Add Request Logging ⭐⭐

**Why:** Monitor suspicious activity

**Create logger:**
```typescript
// src/lib/logger.ts
export function logApiRequest(req: Request, success: boolean, userId?: string) {
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    success,
    userId,
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  };
  
  // Send to logging service (e.g., LogRocket, Sentry)
  console.log('[API]', JSON.stringify(log));
}
```

#### 5. Implement API Key Rotation ⭐⭐

**Create rotation system:**
```typescript
// Support multiple valid keys during rotation period
const VALID_API_KEYS = [
  process.env.SYNC_API_KEY,          // Current key
  process.env.SYNC_API_KEY_OLD       // Previous key (grace period)
].filter(Boolean);

// In POST route:
if (!VALID_API_KEYS.includes(apiKey)) {
  return unauthorized();
}
```

**Rotation schedule:** Every 3-6 months

#### 6. Add Content Security Policy (CSP) ⭐⭐

**Add to `next.config.ts`:**
```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

---

### Priority 3: Nice to Have (Optional)

#### 7. Add Monitoring & Alerts ⭐

**Services to consider:**
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Better Uptime** - Downtime alerts
- **Vercel Analytics** - Performance monitoring

#### 8. Implement Audit Logs ⭐

**Track admin actions:**
```typescript
// src/lib/auditLog.ts
export async function logAdminAction(
  action: string,
  userId: string,
  metadata?: any
) {
  await supabase.from('audit_logs').insert({
    action,
    user_id: userId,
    metadata,
    timestamp: new Date().toISOString()
  });
}
```

#### 9. Add API Versioning ⭐

**Future-proof your API:**
```
/api/v1/offers
/api/v2/offers
```

#### 10. Database Backups ⭐

**Supabase handles this automatically!** ✅
- Daily backups (retained for 7 days)
- Point-in-time recovery available

**Verify:**
Supabase → Settings → Database → Backups

---

## 📊 Security Score

### Current Status: 8/10 🟢

| Security Feature | Status | Priority |
|-----------------|--------|----------|
| API Key Auth | ✅ Implemented | Critical |
| Input Validation | ✅ Implemented | Critical |
| CORS Restrictions | ✅ Implemented | Critical |
| RLS Policies | ✅ Implemented | Critical |
| HTTPS | ✅ Railway default | Critical |
| Environment Vars | ✅ Secure | Critical |
| Rate Limiting | ❌ Missing | High |
| Service Role Key | ⚠️ Using anon | High |
| Request Logging | ❌ Missing | Medium |
| CSP Headers | ❌ Missing | Medium |
| Audit Logs | ❌ Missing | Low |
| Monitoring | ❌ Missing | Low |

---

## 🎯 Recommended Action Plan

### Week 1 (Critical)
1. ✅ Clean up legacy code
2. ⬜ Switch to Supabase service role key
3. ⬜ Add rate limiting

### Week 2 (Important)
4. ⬜ Add request logging
5. ⬜ Implement CSP headers
6. ⬜ Set up monitoring (Sentry)

### Month 1 (Nice to Have)
7. ⬜ API key rotation system
8. ⬜ Audit logging
9. ⬜ API versioning

---

## 🚨 Security Checklist (Production)

Before going fully public:

- [x] API keys are 32+ characters
- [x] Environment variables never committed to git
- [x] HTTPS enabled (Railway default)
- [x] RLS policies active
- [x] Input validation on all endpoints
- [ ] Rate limiting active
- [ ] Service role key for server operations
- [ ] CSP headers configured
- [ ] Monitoring/alerting set up
- [ ] Database backups verified (Supabase auto)
- [ ] Admin email 2FA enabled (Supabase auth)

---

## 💡 Pro Tips

1. **Rotate API keys** every 3-6 months
2. **Monitor Railway logs** weekly for suspicious activity
3. **Review Supabase auth logs** monthly
4. **Keep dependencies updated:** `npm audit` regularly
5. **Test RLS policies** in Supabase SQL editor
6. **Use API key rotation** for zero-downtime updates

---

**Next Step:** Let's implement the top 3 critical improvements (cleanup, service role, rate limiting)?
