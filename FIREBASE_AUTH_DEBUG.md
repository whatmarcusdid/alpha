# Firebase Auth/Network-Request-Failed Error - Debugging Guide

**Error:** Firebase auth/network-request-failed
**Status:** Investigating

---

## ✅ Verification Completed

### 1. Firebase Project ID ✅

**In .env.local (line 12):**
```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tradesitegenie
```

**Status:** ✅ CORRECT - Matches your Firebase project

---

### 2. All Firebase Environment Variables Present ✅

**Verified in .env.local (lines 10-15):**
- ✅ NEXT_PUBLIC_FIREBASE_API_KEY
- ✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- ✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID
- ✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- ✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- ✅ NEXT_PUBLIC_FIREBASE_APP_ID

All 6 required variables are present.

---

## 🔍 Enhanced Diagnostics Added

I've updated `lib/firebase.ts` to include:

1. **Config value logging** - Shows which values loaded
2. **Auth state listener** - Monitors Firebase Auth connection
3. **Detailed error logging** - Shows error code, message, name

**New console output will show:**
```javascript
✅ Firebase initialized successfully
🔥 Firebase Config Check: {
  apiKey: "AIzaSyCvE-BO2puKDD6...",
  authDomain: "tradesitegenie.firebaseapp.com",
  projectId: "tradesitegenie",
  storageBucket: "tradesitegenie.firebasestorage.app"
}
🔥 Firebase Auth State: Not signed in
```

---

## 🚀 Steps to Debug

### Step 1: Hard Restart with Cache Clear

```bash
# In the terminal where dev server is running (terminal 9):
# 1. Stop server: Ctrl+C or Cmd+C

# 2. Clear Next.js cache
rm -rf .next

# 3. Start fresh
npm run dev
```

**Why:** Turbopack might have cached the old build without env vars

---

### Step 2: Check Browser Console

**Open:** http://localhost:3000
**DevTools:** F12 → Console tab

**Look for these new diagnostic logs:**

**✅ If Firebase is loading correctly:**
```
✅ Firebase initialized successfully
🔥 Firebase Config Check: { apiKey: "AIzaSy...", authDomain: "...", ... }
🔥 Firebase Auth State: Not signed in
```

**❌ If env vars still not loading:**
```
⚠️ Firebase not initialized due to missing configuration
Required environment variables:
- NEXT_PUBLIC_FIREBASE_API_KEY
...
```

---

### Step 3: Check Network Tab for Auth Requests

**In DevTools:**
1. Go to **Network tab**
2. Try to sign in (go to /signin and attempt login)
3. Filter by "identitytoolkit" or "firebase"

**Look for requests to:**
- `identitytoolkit.googleapis.com`
- `firebaseapp.com`

**If request fails, check:**
- Status code (403, 404, 400, etc.)
- Response body (error message)
- Request payload (is API key being sent?)

---

## 🔍 Common Network-Request-Failed Causes

### Cause 1: Firebase Auth Not Enabled

**Check in Firebase Console:**
1. Go to: https://console.firebase.google.com
2. Select: "tradesitegenie" project
3. Navigate to: **Authentication** → **Sign-in method**
4. Verify: **Email/Password** provider is **ENABLED**

**If not enabled:**
- Click "Email/Password"
- Toggle "Enable"
- Click "Save"

---

### Cause 2: Incorrect API Key or Auth Domain

**Verify in Firebase Console:**
1. Go to: **Project Settings** → **General**
2. Scroll to: **Your apps** section
3. Click the web app (if none, add one)
4. Copy the config and compare with .env.local:

```javascript
// From Firebase Console:
const firebaseConfig = {
  apiKey: "AIza...",           // Should match NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "xyz.firebaseapp.com", // Should match NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "tradesitegenie", // Should match NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "...",        // Should match NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "...",    // Should match NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "...",                // Should match NEXT_PUBLIC_FIREBASE_APP_ID
};
```

---

