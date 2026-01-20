# 🛡️ DealStackr Security Setup - Step-by-Step Walkthrough

**Time Required:** ~30 minutes  
**Difficulty:** Intermediate  
**Prerequisites:** Terminal access, Supabase account, Railway account (for production)

---

## 📋 Quick Checklist

Before you start, make sure you have:
- [ ] Access to your terminal/command line
- [ ] Supabase account and project created
- [ ] Railway account (if deploying to production)
- [ ] Admin email address you want to use
- [ ] Chrome extension (if you want CORS whitelisting)

---

## Step 1: Generate Secure API Key (5 minutes)

### What We're Doing
Creating a cryptographically secure random key for your Chrome extension to authenticate with your API.

### Commands

```bash
# Navigate to your project
cd /Users/victorperez/Desktop/ai_maker_bootcamp/dealstackr/dealstackr-web

# Generate a secure 64-character key
openssl rand -hex 32
```

### Expected Output
```
a7b3c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0
```

### Action
✅ **Copy this key somewhere safe** - you'll need it in the next step!

---

## Step 2: Set Up Environment Variables (10 minutes)

### Option A: Local Development

#### Create .env.local file

```bash
# Copy the example file
cp env.example .env.local

# Open in your editor
code .env.local
# OR
nano .env.local
```

#### Fill in the values

```env
# 1. SUPABASE SETTINGS (get from https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. YOUR ADMIN EMAIL
ADMIN_EMAIL=your-email@example.com

# 3. THE API KEY YOU JUST GENERATED
SYNC_API_KEY=a7b3c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0

# 4. OPENAI (optional, only if using AI features)
OPENAI_API_KEY=sk-your-openai-key-here

# 5. YOUR APP URL (use localhost for now)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 6. CHROME EXTENSION ID (get after publishing, leave empty for now)
CHROME_EXTENSION_ID=
```

#### Where to Find These Values

**Supabase URL & Key:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy `Project URL` and `anon/public` key

**OpenAI API Key (optional):**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy it immediately (you can't see it again!)

### Option B: Production (Railway)

#### Set Environment Variables in Railway

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Select your project

2. **Add Variables**
   - Click on your service
   - Go to "Variables" tab
   - Click "New Variable"

3. **Add Each Variable:**
   ```
   NEXT_PUBLIC_SUPABASE_URL → https://xxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY → eyJhbGciOi...
   ADMIN_EMAIL → your-email@example.com
   SYNC_API_KEY → <your-generated-key>
   OPENAI_API_KEY → sk-... (optional)
   NEXT_PUBLIC_APP_URL → https://your-domain.railway.app
   CHROME_EXTENSION_ID → (add after publishing extension)
   ```

4. **Redeploy**
   - Click "Deploy" to restart with new variables

---

## Step 3: Test Your Setup (5 minutes)

### Start the development server

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp/dealstackr/dealstackr-web

# Install dependencies if you haven't
npm install

# Start dev server
npm run dev
```

### Verify it's running

Open your browser to: http://localhost:3000

You should see the DealStackr homepage.

### Test API Security

Open a new terminal and run:

```bash
# This should FAIL with 401 Unauthorized (good!)
curl -X POST http://localhost:3000/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: wrong-key" \
  -d '{"offers": []}'

# Expected response:
# {"error":"Unauthorized. Valid X-Sync-API-Key header or admin authentication required."}
```

✅ **If you see that error, security is working!**

---

## Step 4: Supabase Row Level Security (OPTIONAL - 10 minutes)

### Do I Need This?

**Skip this if:**
- ✅ You're using file-based storage (`.data/` directory)
- ✅ You're just testing/developing

**Do this if:**
- ❌ You're storing data in Supabase database tables
- ❌ You're going to production soon

### How to Set Up RLS

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project
   - Go to "Database" → "Tables"

2. **Check if you have tables**
   - Look for tables named: `offers`, `featured_deals`, `crowdsourced_reports`
   - **If NO tables exist**: You're using file-based storage, **SKIP THIS STEP**
   - **If tables exist**: Continue below

3. **Enable RLS**

   Open SQL Editor (Database → SQL Editor) and run:

   ```sql
   -- Enable RLS on all tables
   ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
   ALTER TABLE featured_deals ENABLE ROW LEVEL SECURITY;
   ALTER TABLE crowdsourced_reports ENABLE ROW LEVEL SECURITY;
   ```

4. **Create Policies**

   See the full SQL in `SUPABASE_RLS_SETUP.md` - it's comprehensive but basically:
   - Public can READ all active content
   - Only authenticated admins can WRITE
   - Only your admin email can DELETE

5. **Test Policies**

   ```sql
   -- This should work (public read)
   SELECT COUNT(*) FROM offers;
   
   -- This should fail (public write)
   SET ROLE anon;
   INSERT INTO offers (id, merchant, offer_value, issuer, card_name, channel)
   VALUES ('test', 'Test', '$10', 'Chase', 'Test', 'Online');
   -- Should get: "permission denied"
   ```

---

## Step 5: Update Chrome Extension (5 minutes)

### Update the API Key

1. **Open extension files**
   ```bash
   cd /Users/victorperez/Desktop/ai_maker_bootcamp/dealstackr/offers-chrome-extension
   ```

2. **Find where API calls are made**
   
   Search for fetch calls to your API, they'll look like:
   ```javascript
   fetch('YOUR_API_URL/api/offers', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-Sync-API-Key': 'dealstackr-sync-2024' // OLD HARDCODED KEY!
     },
     body: JSON.stringify({ offers: data })
   });
   ```

3. **Update to use secure key**
   
   You have two options:

   **Option A: Hardcode (quick, less secure)**
   ```javascript
   'X-Sync-API-Key': 'a7b3c9d2e1f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0'
   ```

   **Option B: Store in extension storage (better)**
   ```javascript
   // Store once
   chrome.storage.local.set({ 'apiKey': 'YOUR_KEY' });
   
   // Use everywhere
   const { apiKey } = await chrome.storage.local.get(['apiKey']);
   fetch('YOUR_API_URL/api/offers', {
     headers: {
       'X-Sync-API-Key': apiKey
     }
   });
   ```

4. **Reload extension**
   - Go to `chrome://extensions`
   - Click refresh icon on DealStackr extension
   - Test by scanning offers

