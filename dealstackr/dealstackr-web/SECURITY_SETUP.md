# 🔒 DealStackr Security Setup Guide

## ⚠️ CRITICAL: Complete Before Production Deployment

This guide walks you through securing your DealStackr installation. **Complete ALL steps** before deploying to production.

---

## Phase 1: Critical Security Fixes (REQUIRED)

### 1. Generate Secure API Key

The `SYNC_API_KEY` is used to authenticate the Chrome extension when syncing offers. It must be cryptographically secure.

```bash
# Generate a secure 64-character hexadecimal key
openssl rand -hex 32
```

**Example output:**
```
a7b3c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0
```

### 2. Configure Environment Variables

#### Development (.env.local)

Create `/dealstackr-web/.env.local`:

```bash
# Copy the example file
cp env.example .env.local

# Edit with your values
nano .env.local
```

Fill in these **REQUIRED** values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_EMAIL=your-email@example.com
SYNC_API_KEY=<paste-the-key-from-step-1>
```

#### Production (Railway)

1. Go to Railway Dashboard → Your Project → Variables
2. Add each environment variable:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_EMAIL`
   - `SYNC_API_KEY` (use the generated key from step 1)
   - `OPENAI_API_KEY` (if using AI features)
   - `NEXT_PUBLIC_APP_URL` (your production domain)
   - `CHROME_EXTENSION_ID` (after publishing extension)

3. Click **Redeploy** after adding variables

### 3. Enable Supabase Row Level Security (RLS)

**If you're using Supabase for data storage**, you MUST enable RLS:

1. Read the full guide: [SUPABASE_RLS_SETUP.md](./SUPABASE_RLS_SETUP.md)
2. Execute all SQL commands in Supabase Dashboard
3. Test policies thoroughly

**If you're using file-based storage**, RLS is not required but you should:
- Plan migration to database for production
- Implement file permission restrictions on Railway

### 4. Update CORS Origins

Edit your Railway environment variables to add:

```env
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
CHROME_EXTENSION_ID=your-extension-id-from-chrome-web-store
```

The application will automatically whitelist only these origins.

### 5. Verify Security Configuration

Run this checklist:

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp/dealstackr/dealstackr-web

# Check that Zod is installed
npm list zod

# Verify environment variables (development)
grep -E "SYNC_API_KEY|ADMIN_EMAIL" .env.local

# Test API validation (should fail with validation error)
curl -X POST http://localhost:3000/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: wrong-key" \
  -d '{"invalid": "data"}'
```

---

## Phase 2: Additional Security Hardening (RECOMMENDED)

### 1. Add Rate Limiting (Recommended for Production)

Install Upstash Redis rate limiting:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Create `src/middleware.ts` addition:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiter (10 requests per 10 seconds)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

// In middleware, before authentication check:
const identifier = request.ip ?? 'anonymous';
const { success } = await ratelimit.limit(identifier);

if (!success) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 }
  );
}
```

Add to Railway environment:

```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### 2. Enable HTTPS Only (Railway)

Railway automatically provides HTTPS, but you should:

1. Add custom domain in Railway dashboard
2. Verify SSL certificate is active
3. Test: `https://your-domain.com`

### 3. Add Security Headers

Create `next.config.ts` additions:

```typescript
const nextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

### 4. Configure Supabase Auth Settings

In Supabase Dashboard → Authentication → Settings:

- **Enable email confirmation**: ON (prevents fake signups)
- **Secure email change**: ON
- **Session timeout**: 24 hours
- **JWT expiry**: 3600 seconds (1 hour)
- **Disable sign up**: Consider enabling if you want invite-only admin

---

## Phase 3: Testing Security

### Test 1: API Key Validation

```bash
# Should fail (wrong key)
curl -X POST https://your-domain.com/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: wrong-key" \
  -d '{"offers": []}'

