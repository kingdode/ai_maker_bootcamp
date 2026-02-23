# 🚀 Production Deployment Checklist

**Date:** 2026-01-20  
**Project:** DealStackr  
**Platform:** Railway

---

## ✅ Pre-Deployment Checklist

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- [ ] `ADMIN_EMAIL` - Your admin email (e.g. your-email@example.com)
- [ ] `SYNC_API_KEY` - **NEW!** Chrome extension API key
- [ ] `OPENAI_API_KEY` - OpenAI API key (optional, for AI features)
- [ ] `NEXT_PUBLIC_APP_URL` - Your production domain (e.g., https://dealstackr.up.railway.app)
- [ ] `CHROME_EXTENSION_ID` - Extension ID after publishing (optional for now)

### Database
- [x] Supabase tables created (offers, featured_deals, crowdsourced_reports)
- [x] Row Level Security enabled
- [x] RLS policies configured
- [x] Test data synced successfully

### Code
- [x] Security fixes implemented (input validation, CORS, API key)
- [x] Database migration complete (file → Supabase)
- [x] Chrome extension updated with new API key
- [x] Local testing passed

---

## 🚀 Deployment Steps

### 1. Add SYNC_API_KEY to Railway

```
Variable: SYNC_API_KEY
Value: <generate-with-openssl-rand-hex-32>
```

### 2. Commit and Push Code

```bash
cd /Users/victorperez/Desktop/ai_maker_bootcamp/dealstackr/dealstackr-web

git add .
git commit -m "✨ Add database persistence and security fixes

- Switch from file-based to Supabase database storage
- Add secure API key authentication
- Update Chrome extension with new API key
- Add input validation with Zod
- Implement CORS restrictions
- Enable Row Level Security
- Data now persists across deployments"

git push origin main
```

### 3. Railway Auto-Deploy

Railway will automatically:
- Detect the push
- Build your app with new environment variables
- Deploy to production
- Run health checks

⏱️ **Estimated time:** 3-5 minutes

---

## 🧪 Post-Deployment Testing

### Test 1: Homepage
- [ ] Visit your Railway URL (e.g., https://dealstackr.up.railway.app)
- [ ] Should load without errors
- [ ] Check browser console (F12) for errors

### Test 2: API Security
```bash
# Should FAIL (wrong key)
curl -X POST https://your-domain.railway.app/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: wrong-key" \
  -d '{"offers": []}'

# Should WORK (correct key)
curl -X POST https://your-domain.railway.app/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: YOUR_SYNC_API_KEY" \
  -d '{"offers": [...]}'
```

### Test 3: Admin Login
- [ ] Visit https://your-domain.railway.app/admin/login
- [ ] Login with your admin email
- [ ] Should access admin dashboard

### Test 4: Chrome Extension
- [ ] Update extension API URL to production
- [ ] Test scanning offers
- [ ] Verify data syncs to production database

### Test 5: Database Persistence
- [ ] Add an offer via extension
- [ ] Trigger a redeploy on Railway
- [ ] Verify offer still exists after redeploy ✅

---

## 🔧 Troubleshooting

### Issue: "SYNC_API_KEY must be set"
**Solution:** Check Railway variables, make sure SYNC_API_KEY is added

### Issue: "Failed to fetch offers"
**Solution:** Check Railway logs for Supabase connection errors

### Issue: Extension can't sync
**Solution:** 
1. Verify extension has correct API key
2. Check CORS settings in production
3. Add production domain to NEXT_PUBLIC_APP_URL

### Issue: Admin login fails
**Solution:** Verify ADMIN_EMAIL matches your Supabase auth email

---

## 📊 Success Metrics

After successful deployment:

✅ **Security:**
- API endpoints protected with secure key
- Input validation active
- CORS restrictions enforced
- RLS policies active

✅ **Data Persistence:**
- Offers survive redeployments
- Database backups automatic (Supabase)
- No data loss on crashes/restarts

✅ **Performance:**
- Fast database queries with indexes
- Concurrent access supported
- Scalable architecture

---

## 🎯 Next Steps (Optional)

### Immediate
- [ ] Test all features in production
- [ ] Monitor Railway logs for errors
- [ ] Set up Railway alerts

### Short Term
- [ ] Publish Chrome extension to Web Store
- [ ] Add CHROME_EXTENSION_ID to Railway
- [ ] Set up custom domain

### Long Term
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Implement analytics
- [ ] Add automated backups
- [ ] Set up staging environment

---

## 📞 Support

**Railway Logs:**
https://railway.app/project/[your-project-id]/deployments

**Supabase Dashboard:**
https://app.supabase.com/project/tqrhrbebgucsyfbdirgi

**Documentation:**
- `SECURITY_WALKTHROUGH.md` - Security setup
- `DATABASE_MIGRATION_GUIDE.md` - Database migration
- `SUPABASE_RLS_SETUP.md` - RLS policies

---

**Deployment Date:** 2026-01-20  
**Version:** 1.0.0 (Database + Security)  
**Status:** Ready for Production ✅
