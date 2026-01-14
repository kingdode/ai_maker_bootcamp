# 🚂 DealStackr Railway Deployment Guide

Complete step-by-step guide to deploy your DealStackr website on Railway.

---

## 📋 Prerequisites

- ✅ GitHub account
- ✅ Railway account (we'll create this)
- ✅ Your code pushed to GitHub
- ⏱️ Estimated time: 15-20 minutes

---

## Part 1: Push Your Code to GitHub

### Step 1: Commit Your Changes

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp

# Check what's staged
git status

# Commit the DealStackr updates
git commit -m "Add Railway Dockerfile and latest DealStackr features

- Production-ready multi-stage Dockerfile
- AI-generated articles with product images
- Enhanced offer scoring system
- User-reported deals integration
- Optimized for Railway deployment"

# Push to GitHub
git push origin main
```

**⏸️ STOP**: Make sure this completes successfully before continuing!

---

## Part 2: Create Railway Account & Project

### Step 2: Sign Up for Railway

1. **Go to**: https://railway.app
2. **Click**: "Start a New Project" or "Login"
3. **Sign up** with GitHub (easiest option)
   - Click "Login with GitHub"
   - Authorize Railway to access your repositories
   - ✅ This connects your GitHub account

### Step 3: Create New Project

1. **Click**: "New Project" (purple button, top right)
2. **Select**: "Deploy from GitHub repo"
3. **Choose**: `kingdode/ai_maker_bootcamp`
   - If you don't see it, click "Configure GitHub App"
   - Grant access to your repositories
   - Select `ai_maker_bootcamp`
   - Click "Install & Authorize"

4. **Configure Root Directory**:
   - Railway will ask for the root directory
   - **Enter**: `dealstackr/dealstackr-web`
   - This tells Railway to build from the subfolder

5. **Click**: "Deploy Now"

---

## Part 3: Configure Build Settings

### Step 4: Verify Dockerfile Detection

Railway should automatically detect your Dockerfile. Verify:

1. Go to your project **Settings** tab
2. Under **Build**, check:
   ```
   Builder: Dockerfile
   Dockerfile Path: Dockerfile
   ```
3. If not detected, manually set:
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `Dockerfile`

---

## Part 4: Set Environment Variables

### Step 5: Add Required Environment Variables

1. Go to **Variables** tab
2. Click **"+ New Variable"** for each:

#### **Required Variables**

```bash
NODE_ENV=production
```

#### **Optional Variables** (for full functionality)

```bash
# For product images (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_key_here

# For AI article generation (optional)
# Note: Users can also add this via admin dashboard
OPENAI_API_KEY=your_openai_key_here

# Railway automatically sets these:
# PORT=8080 (or whatever Railway assigns)
# RAILWAY_ENVIRONMENT=production
```

**How to get API keys**:

- **Unsplash**: https://unsplash.com/developers
  - Sign up → Create app → Copy "Access Key"
  - Free tier: 50 requests/hour
  
- **OpenAI**: https://platform.openai.com/api-keys
  - Sign up → Create API key → Copy key
  - Add billing for usage

3. Click **"Add"** after entering each variable

---

## Part 5: Set Up Data Persistence (Important!)

Your `.data/` folder contains featured deals and user reports. Without persistence, this data will be lost on each deploy.

### Step 6: Create Railway Volume

1. Go to **Settings** tab
2. Scroll to **Volumes** section
3. Click **"+ New Volume"**
4. Configure:
   ```
   Volume Name: dealstackr-data
   Mount Path: /app/.data
   Size: 1 GB (more than enough)
   ```
5. Click **"Add"**

**What this does**: 
- Persists your `.data/featured.json`, `.data/offers.json`, and `.data/crowdsourced.json`
- Data survives deployments and restarts
- Backed up by Railway

---

## Part 6: Deploy & Monitor

### Step 7: Trigger Deployment

Railway starts building automatically, but if not:

1. Go to **Deployments** tab
2. Click **"Deploy"** or **"Redeploy"**

**Watch the build logs**:
```
Building Dockerfile...
[+] Building 143.2s
 => [deps 1/3] FROM node:22-alpine
 => [deps 2/3] COPY package.json package-lock.json
 => [builder 1/4] COPY --from=deps /app/node_modules
 => [builder 2/4] RUN npm run build
 => [runner 1/5] COPY --from=builder /app/.next/standalone
✅ Build succeeded
🚀 Deploying...
✅ Deployed successfully
```

**Build time**: ~2-3 minutes (first time), ~1 minute (subsequent)

### Step 8: Get Your Live URL

1. Once deployed, Railway gives you a URL:
   ```
   https://dealstackr-production.up.railway.app
   ```
2. Click the URL to open your live site!
3. **Optional**: Add a custom domain later

---

## Part 7: Test Your Deployment

### Step 9: Verify Everything Works

**Test Checklist**:

✅ **Homepage loads**
- Visit your Railway URL
- Check "Featured Deal Stacks" section
- Verify "All Scanned Offers" table

✅ **Admin panel works**
- Go to `/admin`
- Check tabs: Top Deals, All Offers, User Reports, Settings
- Try adding OpenAI key if not set via env var

✅ **Data persistence**
- Create a featured deal in admin
- Redeploy your app (Settings → Deploy → Redeploy)
- Check if featured deal is still there ✅

✅ **API endpoints**
- Test: `/api/offers` (should return JSON)
- Test: `/api/featured` (should return featured deals)
- Test: `/api/crowdsourced` (should return user reports)

---

## Part 8: Update Chrome Extension (Important!)

### Step 10: Point Extension to Railway

Update your Chrome extension to sync with the live Railway URL:

1. Edit `dashboard.js`:
```javascript
// Find this line (around line 2450):
const apiUrl = 'http://localhost:3000/api/offers';

// Change to:
const apiUrl = 'https://your-railway-url.up.railway.app/api/offers';
```

2. Update sync button URL in `dashboard.js`:
```javascript
// Around line 2470 (syncOffers function):
fetch('https://your-railway-url.up.railway.app/api/offers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ offers: transformedOffers })
})
```

3. **Reload extension** in Chrome:
   - Go to `chrome://extensions`
   - Click reload icon on DealStackr extension