# Should succeed (correct key)
curl -X POST https://your-domain.com/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: YOUR_ACTUAL_KEY" \
  -d '{"offers": [{"merchant": "Test", "offer_value": "$10", "issuer": "Chase", "card_name": "Test", "channel": "Online", "scanned_at": "2026-01-20T00:00:00Z"}]}'
```

### Test 2: Input Validation

```bash
# Should fail (missing required fields)
curl -X POST https://your-domain.com/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: YOUR_KEY" \
  -d '{"offers": [{"invalid": "data"}]}'

# Should return validation errors in response
```

### Test 3: CORS Restrictions

```bash
# From browser console on a different domain
fetch('https://your-domain.com/api/offers', {
  headers: {
    'Origin': 'https://evil-site.com'
  }
})
// Should be blocked by CORS
```

### Test 4: Admin Authentication

```bash
# Should redirect to login (not authenticated)
curl -L https://your-domain.com/admin

# Should allow access (authenticated with correct email)
# Test in browser after logging in
```

### Test 5: RLS Policies (if using Supabase database)

Run tests in Supabase SQL Editor (see SUPABASE_RLS_SETUP.md)

---

## Phase 4: Monitoring & Alerting

### 1. Set Up Error Tracking

Install Sentry:

```bash
npm install @sentry/nextjs
```

Add to Railway environment:

```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### 2. Monitor API Usage

Check Railway logs regularly:

```bash
# View recent logs
railway logs

# Filter for errors
railway logs | grep ERROR

# Monitor API key failures
railway logs | grep "Unauthorized"
```

### 3. Set Up Alerts

In Railway Dashboard:

1. Go to Observability → Alerts
2. Create alert for:
   - High CPU usage (> 80%)
   - Memory usage (> 90%)
   - Crash/restart events
   - HTTP 401/403 errors (spike indicates attack)

---

## Security Incident Response

If you suspect a security breach:

### Immediate Actions

1. **Rotate API Keys**
   ```bash
   # Generate new key
   openssl rand -hex 32
   
   # Update in Railway immediately
   # Update Chrome extension with new key
   ```

2. **Check Logs**
   ```bash
   railway logs --tail 1000 > incident-logs.txt
   # Review for suspicious activity
   ```

3. **Revoke Compromised Sessions**
   - Go to Supabase Dashboard → Authentication → Users
   - Sign out all users
   - Force password reset for admin

4. **Review Data**
   - Check for unauthorized offers/deals
   - Clear suspicious data
   - Backup current state

### Post-Incident

1. Conduct security review
2. Update all secrets
3. Review access logs
4. Document incident
5. Implement additional security measures

---

## Compliance Checklist

### Before Launch

- [ ] All environment variables are set in production
- [ ] `SYNC_API_KEY` is secure (64+ characters, random)
- [ ] Supabase RLS is enabled (if using database)
- [ ] CORS is restricted to known origins only
- [ ] Input validation is applied to all APIs
- [ ] HTTPS is enforced (Railway default)
- [ ] Admin authentication is tested
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting is configured
- [ ] Security headers are set
- [ ] `.env.local` is in `.gitignore`
- [ ] Monitoring/alerting is configured

### Regular Maintenance

- [ ] Review Railway logs weekly
- [ ] Rotate `SYNC_API_KEY` quarterly
- [ ] Update dependencies monthly (`npm audit fix`)
- [ ] Review admin access quarterly
- [ ] Backup data weekly (if using file storage)
- [ ] Test security annually (penetration test)

---

## Additional Resources

- [Next.js Security Best Practices](https://nextjs.org/docs/pages/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Railway Security](https://docs.railway.app/guides/private-networking)

---

## Support

If you encounter issues:

1. Check Railway logs: `railway logs`
2. Verify environment variables in Railway dashboard
3. Test with curl commands above
4. Review Supabase auth logs
5. Check browser console for client-side errors

---

**Last Updated:** 2026-01-20
**Security Version:** 1.0
