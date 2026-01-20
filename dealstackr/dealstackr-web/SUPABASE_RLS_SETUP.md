# Supabase Row Level Security (RLS) Policies

## ⚠️ CRITICAL SECURITY REQUIREMENT

**YOU MUST ENABLE ROW LEVEL SECURITY (RLS) ON ALL SUPABASE TABLES BEFORE DEPLOYING TO PRODUCTION.**

Without RLS, anyone with your `NEXT_PUBLIC_SUPABASE_ANON_KEY` can read and write all data directly from their browser.

---

## Quick Setup

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to: **Authentication → Policies**
3. Create the following tables and policies

---

## Database Schema

If you're using Supabase for data storage (instead of file-based storage), create these tables:

```sql
-- ==============================================================================
-- Offers Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  merchant TEXT NOT NULL,
  offer_value TEXT NOT NULL,
  issuer TEXT NOT NULL CHECK (issuer IN ('Chase', 'Amex', 'Unknown')),
  card_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('Online', 'In-Store', 'Both', 'Unknown')),
  expires_at TIMESTAMPTZ,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stackable BOOLEAN DEFAULT FALSE,
  deal_score JSONB,
  crowdsourced JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_offers_issuer ON offers(issuer);
CREATE INDEX idx_offers_merchant ON offers(merchant);
CREATE INDEX idx_offers_scanned_at ON offers(scanned_at DESC);
CREATE INDEX idx_offers_score ON offers((deal_score->>'finalScore')::NUMERIC DESC);

-- ==============================================================================
-- Featured Deals Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS featured_deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT NOT NULL,
  total_value TEXT NOT NULL,
  components JSONB NOT NULL,
  issuer TEXT NOT NULL CHECK (issuer IN ('Chase', 'Amex', 'Both')),
  valid_until TIMESTAMPTZ,
  min_spend NUMERIC,
  max_redemption NUMERIC,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 1,
  source_offer_id TEXT,
  ai_summary JSONB,
  merchant_images JSONB,
  featured_published_at TIMESTAMPTZ,
  deal_score NUMERIC,
  stack_type TEXT,
  article_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_featured_deals_active ON featured_deals(active) WHERE active = TRUE;
CREATE INDEX idx_featured_deals_priority ON featured_deals(priority);
CREATE INDEX idx_featured_deals_published ON featured_deals(featured_published_at DESC);

-- ==============================================================================
-- Crowdsourced Reports Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS crowdsourced_reports (
  domain TEXT PRIMARY KEY,
  merchant TEXT,
  reports JSONB NOT NULL DEFAULT '[]',
  aggregated JSONB NOT NULL,
  total_reports INTEGER NOT NULL DEFAULT 0,
  last_report_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_crowdsourced_reports_total ON crowdsourced_reports(total_reports DESC);
CREATE INDEX idx_crowdsourced_reports_updated ON crowdsourced_reports(updated_at DESC);
```

---

## Enable Row Level Security

**REQUIRED:** Enable RLS on all tables

```sql
-- Enable RLS on all tables
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowdsourced_reports ENABLE ROW LEVEL SECURITY;
```

---

## RLS Policies

### Offers Table Policies

```sql
-- ==============================================================================
-- OFFERS TABLE: Public read, authenticated write
-- ==============================================================================

-- Policy: Anyone can read all offers
CREATE POLICY "Public can read all offers"
ON offers
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert offers
-- (Chrome extension with valid API key authenticates)
CREATE POLICY "Authenticated users can insert offers"
ON offers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only admin can update offers
CREATE POLICY "Admin can update offers"
ON offers
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' = current_setting('app.settings.admin_email', true)
);

-- Policy: Only admin can delete offers
CREATE POLICY "Admin can delete offers"
ON offers
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' = current_setting('app.settings.admin_email', true)
);
```

### Featured Deals Table Policies

```sql
-- ==============================================================================
-- FEATURED_DEALS TABLE: Public read active deals, admin full access
-- ==============================================================================

-- Policy: Public can read active featured deals
CREATE POLICY "Public can read active featured deals"
ON featured_deals
FOR SELECT
USING (active = true);

-- Policy: Authenticated users can read all deals (including inactive)
CREATE POLICY "Authenticated users can read all featured deals"
ON featured_deals
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admin can insert featured deals
CREATE POLICY "Admin can insert featured deals"
ON featured_deals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' = current_setting('app.settings.admin_email', true)
);

-- Policy: Only admin can update featured deals
CREATE POLICY "Admin can update featured deals"
ON featured_deals
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' = current_setting('app.settings.admin_email', true)
);

-- Policy: Only admin can delete featured deals
CREATE POLICY "Admin can delete featured deals"
ON featured_deals
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' = current_setting('app.settings.admin_email', true)
);
```