4. **Test sync**:
   - Go to Chase/Amex offers page
   - Open DealStackr dashboard
   - Click "🌐 Sync to Website"
   - Visit your Railway URL → should see offers!

---

## 🎉 You're Live!

Your DealStackr website is now:
- ✅ Deployed on Railway
- ✅ Running on production Docker container
- ✅ Auto-deploying on every GitHub push
- ✅ Persistent data via Railway volumes
- ✅ Accessible at your Railway URL

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# In Railway dashboard:
1. Go to "Deployments" tab
2. Click on any deployment
3. View real-time logs
```

### Check Metrics

```bash
# In Railway dashboard:
1. Go to "Metrics" tab
2. See:
   - CPU usage
   - Memory usage
   - Request count
   - Response times
```

### Redeploy

```bash
# Option 1: Push to GitHub (automatic)
git push origin main

# Option 2: Manual redeploy
Railway Dashboard → Settings → Deploy → Redeploy
```

---

## 🚨 Troubleshooting

### Problem: "Application failed to respond"

**Solution**: Check if app is listening on `process.env.PORT`
```bash
# Railway logs should show:
▲ Next.js 16.1.1
- Local: http://localhost:8080
- ready started server on 0.0.0.0:8080
```

### Problem: "Build failed"

**Solution**: Check Dockerfile path
```bash
Railway Settings → Build → Dockerfile Path: Dockerfile
Railway Settings → Build → Root Directory: dealstackr/dealstackr-web
```

### Problem: "Data disappears after deploy"

**Solution**: Ensure volume is mounted
```bash
Railway Settings → Volumes → Mount Path: /app/.data
```

### Problem: "502 Bad Gateway"

**Solution**: Check health check endpoint
```bash
# Visit: https://your-url.railway.app/api/offers
# Should return JSON, not error
```

### Problem: "OpenAI API not working"

**Solution**: 
1. Check if `OPENAI_API_KEY` is set in Variables
2. Or add via Admin → Settings tab
3. Verify key is valid at platform.openai.com

---

## 🎯 Next Steps

### Add Custom Domain

1. Railway Settings → Domains
2. Click "Custom Domain"
3. Enter: `dealstackr.com` (your domain)
4. Add CNAME record to your DNS:
   ```
   CNAME  dealstackr.com  →  your-railway-url.railway.app
   ```

### Set Up Database (Optional)

For production, consider migrating from file-based storage:

```bash
# Railway supports:
- PostgreSQL (recommended)
- MySQL
- MongoDB
- Redis

# Click "+ New" → "Database" → "PostgreSQL"
# Railway auto-injects DATABASE_URL
```

### Enable Auto-Deploy

Already enabled! Every push to `main` branch auto-deploys.

### Add Staging Environment

```bash
# Create separate Railway project:
Railway → New Project → Deploy from GitHub
Branch: staging
Environment: staging
```

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **DealStackr Issues**: https://github.com/kingdode/ai_maker_bootcamp/issues

---

## 💰 Pricing

**Railway Free Trial**:
- $5 free credit per month
- Enough for development + light production

**Estimated Monthly Cost** (after trial):
- **Hobby Plan**: $5-10/month
  - DealStackr is lightweight
  - Low memory/CPU usage
  - 1GB volume included

**What you get**:
- ✅ Unlimited deployments
- ✅ Custom domains
- ✅ SSL certificates (free)
- ✅ Auto-scaling
- ✅ 99.9% uptime SLA

---

## ✅ Deployment Checklist

Use this checklist to ensure everything is configured:

- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] Project created from GitHub repo
- [ ] Root directory set to `dealstackr/dealstackr-web`
- [ ] Dockerfile detected
- [ ] Environment variables set
- [ ] Volume created and mounted at `/app/.data`
- [ ] First deployment succeeded
- [ ] Live URL accessible
- [ ] Admin panel works
- [ ] Chrome extension updated with Railway URL
- [ ] Offers sync from extension to website
- [ ] Data persists after redeploy

---

## 🎊 Congratulations!

You've successfully deployed DealStackr to production! 🚀

Your users can now:
- View their credit card offers online
- See AI-generated deal articles
- Browse community-reported cashback deals
- Access from any device, anywhere

Happy deal stacking! 💰
