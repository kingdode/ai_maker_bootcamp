# 🗄️ Migrate to Persistent Database Storage

## The Problem

Your data is currently stored in `.data/offers.json` files which:
- ❌ Get wiped on every rebuild/redeploy
- ❌ Can't handle concurrent writes
- ❌ Don't scale
- ❌ Aren't backed up

## The Solution

Migrate to **Supabase PostgreSQL database** for:
- ✅ True persistence (survives rebuilds)
- ✅ Automatic backups
- ✅ Scalability
- ✅ Concurrent access
- ✅ Row Level Security

---

## Step-by-Step Migration (30 minutes)

### Step 1: Update Prisma Schema (5 minutes)

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Credit card offers scanned from Chase/Amex
model Offer {
  id              String    @id @default(cuid())
  merchant        String    @db.VarChar(100)
  offer_value     String    @db.VarChar(200)
  issuer          String    @db.VarChar(20) // 'Chase', 'Amex', 'Unknown'
  card_name       String    @db.VarChar(100)
  channel         String    @db.VarChar(20) // 'Online', 'In-Store', 'Both'
  expires_at      DateTime?
  scanned_at      DateTime  @default(now())
  stackable       Boolean   @default(false)
  
  // Points-based rewards fields
  points_amount   Int?
  points_program  String?   @db.VarChar(50)
  estimated_value Float?
  
  // Deal scoring
  deal_score      Json?     // Stores the DealScore object
  
  // Crowdsourced data (embedded JSON)
  crowdsourced    Json?
  
  // Indexes for fast lookups
  @@index([merchant])
  @@index([issuer])
  @@index([scanned_at])
  @@index([expires_at])
  @@map("offers")
}

// Curated featured deals promoted on homepage
model FeaturedDeal {
  id              String    @id @default(cuid())
  title           String    @db.VarChar(200)
  description     String    @db.Text
  merchant        String    @db.VarChar(100)
  totalValue      String    @db.VarChar(100)
  issuer          String    @db.VarChar(50)
  
  // Deal components (JSON)
  cardOffer       Json?
  stackedOffers   Json?
  
  // Editorial content
  articleContent  String?   @db.Text
  aiSummary       Json?
  merchantImages  Json?
  
  // Metadata
  validUntil      String?   @db.VarChar(50)
  active          Boolean   @default(true)
  priority        Int       @default(100)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([active, priority])
  @@index([merchant])
  @@map("featured_deals")
}

// User-reported deals from the chrome extension
model CrowdsourcedReport {
  id              String    @id @default(cuid())
  domain          String    @unique @db.VarChar(255)
  
  // Aggregated data (JSON)
  reports         Json      // Array of individual reports
  aggregated      Json      // Computed averages/stats
  
  totalReports    Int       @default(0)
  lastReportAt    DateTime  @default(now())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([domain])
  @@index([lastReportAt])
  @@map("crowdsourced_reports")
}
```

### Step 2: Add Database URL to Environment (2 minutes)

Edit your `.env.local`:

```bash
# Add this line (get from Supabase Dashboard → Settings → Database)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Also add for Prisma Studio
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

**How to get your database URL:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → Database
4. Copy the "Connection string" under "Connection pooling"
5. Replace `[YOUR-PASSWORD]` with your actual database password

### Step 3: Install Prisma Client (2 minutes)

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp/dealstackr/dealstackr-web

# Install Prisma CLI
npm install -D prisma

# Install Prisma Client
npm install @prisma/client

# Generate Prisma Client
npx prisma generate
```

### Step 4: Create Database Tables (3 minutes)

```bash
# Create and apply migration
npx prisma migrate dev --name init