### Cause 3: CORS or Network Issues

**Check Network Tab:**
- If request is blocked by CORS → Firebase Auth domain issue
- If request times out → Network connectivity issue
- If 403 Forbidden → API key issue or Auth not enabled

---

### Cause 4: Turbopack Not Inlining Env Vars

**I've created next.config.js to help with this.**

**Verify it exists:**
```bash
ls -la next.config.js
```

**Content:**
```javascript
const nextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    // ... all Firebase vars explicitly mapped
  },
};
```

This forces Next.js/Turbopack to inline these specific variables.

---

## 🧪 Test if Env Vars Are Being Inlined

**In browser console, run:**

```javascript
// Test if env vars are inlined
console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
```

**Expected (if working):**
```
API Key: AIzaSyCvE-BO2puKDD6ZF0fz9IVCpMnLRqGD6n4
Project ID: tradesitegenie
```

**Not Expected:**
```
API Key: undefined
Project ID: undefined
```

**If undefined:**
- Env vars are NOT being inlined by Next.js/Turbopack
- Issue with build process
- Need to investigate Next.js 16 + Turbopack compatibility

---

## 🔧 Workaround: Temporary Hardcode Test

**If you need to test RIGHT NOW:**

Temporarily edit `lib/firebase.ts` line 20-27:

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCvE-BO2puKDD6ZF0fz9IVCpMnLRqGD6n4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tradesitegenie.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tradesitegenie",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tradesitegenie.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "655550863852",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:655550863852:web:3f1e3d0e3a40e3e8e3e3e3",
};
```

**This will:**
- Use env vars if available
- Fall back to hardcoded values if not
- Let you test if Firebase Auth works with correct config
- Help isolate whether issue is env vars or Firebase Auth itself

**⚠️ Remove this workaround once env vars are working!**

---

## 📋 Diagnostic Checklist

Run through this in order:

- [ ] **Step 1:** Clear cache - `rm -rf .next`
- [ ] **Step 2:** Hard restart dev server
- [ ] **Step 3:** Check browser console for new diagnostic logs
- [ ] **Step 4:** Run `console.log(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)` in browser
- [ ] **Step 5:** If still undefined, check Network tab during sign-in
- [ ] **Step 6:** Verify Firebase Auth is enabled in Firebase Console
- [ ] **Step 7:** Compare .env.local values with Firebase Console config

---

## 🎯 Next Steps Based on Results

### If You See: "✅ Firebase initialized successfully"
- ✅ Env vars are working!
- Test authentication
- If auth still fails, check Firebase Console settings

### If You See: "⚠️ Firebase not initialized due to missing configuration"
- ❌ Env vars not being inlined
- Try the temporary hardcode workaround
- If that works, it's a Next.js 16 + Turbopack env var issue

### If You See: Network errors in Network tab
- Check Firebase Console for Auth enabled
- Verify API key is correct
- Check for CORS issues

---

## 🆘 Quick Diagnostic Commands

**Test 1: Check if .env.local is being loaded**
```bash
# In terminal
cat .env.local | grep NEXT_PUBLIC_FIREBASE | wc -l
# Expected: 6
```

**Test 2: Check if Next.js sees the file**
```bash
# Start server and check output
npm run dev | grep "Environments"
# Expected: "Environments: .env.local"
```

**Test 3: Check if variables inline in build**
```bash
npm run build 2>&1 | grep -i firebase
```

---

## 📊 Current Status

**Configuration:**
- ✅ All 6 Firebase env vars in .env.local
- ✅ Project ID correct ("tradesitegenie")
- ✅ next.config.js created with explicit env mapping
- ✅ Enhanced diagnostic logging added to lib/firebase.ts

**Next:**
- ⏳ Clear cache and restart server
- ⏳ Check browser console for diagnostic output
- ⏳ Determine if env vars are being inlined

---

**Action Required:** Clear cache (`rm -rf .next`) and restart dev server, then check browser console for the new diagnostic logs!