---

## Step 6: Verify Everything Works (5 minutes)

### Checklist

Run through this checklist:

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp/dealstackr/dealstackr-web

# 1. Check Zod is installed
npm list zod
# Should show: zod@3.x.x

# 2. Check environment variables
cat .env.local | grep -E "SYNC_API_KEY|ADMIN_EMAIL"
# Should show your values (not defaults!)

# 3. Build succeeds
npm run build
# Should complete without errors

# 4. Dev server runs
npm run dev
# Should start on port 3000
```

### Manual Testing

1. **Test Homepage**
   - Visit http://localhost:3000
   - Should load without errors
   - Check browser console (F12) for errors

2. **Test Admin Login**
   - Visit http://localhost:3000/admin/login
   - Try logging in with your admin email
   - Should redirect to admin dashboard

3. **Test API**
   ```bash
   # Should fail (bad key)
   curl -X POST http://localhost:3000/api/offers \
     -H "Content-Type: application/json" \
     -H "X-Sync-API-Key: wrong" \
     -d '{"offers": []}'
   
   # Should work (correct key)
   curl -X POST http://localhost:3000/api/offers \
     -H "Content-Type: application/json" \
     -H "X-Sync-API-Key: YOUR_ACTUAL_KEY" \
     -d '{"offers": [{"merchant": "Test", "offer_value": "$10 back", "issuer": "Chase", "card_name": "Chase Sapphire", "channel": "Online", "scanned_at": "2026-01-20T00:00:00Z"}]}'
   ```

4. **Test Extension**
   - Go to Chase or Amex offers page
   - Click extension icon
   - Click "Scan Offers"
   - Should sync successfully

---

## 🚨 Common Issues & Solutions

### Issue: "SYNC_API_KEY must be set to a secure value"

**Problem:** API key not in environment  
**Solution:**
```bash
# Check if .env.local exists
ls -la .env.local

# If not, create it:
cp env.example .env.local

# Add your key
echo "SYNC_API_KEY=your-key-here" >> .env.local
```

### Issue: "Unauthorized" when syncing from extension

**Problem:** Extension using wrong API key  
**Solution:** Update extension code with correct key (see Step 5)

### Issue: "Module not found: Can't resolve 'zod'"

**Problem:** Dependencies not installed  
**Solution:**
```bash
npm install
# Then restart dev server
```

### Issue: Admin login not working

**Problem:** Email doesn't match `ADMIN_EMAIL`  
**Solution:**
```bash
# Check what email is configured
grep ADMIN_EMAIL .env.local

# Make sure you're logging in with THAT email
```

### Issue: CORS errors in browser console

**Problem:** Origin not whitelisted  
**Solution:**
```bash
# For development, make sure you have:
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For production:
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
CHROME_EXTENSION_ID=your-published-extension-id
```

---

## ✅ You're Done!

If you've completed all steps and tests pass, your application is now secure! 🎉

### What You've Accomplished

- ✅ Generated cryptographically secure API key
- ✅ Configured environment variables
- ✅ Enabled input validation (Zod)
- ✅ Restricted CORS to known origins
- ✅ Protected admin routes
- ✅ (Optional) Set up database RLS
- ✅ Updated Chrome extension
- ✅ Verified everything works

### Next Steps

1. **For Production:**
   - Set environment variables in Railway
   - Test on production URL
   - Publish Chrome extension
   - Add extension ID to environment

2. **Ongoing Maintenance:**
   - Rotate `SYNC_API_KEY` every 3-6 months
   - Monitor Railway logs for suspicious activity
   - Keep dependencies updated (`npm audit`)

---

## 📞 Need Help?

**Check the docs:**
- `SECURITY_SETUP.md` - Full security guide
- `SUPABASE_RLS_SETUP.md` - Database security
- `PHASE1_SECURITY_FIXES_COMPLETE.md` - What was changed

**Still stuck?** Review the error messages carefully - they usually tell you exactly what's wrong!

---

**Last Updated:** 2026-01-20  
**Security Version:** Phase 1 Complete  
**Estimated Time:** 30 minutes  
**Difficulty:** ⭐⭐⭐☆☆ (3/5)