# This will:
# 1. Create tables in your Supabase database
# 2. Generate Prisma Client
# 3. Apply the schema
```

**Expected output:**
```
✔ Generated Prisma Client
✔ Applied migration: 20260120_init
```

### Step 5: Migrate Existing Data (5 minutes)

Create a migration script to copy your file-based data to the database:

```bash
# Create migration script
cat > migrate-data.js << 'EOF'
const { PrismaClient } = require('./src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting data migration...');
  
  try {
    // Migrate offers
    const offersFile = path.join(process.cwd(), '.data', 'offers.json');
    if (fs.existsSync(offersFile)) {
      const offers = JSON.parse(fs.readFileSync(offersFile, 'utf-8'));
      console.log(`Found ${offers.length} offers to migrate`);
      
      for (const offer of offers) {
        await prisma.offer.upsert({
          where: { id: offer.id },
          update: offer,
          create: offer
        });
      }
      console.log('✅ Offers migrated');
    }
    
    // Migrate featured deals
    const featuredFile = path.join(process.cwd(), '.data', 'featured.json');
    if (fs.existsSync(featuredFile)) {
      const featured = JSON.parse(fs.readFileSync(featuredFile, 'utf-8'));
      console.log(`Found ${featured.length} featured deals to migrate`);
      
      for (const deal of featured) {
        await prisma.featuredDeal.upsert({
          where: { id: deal.id },
          update: deal,
          create: deal
        });
      }
      console.log('✅ Featured deals migrated');
    }
    
    // Migrate crowdsourced reports
    const crowdFile = path.join(process.cwd(), '.data', 'crowdsourced.json');
    if (fs.existsSync(crowdFile)) {
      const crowdsourced = JSON.parse(fs.readFileSync(crowdFile, 'utf-8'));
      const domains = Object.keys(crowdsourced);
      console.log(`Found ${domains.length} crowdsourced reports to migrate`);
      
      for (const domain of domains) {
        const report = crowdsourced[domain];
        await prisma.crowdsourcedReport.upsert({
          where: { domain },
          update: report,
          create: { domain, ...report }
        });
      }
      console.log('✅ Crowdsourced reports migrated');
    }
    
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
EOF

# Run the migration
node migrate-data.js
```

### Step 6: Update Data Access Layer (10 minutes)

I'll create a new database-backed version of `data.ts`. Save your current file first:

```bash
# Backup current file-based version
cp src/lib/data.ts src/lib/data-legacy.ts
```

Now I'll create the new database version - see next file...

### Step 7: Enable Row Level Security (5 minutes)

In Supabase Dashboard → SQL Editor, run:

```sql
-- Enable RLS on all tables
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowdsourced_reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access to offers
CREATE POLICY "Public read access to offers"
  ON offers FOR SELECT
  USING (true);

-- Allow admin full access to offers
CREATE POLICY "Admin full access to offers"
  ON offers FOR ALL
  USING (auth.email() = current_setting('app.admin_email', true))
  WITH CHECK (auth.email() = current_setting('app.admin_email', true));

-- Allow public read access to active featured deals
CREATE POLICY "Public read active featured deals"
  ON featured_deals FOR SELECT
  USING (active = true);

-- Allow admin full access to featured deals
CREATE POLICY "Admin full access to featured deals"
  ON featured_deals FOR ALL
  USING (auth.email() = current_setting('app.admin_email', true))
  WITH CHECK (auth.email() = current_setting('app.admin_email', true));

-- Allow authenticated users to insert crowdsourced reports
CREATE POLICY "Authenticated insert crowdsourced"
  ON crowdsourced_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow admin full access to crowdsourced reports
CREATE POLICY "Admin full access to crowdsourced"
  ON crowdsourced_reports FOR ALL
  USING (auth.email() = current_setting('app.admin_email', true))
  WITH CHECK (auth.email() = current_setting('app.admin_email', true));

-- Set admin email for RLS
ALTER DATABASE postgres SET app.admin_email TO 'your-admin-email@example.com';
```

### Step 8: Test Everything (3 minutes)

```bash
# Start dev server
npm run dev

# Test offers endpoint
curl http://localhost:3000/api/offers

# Should return your offers from the database!
```

---

## Benefits After Migration

### Before (File-based)
- ❌ Data lost on rebuild
- ❌ No concurrent access
- ❌ Manual backups
- ❌ Slow for large datasets
- ❌ No transactions

### After (Database)
- ✅ Data persists forever
- ✅ Concurrent access
- ✅ Automatic backups (Supabase)
- ✅ Fast queries with indexes
- ✅ ACID transactions
- ✅ Row Level Security
- ✅ Can use Prisma Studio to view/edit data

---

## Prisma Studio (Bonus!)

View and edit your data with a GUI:

```bash
npx prisma studio
```

Opens at http://localhost:5555 with a beautiful interface!

---

## Rollback Plan (If Needed)

If something goes wrong:

```bash
# Restore old file-based version
cp src/lib/data-legacy.ts src/lib/data.ts

# Data is still in .data/ directory
ls -la .data/
```

---

## Next Steps

1. Complete Step 1-8 above
2. Test locally
3. Deploy to Railway (DATABASE_URL will work automatically)
4. Delete `.data/` directory (no longer needed)

Ready to start? Let me know and I'll help you through each step!
