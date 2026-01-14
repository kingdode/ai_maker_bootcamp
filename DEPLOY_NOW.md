# 🚀 Deploy DealStackr to Railway - START HERE

## ⚡ Quick Deploy (20 minutes total)

Follow these 4 steps to get your app live on Railway.

---

## 📦 STEP 1: Push Code to GitHub (2 min)

Open Terminal and run:

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp

git commit -m "Add Railway deployment with AI features and user reports"

git push origin main
```

**Verify**: Go to https://github.com/kingdode/ai_maker_bootcamp and see your new commit

---

## 🚂 STEP 2: Deploy on Railway (5 min)

### A. Sign Up
1. Visit: **https://railway.app**
2. Click: **"Login with GitHub"**
3. Authorize Railway

### B. Create Project
1. Click: **"New Project"** (purple button)
2. Select: **"Deploy from GitHub repo"**
3. Choose: **`kingdode/ai_maker_bootcamp`**
4. **⚠️ CRITICAL**: Configure root directory
   ```
   Root Directory: dealstackr-web
   ```
   *(Railway will ask for this during setup)*
5. Click: **"Deploy Now"**

**Wait**: Build takes 2-3 minutes. Watch the logs!

---

## ⚙️ STEP 3: Configure Settings (3 min)

Once deployed:

### A. Add Volume (For Data Persistence)
```
Settings → Volumes → + New Volume

Volume Name: dealstackr-data
Mount Path: /app/.data
Size: 1 GB

→ Click "Add"
```

**Why?** Preserves your featured deals and user reports across deployments.

### B. Set Environment Variable
```
Variables → + New Variable

NODE_ENV = production

→ Click "Add"
```

### C. (Optional) Add API Keys

If you want AI features and product images:

```
Variables → + New Variable

OPENAI_API_KEY = sk-...
UNSPLASH_ACCESS_KEY = ...

→ Click "Add"
```

*Note: You can also add OpenAI key later via Admin → Settings*

---

## 🌐 STEP 4: Get Your Live URL (1 min)

Railway automatically generates your URL:

```
https://dealstackr-web-production-XXXX.up.railway.app
```

**Test these pages**:
- ✅ `/` - Homepage with offers
- ✅ `/admin` - Admin dashboard
- ✅ `/api/offers` - API endpoint

---

## 🔧 STEP 5: Update Chrome Extension (5 min)

Now point your extension to the live Railway site:

### Option A: Use the Script (Easiest)

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp

# Replace with YOUR Railway URL
./UPDATE_EXTENSION_URL.sh dealstackr-web-production-XXXX.up.railway.app
```

### Option B: Manual Edit

Edit `offers-chrome-extension/dashboard.js`:

Find all instances of:
```javascript
http://localhost:3000
```

Replace with:
```javascript
https://your-railway-url.up.railway.app
```

### Reload Extension

1. Go to: `chrome://extensions/`
2. Find: DealStackr
3. Click: Reload button (circular arrow icon)
4. Test: Open dashboard and click "🌐 Sync to Website"

---

## ✅ Verification Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] Root directory set to `dealstackr-web`
- [ ] Build completed successfully
- [ ] Volume mounted at `/app/.data`
- [ ] Environment variables set
- [ ] Live URL accessible
- [ ] Homepage loads
- [ ] Admin panel works
- [ ] API returns data
- [ ] Chrome extension updated
- [ ] Offers sync from extension

---

## 🎉 Success! You're Live!

Your DealStackr website is now:
- ✅ Deployed on Railway's global infrastructure
- ✅ Accessible 24/7 at your Railway URL
- ✅ Auto-deploys on every `git push`
- ✅ SSL secured (HTTPS)
- ✅ Backed up and persistent

### Share Your URL! 📣

```
🔗 https://your-railway-url.up.railway.app
```

---

## 📊 What's Running?

```
┌─────────────────────────────────────────┐
│  Railway Container                      │
│  ┌───────────────────────────────────┐  │
│  │ Node.js 22 Alpine Linux           │  │
│  │                                   │  │
│  │ Next.js App (Production)          │  │
│  │ ├─ Homepage (all offers)          │  │
│  │ ├─ Admin panel                    │  │
│  │ ├─ API endpoints                  │  │
│  │ ├─ AI article generator           │  │
│  │ └─ Featured deals system          │  │
│  │                                   │  │
│  │ Data Volume: /app/.data           │  │
│  │ └─ Featured deals (persistent)    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Listening on: $PORT (auto-assigned)   │
└─────────────────────────────────────────┘
         ↓
    Internet 🌐
         ↓
   Your Users 👥
```

---

## 🔄 Auto-Deploy Workflow

Every time you push to GitHub:

```
Local Changes
    ↓
git add . && git commit -m "Update"
    ↓
git push origin main
    ↓
GitHub Repository
    ↓
Railway Detects Push
    ↓
Builds New Docker Image
    ↓
Runs Tests & Health Checks
    ↓
Deploys New Container
    ↓
🎉 Live in 2-3 minutes!
```

---

## 💰 Pricing

**Free Trial**: $5/month credit

**DealStackr Usage** (after trial):
- Container: ~$3-5/month
- Volume (1GB): Free
- Bandwidth: Free (up to 100GB)
- **Total**: ~$5/month

**What You Get**:
- ✅ 24/7 uptime
- ✅ Auto-scaling
- ✅ SSL certificates
- ✅ Custom domains
- ✅ Automatic backups
- ✅ Unlimited deployments

---

## 🆘 Troubleshooting

### Build Failed?
```
Settings → Build
- Check Root Directory: dealstackr-web
- Check Dockerfile Path: Dockerfile
```

### Data Disappearing?
```
Settings → Volumes
- Ensure mounted at: /app/.data
```

### 502 Bad Gateway?
```
- Wait 30 seconds (app is starting)
- Check logs: Deployments → Click deployment → View logs
```

### Extension Not Syncing?
```
1. Verify Railway URL is correct in dashboard.js
2. Reload extension at chrome://extensions/
3. Check API works: https://your-url/api/offers
```

---

## 📚 Full Documentation

- **Quick Start**: `QUICK_START_RAILWAY.md`
- **Complete Guide**: `RAILWAY_DEPLOYMENT_GUIDE.md`
- **Extension Script**: `UPDATE_EXTENSION_URL.sh`

---

## 🎯 Next Steps

### Add Custom Domain
```
Railway Settings → Domains → Custom Domain
→ Enter: dealstackr.com
→ Add CNAME to DNS:
   CNAME dealstackr.com → your-app.railway.app
```

### Monitor Performance
```
Railway → Metrics Tab
- CPU usage
- Memory usage
- Request count
- Response times
```

### Set Up Alerts
```
Railway → Settings → Notifications
→ Email alerts for downtime
→ Slack integration
```

---

## 🎊 Congratulations!

You've successfully deployed DealStackr to production! 

Your users can now:
- 📊 View offers online from any device
- 🤖 Read AI-generated deal articles
- 👥 See community-reported cashback deals
- 💰 Stack deals for maximum savings

**Happy deal stacking!** 🚀

---

## 💬 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway  
- **Issues**: https://github.com/kingdode/ai_maker_bootcamp/issues

---

## ✨ Pro Tips

1. **Staging Environment**: Create a second Railway project from a `staging` branch
2. **Database**: Migrate to PostgreSQL for production (Railway → Add PostgreSQL)
3. **Monitoring**: Use Railway's built-in metrics + Sentry for error tracking
4. **Backups**: Enable automatic volume snapshots in Settings
5. **Performance**: Enable Redis cache for faster API responses

---

**🚀 Ready? Start with STEP 1 above!**
