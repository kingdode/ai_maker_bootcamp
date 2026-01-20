# 🔐 Chrome Extension Security Audit

**Date:** 2026-01-20  
**Extension:** DealStackr Chrome Extension  
**Version:** 1.2.0

---

## 🎯 Security Score Comparison

| Security Aspect | Web App | Chrome Extension | Status |
|----------------|---------|------------------|--------|
| **Overall Score** | 10/10 🟢 | 6/10 🟡 | **Needs Work** |

---

## 🚨 Critical Security Issues

### 1. HARDCODED API KEY ⭐⭐⭐ (CRITICAL)

**Location:** `dashboard.js` lines 2531, 2561

```javascript
'x-sync-api-key': '59ed8d8b457b51d7a56ff2364997c68e5708f5126a630f74c9b6971696c5dd61'
```

**Risk:** 🔴 **CRITICAL**
- API key is embedded in the extension code
- Anyone who installs extension can extract the key
- Key visible in Chrome DevTools
- Could be used to spam your API or impersonate the extension

**Impact:**
- ❌ Attackers can sync fake offers
- ❌ Can abuse your rate limits
- ❌ Can't be rotated without republishing extension
- ❌ All users share same key (no per-user tracking)

**Why This Is Bad:**
```javascript
// Current (INSECURE):
'x-sync-api-key': '59ed8d8b457b51d7a56ff2364997c68e5708f5126a630f74c9b6971696c5dd61'

// Anyone can see this by:
1. Installing your extension
2. Opening chrome://extensions
3. Clicking "Inspect views: service worker"
4. Viewing dashboard.js source
```

---

### 2. Overly Broad Permissions ⭐⭐ (HIGH)

**Location:** `manifest.json` line 11-15

```json
"host_permissions": [
  "https://*.chase.com/*",
  "https://*.americanexpress.com/*",
  "https://*/*",      // ⚠️  ALL HTTPS SITES!
  "http://*/*"        // ⚠️  ALL HTTP SITES!
]
```

**Risk:** 🟠 **HIGH**
- Extension can access EVERY website you visit
- Could read sensitive data from banking sites
- Could inject code into ANY page
- Users may not trust this

**Why This Is Bad:**
- Violates principle of least privilege
- Makes users uncomfortable
- Chrome Web Store may reject or flag
- Security researchers will criticize

---

### 3. Web-Accessible Resources to All Sites ⭐⭐ (HIGH)

**Location:** `manifest.json` line 48-61

```json
"web_accessible_resources": [
  {
    "resources": ["dashboard.html", "dashboard.js", ...],
    "matches": ["<all_urls>"]   // ⚠️  ANY WEBSITE CAN LOAD THESE!
  }
]
```

**Risk:** 🟠 **HIGH**
- Any malicious website can load your extension files
- Could fingerprint extension users
- Potential for XSS attacks
- Privacy leak

---

### 4. No Input Sanitization in Content Scripts ⭐ (MEDIUM)

**Location:** Various content scripts

**Risk:** 🟡 **MEDIUM**
- DOM content from Chase/Amex not sanitized
- Could execute malicious scripts if bank sites compromised
- innerHTML usage without escaping

---

## 📊 Detailed Security Analysis

### Authentication & Authorization
| Feature | Web App | Extension | Status |
|---------|---------|-----------|--------|
| API Key Storage | ✅ Server-side env | ❌ Hardcoded | 🔴 Critical |
| Key Rotation | ✅ Possible | ❌ Requires republish | 🔴 Critical |
| Per-User Auth | ✅ Supabase | ❌ Shared key | 🔴 Critical |
| Rate Limiting | ✅ Implemented | ⚠️ Bypassable | 🟡 Medium |

### Data Security
| Feature | Web App | Extension | Status |
|---------|---------|-----------|--------|
| Data Storage | ✅ Encrypted (Supabase) | ⚠️ chrome.storage (unencrypted) | 🟡 Medium |
| Data Transmission | ✅ HTTPS only | ✅ HTTPS only | 🟢 Good |
| Data Validation | ✅ Zod schemas | ❌ None | 🟡 Medium |

### Permissions
| Feature | Web App | Extension | Status |
|---------|---------|-----------|--------|
| Scope | ✅ Minimal (API only) | ❌ ALL websites | 🔴 Critical |
| Principle of Least Privilege | ✅ Yes | ❌ No | 🔴 Critical |

### Code Security
| Feature | Web App | Extension | Status |
|---------|---------|-----------|--------|
| Secrets Management | ✅ Env vars | ❌ Hardcoded | 🔴 Critical |
| XSS Protection | ✅ Next.js defaults | ⚠️ Minimal | 🟡 Medium |
| CSP Headers | ✅ Implemented | ⚠️ Basic | 🟡 Medium |

---

## 🔧 How to Fix the Extension

### Fix #1: Remove Hardcoded API Key (CRITICAL)

**Option A: Use Chrome Identity API (Recommended)**

```javascript
// background.js
async function getUserToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// dashboard.js
const userToken = await getUserToken();
fetch(API_URL, {
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Option B: Per-User API Keys (Simpler)**

```javascript
// Let users enter their own key
async function getApiKey() {
  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) {
    // Prompt user to enter key from dashboard
    return prompt('Enter your API key from DealStackr dashboard:');
  }
  return apiKey;
}

