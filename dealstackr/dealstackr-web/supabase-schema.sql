-- DealStackr Database Schema for Supabase
-- Copy and paste this entire file into Supabase SQL Editor

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Offers table (credit card offers from Chase/Amex)
CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  merchant VARCHAR(100) NOT NULL,
  offer_value VARCHAR(200) NOT NULL,
  issuer VARCHAR(20) NOT NULL CHECK (issuer IN ('Chase', 'Amex', 'Unknown')),
  card_name VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('Online', 'In-Store', 'Both', 'Unknown')),
  expires_at TIMESTAMPTZ,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stackable BOOLEAN DEFAULT FALSE,
  
  -- Points-based rewards
  points_amount INTEGER,
  points_program VARCHAR(50),
  estimated_value NUMERIC,
  
  -- Deal scoring (stored as JSON)
  deal_score JSONB,
  
  -- Crowdsourced data (stored as JSON)
  crowdsourced JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Featured deals (curated deals promoted on homepage)
CREATE TABLE IF NOT EXISTS public.featured_deals (
  id TEXT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  merchant VARCHAR(100) NOT NULL,
  total_value VARCHAR(100) NOT NULL,
  issuer VARCHAR(50) NOT NULL,
  
  -- Deal components (stored as JSON)
  card_offer JSONB,
  stacked_offers JSONB,
  
  -- Editorial content
  article_content TEXT,
  ai_summary JSONB,
  merchant_images JSONB,
  
  -- Metadata
  valid_until VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 100,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crowdsourced reports (user-reported deals)
CREATE TABLE IF NOT EXISTS public.crowdsourced_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  domain VARCHAR(255) UNIQUE NOT NULL,
  
  -- Aggregated data (stored as JSON)
  reports JSONB NOT NULL,
  aggregated JSONB NOT NULL,
  
  total_reports INTEGER DEFAULT 0,
  last_report_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES for fast queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_offers_merchant ON public.offers(merchant);
CREATE INDEX IF NOT EXISTS idx_offers_issuer ON public.offers(issuer);
CREATE INDEX IF NOT EXISTS idx_offers_scanned_at ON public.offers(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON public.offers(expires_at);

CREATE INDEX IF NOT EXISTS idx_featured_active_priority ON public.featured_deals(active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_featured_merchant ON public.featured_deals(merchant);

CREATE INDEX IF NOT EXISTS idx_crowdsourced_domain ON public.crowdsourced_reports(domain);
CREATE INDEX IF NOT EXISTS idx_crowdsourced_last_report ON public.crowdsourced_reports(last_report_at DESC);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowdsourced_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- OFFERS POLICIES
-- Allow everyone to read all offers
CREATE POLICY "Public can view all offers"
  ON public.offers
  FOR SELECT
  USING (true);

-- Allow service role (API) to insert/update/delete
CREATE POLICY "Service role can manage offers"
  ON public.offers
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to insert (for Chrome extension)
CREATE POLICY "Authenticated users can insert offers"
  ON public.offers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- FEATURED DEALS POLICIES
-- Allow everyone to read active featured deals
CREATE POLICY "Public can view active featured deals"
  ON public.featured_deals
  FOR SELECT
  USING (active = true);

-- Allow service role to manage featured deals
CREATE POLICY "Service role can manage featured deals"
  ON public.featured_deals
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated admins to view all
CREATE POLICY "Authenticated users can view all featured deals"
  ON public.featured_deals
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- CROWDSOURCED REPORTS POLICIES
-- Allow everyone to read reports (public data)
CREATE POLICY "Public can view crowdsourced reports"
  ON public.crowdsourced_reports
  FOR SELECT
  USING (true);

-- Allow anyone to insert (for user contributions)
CREATE POLICY "Anyone can submit crowdsourced reports"
  ON public.crowdsourced_reports
  FOR INSERT
  WITH CHECK (true);

-- Allow service role to manage reports
CREATE POLICY "Service role can manage crowdsourced reports"
  ON public.crowdsourced_reports
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_featured_deals_updated_at ON public.featured_deals;
CREATE TRIGGER update_featured_deals_updated_at
  BEFORE UPDATE ON public.featured_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crowdsourced_reports_updated_at ON public.crowdsourced_reports;
CREATE TRIGGER update_crowdsourced_reports_updated_at
  BEFORE UPDATE ON public.crowdsourced_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

SELECT 'DealStackr database schema created successfully!' as status;
