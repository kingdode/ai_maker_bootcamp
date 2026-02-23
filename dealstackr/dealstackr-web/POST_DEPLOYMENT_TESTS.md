# 🧪 Post-Deployment Test Script

**Run these tests AFTER Railway shows green checkmark ✅**

Replace `YOUR_DOMAIN` with your actual Railway URL (e.g., `dealstackr.up.railway.app`)

---

## Test 1: Homepage Loads

```bash
curl -I https://YOUR_DOMAIN.railway.app
# Should return: HTTP/2 200
```

**Browser test:** Visit https://YOUR_DOMAIN.railway.app
- Should load without errors
- Check console (F12) for errors

---

## Test 2: API Security (Wrong Key)

```bash
curl -X POST https://YOUR_DOMAIN.railway.app/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: wrong-key" \
  -d '{"offers": []}'
```

**Expected:** `{"error":"Unauthorized..."}`  
**Status:** 401 ❌ (This is good!)

---

## Test 3: API Security (Correct Key)

```bash
curl -X POST https://YOUR_DOMAIN.railway.app/api/offers \
  -H "Content-Type: application/json" \
  -H "X-Sync-API-Key: YOUR_SYNC_API_KEY" \
  -d '{"offers": [{"id": "prod-test-001", "merchant": "Walmart", "offer_value": "$15 back on $75", "issuer": "Amex", "card_name": "Blue Cash", "channel": "Both", "scanned_at": "2026-01-20T20:00:00Z", "expires_at": "2026-02-20T00:00:00Z"}]}'
```

**Expected:** `{"success":true,"count":1,...}`  
**Status:** 200 ✅

---

## Test 4: Verify Offer Persists

```bash
curl https://YOUR_DOMAIN.railway.app/api/offers
```

**Expected:** Should see the Walmart offer  
**Status:** 200 ✅

---

## Test 5: Trigger Redeploy & Check Persistence

1. Go to Railway → Deployments
2. Click "Redeploy" on latest deployment
3. Wait for green checkmark
4. Run Test 4 again
5. Walmart offer should STILL be there! ✅

This proves database persistence works!

---

## Test 6: Admin Login

**Browser test:**
1. Go to: https://YOUR_DOMAIN.railway.app/admin/login
2. Login with your admin email
3. Should see admin dashboard ✅

---

## Test 7: Chrome Extension (Production)

**Update extension config:**

1. Find where your extension connects to API
2. Update URL to: `https://YOUR_DOMAIN.railway.app`
3. Reload extension
4. Scan offers from Chase/Amex
5. Should sync to production! ✅

---

## 🐛 Troubleshooting

### Deployment Failed (Red X)

**Check Railway logs:**
1. Railway → Deployments → Failed deployment
2. Click "View Logs"
3. Look for errors

**Common issues:**
- Missing environment variables
- Build errors (check TypeScript)
- Port binding issues

### API Returns 500 Error

**Check Supabase connection:**
```bash
# Test direct database query
curl https://YOUR_DOMAIN.railway.app/api/offers?stats=true
```

If this fails, check:
- `NEXT_PUBLIC_SUPABASE_URL` is correct
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Supabase RLS policies are active

### API Returns "SYNC_API_KEY must be set"

**Solution:**
1. Railway → Variables
2. Add: `SYNC_API_KEY = <your-generated-key>`
3. Redeploy

### Extension Can't Connect

**Check CORS:**
1. Add to Railway Variables:
   ```
   NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN.railway.app
   ```
2. Redeploy

---

## ✅ Success Checklist

- [ ] Homepage loads (200 OK)
- [ ] Wrong API key rejected (401)
- [ ] Correct API key works (200)
- [ ] Data persists in database
- [ ] Data survives redeployment
- [ ] Admin login works
- [ ] Chrome extension can sync

**All checked?** 🎉 **You're in production!**

---

## 📊 Monitoring

**Railway Logs:**
https://railway.app/project/[your-project]/deployments

**Supabase Dashboard:**
https://app.supabase.com/project/tqrhrbebgucsyfbdirgi/editor

**Check offers in database:**
1. Supabase → Table Editor
2. Select "offers" table
3. Should see your synced offers

---

**Last Updated:** 2026-01-20  
**Note:** Use your SYNC_API_KEY from Railway variables for testing. Never commit real keys.
