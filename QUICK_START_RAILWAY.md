# ⚡ Railway Quick Start Guide

## 📦 Step 1: Push to GitHub (5 minutes)

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp

# Commit your changes
git commit -m "Add Railway deployment configuration"

# Push to GitHub
git push origin main
```

✅ **Checkpoint**: Visit https://github.com/kingdode/ai_maker_bootcamp and verify the new files are there

---

## 🚂 Step 2: Deploy on Railway (10 minutes)

### A. Create Account
1. Go to: **https://railway.app**
2. Click: **"Login with GitHub"**
3. Authorize Railway

### B. Create Project
1. Click: **"New Project"** (purple button)
2. Select: **"Deploy from GitHub repo"**
3. Choose: **`kingdode/ai_maker_bootcamp`**
4. **IMPORTANT**: Set root directory to `dealstackr-web`
5. Click: **"Deploy Now"**

⏱️ Wait 2-3 minutes for build...

---

## ⚙️ Step 3: Configure (5 minutes)

### A. Set Environment Variable

In Railway dashboard:
1. Go to **Variables** tab
2. Click **"+ New Variable"**
3. Add:
   ```
   NODE_ENV = production
   ```

### B. Create Volume for Data Persistence

1. Go to **Settings** tab
2. Find **Volumes** section
3. Click **"+ New Volume"**
4. Set:
   ```
   Volume Name: dealstackr-data
   Mount Path: /app/.data
   Size: 1 GB
   ```
5. Click **"Add"**

### C. Redeploy (if needed)

1. Go to **Settings**
2. Click **"Deploy"** → **"Redeploy"**

---

## 🎉 Step 4: Test Your Site

### Get Your URL

Railway gives you a URL like:
```
https://dealstackr-web-production-xxxx.up.railway.app
```

### Test These Pages:
- ✅ Homepage: `/`
- ✅ Admin: `/admin`
- ✅ API: `/api/offers`
- ✅ Featured deals work
- ✅ User reports visible

---

## 🔧 Step 5: Update Chrome Extension

Update your extension to sync with the live site:

### Option 1: Manual Edit

Edit `offers-chrome-extension/dashboard.js`:

Find line ~2450:
```javascript
const apiUrl = 'http://localhost:3000/api/offers';
```

Change to:
```javascript
const apiUrl = 'https://your-railway-url.up.railway.app/api/offers';
```

Also update line ~2470 in the `syncOffers()` function.

### Option 2: Quick Script

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp/offers-chrome-extension

# Replace YOUR_RAILWAY_URL with your actual URL
RAILWAY_URL="your-railway-url.up.railway.app"

# Update dashboard.js
sed -i '' "s|http://localhost:3000|https://$RAILWAY_URL|g" dashboard.js

# Reload extension in Chrome
```

Then:
1. Go to `chrome://extensions/`
2. Click reload on DealStackr extension
3. Test sync button!

---

## 📊 Monitor & Manage

### View Logs
```
Railway Dashboard → Deployments → Click deployment → View logs
```

### Redeploy
```
Railway Dashboard → Settings → Deploy → Redeploy
```

### Auto-Deploy
Every `git push origin main` automatically deploys! 🎉

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Build failed" | Check root directory is `dealstackr-web` |
| "502 Bad Gateway" | Wait 30s, app is starting up |
| "Data disappeared" | Add volume at `/app/.data` |
| "API not working" | Check `/api/offers` returns JSON |

---

## 📖 Full Guide

For detailed explanations, troubleshooting, and advanced config:

👉 **See: `RAILWAY_DEPLOYMENT_GUIDE.md`**

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] Root directory set to `dealstackr-web`
- [ ] Volume created for `/app/.data`
- [ ] Site loads at Railway URL
- [ ] Admin panel accessible
- [ ] Chrome extension syncs to Railway URL

---

## 🎊 You're Live!

Your DealStackr website is now:
- ✅ Running on Railway's global infrastructure
- ✅ Auto-deploying on every GitHub push
- ✅ Serving users 24/7 with 99.9% uptime
- ✅ SSL secured (HTTPS)
- ✅ Backed up and persistent

**Share your URL!** 📣

---

## 💰 Costs

**Free Trial**: $5/month credit (enough for this app)

**After Trial**: ~$5-10/month for:
- Unlimited deploys
- Custom domain
- SSL certificate
- 1GB storage
- Auto-scaling

---

Happy deploying! 🚀