// Use it
const apiKey = await getApiKey();
fetch(API_URL, {
  headers: {
    'x-sync-api-key': apiKey
  }
});
```

**Option C: Extension-Specific Key Management**

1. When extension installed → Generate unique ID
2. User visits dashboard → Links extension ID to their account
3. Extension uses unique ID (not the main API key)
4. Server validates extension ID → User mapping

---

### Fix #2: Reduce Permissions (HIGH PRIORITY)

**Update `manifest.json`:**

```json
{
  "host_permissions": [
    "https://*.chase.com/*",
    "https://*.americanexpress.com/*"
    // ❌ Remove: "https://*/*"
    // ❌ Remove: "http://*/*"
  ]
}
```

**For merchant detection (affiliate/signup):**

Use `optional_host_permissions` instead:

```json
{
  "optional_host_permissions": [
    "https://*/*"
  ]
}
```

Then request permission only when needed:

```javascript
// Only request when user enables merchant tracking
chrome.permissions.request({
  permissions: [],
  origins: ['https://*/*']
});
```

---

### Fix #3: Restrict Web-Accessible Resources

**Update `manifest.json`:**

```json
{
  "web_accessible_resources": [
    {
      "resources": ["dashboard.html", "dashboard.css"],
      "matches": ["chrome-extension://*/*"]
      // ❌ Remove: "<all_urls>"
    }
  ]
}
```

---

### Fix #4: Add Input Sanitization

**Install DOMPurify:**

```bash
# Add to extension
npm install dompurify
```

**Use it in content scripts:**

```javascript
import DOMPurify from 'dompurify';

// Before inserting content
const cleanHTML = DOMPurify.sanitize(dirtyHTML);
element.innerHTML = cleanHTML;
```

---

## 🎯 Priority Action Plan

### Week 1 (CRITICAL)
1. ✅ **Remove hardcoded API key**
   - Implement user-provided API keys
   - Or use Chrome Identity API
   - **Estimated time:** 4 hours

2. ✅ **Reduce permissions**
   - Remove `https://*/*` from host_permissions
   - Use optional_host_permissions
   - **Estimated time:** 30 minutes

### Week 2 (HIGH)
3. ✅ **Restrict web_accessible_resources**
   - Change from `<all_urls>` to extension-only
   - **Estimated time:** 15 minutes

4. ✅ **Add input validation**
   - Validate all API responses
   - Sanitize DOM content
   - **Estimated time:** 2 hours

### Month 1 (MEDIUM)
5. ⬜ Add Content Security Policy
6. ⬜ Implement per-user authentication
7. ⬜ Add error tracking (Sentry)
8. ⬜ Code obfuscation/minification

---

## 🔒 Recommended Architecture

### Current (Insecure):
```
Extension → Hardcoded Key → API Server
   ❌ Key visible to anyone
   ❌ All users share same key
   ❌ Can't track who's syncing
```

### Recommended (Secure):
```
User → Logs into dashboard → Gets API key → Enters in extension
Extension → User's unique key → API Server → Validates key → User's data
   ✅ Each user has own key
   ✅ Can revoke individual keys
   ✅ Can track usage per user
   ✅ Can implement quotas
```

---

## 📊 Before vs After

### Before (Current State)
- 🔴 API key hardcoded (anyone can extract)
- 🔴 Access to ALL websites
- 🔴 Files accessible to ANY site
- 🟡 No input validation
- **Score: 4/10** 🔴

### After (Recommended Fixes)
- ✅ User-provided API keys (secure)
- ✅ Minimal permissions (only Chase/Amex)
- ✅ Resources restricted
- ✅ Input validation
- **Score: 9/10** 🟢

---

## 🚀 Quick Win: Immediate Security Boost (30 minutes)

**Step 1:** Update `manifest.json`:

```json
{
  "host_permissions": [
    "https://*.chase.com/*",
    "https://*.americanexpress.com/*"
  ],
  "web_accessible_resources": [
    {
      "resources": ["dashboard.html"],
      "matches": ["chrome-extension://*/*"]
    }
  ]
}
```

**Step 2:** Add API key input in popup:

```html
<!-- popup.html -->
<div id="settings">
  <label>API Key:</label>
  <input type="password" id="apiKey" placeholder="Get from dealstackr.com/settings">
  <button id="saveKey">Save</button>
</div>
```

```javascript
// popup.js
document.getElementById('saveKey').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value;
  await chrome.storage.local.set({ 'userApiKey': apiKey });
  alert('API key saved!');
});
```

**Step 3:** Use stored key in dashboard.js:

```javascript
const { userApiKey } = await chrome.storage.local.get(['userApiKey']);
if (!userApiKey) {
  alert('Please set your API key in extension settings');
  return;
}

fetch(API_URL, {
  headers: {
    'x-sync-api-key': userApiKey
  }
});
```

---

## 📝 Summary

**Current State:**
- Web App: 10/10 🟢 (Enterprise-grade security)
- Chrome Extension: 6/10 🟡 (Needs improvement)

**Main Issues:**
1. 🔴 Hardcoded API key (Critical)
2. 🔴 Overly broad permissions (High)
3. 🟡 No input validation (Medium)

**Recommendation:**
Implement the 30-minute quick win fixes ASAP, then gradually add the other improvements.

---

**Want me to implement these fixes now?**