### Crowdsourced Reports Table Policies

```sql
-- ==============================================================================
-- CROWDSOURCED_REPORTS TABLE: Public read, authenticated write
-- ==============================================================================

-- Policy: Anyone can read crowdsourced reports
CREATE POLICY "Public can read crowdsourced reports"
ON crowdsourced_reports
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert reports
CREATE POLICY "Authenticated users can insert reports"
ON crowdsourced_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update reports
CREATE POLICY "Authenticated users can update reports"
ON crowdsourced_reports
FOR UPDATE
TO authenticated
USING (true);

-- Policy: Only admin can delete reports
CREATE POLICY "Admin can delete reports"
ON crowdsourced_reports
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' = current_setting('app.settings.admin_email', true)
);
```

---

## Set Admin Email in Supabase

To make the admin email check work, you need to set it in Supabase:

1. Go to **Database → Extensions**
2. Enable the `pgcrypto` extension (for secure settings)
3. Run this SQL:

```sql
-- Set your admin email
-- Replace 'your-admin@example.com' with your actual admin email
ALTER DATABASE postgres SET app.settings.admin_email = 'your-admin@example.com';
```

Or use environment-based approach:

```sql
-- Alternative: Check against environment variable
-- This requires setting up a custom function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() ->> 'email' = current_setting('app.settings.admin_email', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Then use in policies:
-- USING (is_admin())
```

---

## Testing RLS Policies

After creating policies, test them:

```sql
-- Test 1: Can anonymous users read offers? (should be YES)
SET ROLE anon;
SELECT COUNT(*) FROM offers;
RESET ROLE;

-- Test 2: Can anonymous users insert offers? (should be NO)
SET ROLE anon;
INSERT INTO offers (id, merchant, offer_value, issuer, card_name, channel)
VALUES ('test-1', 'Test', '$10 back', 'Chase', 'Test Card', 'Online');
-- Should fail with permission denied
RESET ROLE;

-- Test 3: Can admin read all featured deals? (should be YES)
-- First, authenticate as admin user in Supabase dashboard
SELECT COUNT(*) FROM featured_deals;

-- Test 4: Can admin insert featured deals? (should be YES)
-- (Run as authenticated admin user)
```

---

## Migration from File-Based Storage

If you're currently using file-based storage (`.data/` directory), you'll need to migrate:

1. **Create tables** using the SQL above
2. **Enable RLS** with the policies above
3. **Update code** to use Supabase queries instead of file operations
4. **Migrate existing data**:

```typescript
// scripts/migrate-to-supabase.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for migration
);

async function migrate() {
  // Migrate offers
  const offersFile = path.join('.data', 'offers.json');
  if (fs.existsSync(offersFile)) {
    const offers = JSON.parse(fs.readFileSync(offersFile, 'utf-8'));
    const { error } = await supabase.from('offers').insert(offers);
    if (error) console.error('Error migrating offers:', error);
    else console.log(`Migrated ${offers.length} offers`);
  }
  
  // Migrate featured deals
  const featuredFile = path.join('.data', 'featured.json');
  if (fs.existsSync(featuredFile)) {
    const deals = JSON.parse(fs.readFileSync(featuredFile, 'utf-8'));
    const { error } = await supabase.from('featured_deals').insert(deals);
    if (error) console.error('Error migrating featured deals:', error);
    else console.log(`Migrated ${deals.length} featured deals`);
  }
}

migrate();
```

---

## Security Checklist

- [ ] RLS is enabled on all tables
- [ ] Admin email is set in database configuration
- [ ] Policies are tested with both anonymous and authenticated users
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is in your environment
- [ ] Service role key is NEVER exposed to client-side code
- [ ] Database backups are configured in Supabase dashboard

---

## Additional Security Measures

### 1. Enable Realtime Security

If using Supabase Realtime:

```sql
-- Disable realtime for sensitive operations
ALTER PUBLICATION supabase_realtime DROP TABLE offers;
```

### 2. Add Rate Limiting

Supabase has built-in rate limiting, but you can add additional protection:

```sql
-- Add updated_at trigger for tracking
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3. Audit Logging

Track who modifies data:

```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, user_id, user_email, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    auth.jwt() ->> 'email',
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to featured_deals
CREATE TRIGGER audit_featured_deals
  AFTER INSERT OR UPDATE OR DELETE ON featured_deals
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Support

For more information on Supabase RLS:
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Postgres RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
