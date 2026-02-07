# TradeSiteGenie Dashboard - Environment Setup Guide

This guide explains how to set up all required environment variables for development and production.

## Quick Start

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the values following the sections below

3. Restart your development server:
   ```bash
   npm run dev
   ```

---

## 🔐 Environment Variables by Service

### 1. Stripe (Payment Processing)

**What you need:**
- Secret Key (server-side)
- Publishable Key (client-side)
- Webhook Secret (for webhook verification)

**How to get them:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Sign in or create an account
3. Navigate to **Developers** → **API keys**
4. Copy your keys:
   - **Secret key** → `STRIPE_SECRET_KEY`
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

5. For webhook secret:
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `customer.subscription.*`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

**Environment variables:**
```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### 2. Firebase (Authentication & Database)

You need **two sets** of credentials: Admin SDK (server) and Client SDK (browser).

#### 2A. Firebase Admin SDK (Server-side)

**What you need:**
- Project ID
- Client Email
- Private Key

**How to get them:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create one)
3. Click **Settings** ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Extract these values from the JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

**Environment variables:**
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"
```

⚠️ **Important:** Keep the quotes and `\n` in the private key!

#### 2B. Firebase Client SDK (Browser-side)

**What you need:**
- API Key
- Auth Domain
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID

**How to get them:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Settings** ⚙️ → **Project settings**
4. Scroll to **Your apps** section
5. If you don't have a web app, click **Add app** and select **Web**
6. Copy the config values from the Firebase SDK snippet

**Environment variables:**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc...
```

🔓 **Note:** `NEXT_PUBLIC_` prefix is intentional - Firebase config is designed to be public.

---

### 3. Upstash Redis (API Rate Limiting) ⭐ NEW

**What you need:**
- REST URL
- REST Token

**Why you need this:**
Rate limiting prevents API abuse by limiting requests per IP address:
- Checkout: 10 requests/minute
- Coupon validation: 5 requests/minute
- General API: 60 requests/minute

**How to get credentials:**

1. Go to [Upstash Console](https://console.upstash.com)
2. Sign up (free tier available - no credit card required)
3. Click **Create Database**
4. Configure your database:
   - **Name:** `tradesitegenie-ratelimit`
   - **Type:** Regional (cheaper) or Global (faster)
   - **Region:** Choose closest to your users
5. Click **Create**
6. On the database details page, copy:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST TOKEN** → `UPSTASH_REDIS_REST_TOKEN`

**Environment variables:**
```bash
UPSTASH_REDIS_REST_URL=https://eu2-xxxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYBxACQcM...
```

**Development:** Optional but recommended for testing rate limits
**Production:** ⚠️ **REQUIRED** - Without this, rate limiting is disabled!

---

### 4. Zapier (Support Ticket Automation)

**What you need:**
- Webhook URL

**How to get it:**

1. Log in to [Zapier](https://zapier.com)
2. Create a new Zap
3. Set trigger: **Webhooks by Zapier** → **Catch Hook**
4. Copy the **Custom Webhook URL**
5. Configure action: **Notion** → **Create Database Item**
6. Map the fields from the webhook to your Notion properties

**Environment variables:**
```bash
NEXT_PUBLIC_ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx
```

---

## 🔒 Security Best Practices

### NEXT_PUBLIC_ vs Server-Only Variables

**`NEXT_PUBLIC_*` prefix (Exposed to browser):**
- ✅ Use for: Public API keys, client IDs, public endpoints
- ✅ Examples: Firebase config, Stripe publishable key
- ❌ Never use for: Private keys, secrets, admin credentials

**No prefix (Server-only):**
- ✅ Use for: Private keys, secrets, admin credentials
- ✅ Examples: Stripe secret key, Firebase private key, Upstash token
- ❌ Never expose these in client-side code

### Git Safety

✅ `.env.local` is git-ignored (safe for local development)
✅ `.env.example` is tracked (safe - no real values)
❌ Never commit `.env.local` or any file with real credentials

### Production Deployment

**Vercel (recommended):**
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add each variable from `.env.example`
4. Select environments: Production, Preview, Development
5. Click **Save**

**Other platforms:**
- Use their environment variable configuration UI
- Never hardcode credentials in your code

---

## 🧪 Testing Your Setup

### 1. Check if variables are loaded:

Create `scripts/test-env.ts`:
```typescript
console.log('Environment Variables Check:');
console.log('✅ Stripe Secret Key:', process.env.STRIPE_SECRET_KEY ? 'Set' : '❌ Missing');
console.log('✅ Firebase Project ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : '❌ Missing');
console.log('✅ Upstash Redis URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : '❌ Missing');
```

Run: `tsx scripts/test-env.ts`

### 2. Test rate limiting:

```bash
# Send 6 requests to coupon validation (limit is 5/min)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/stripe/validate-coupon \
    -H "Content-Type: application/json" \
    -d '{"couponCode":"TEST"}' && echo
done
```

Expected: First 5 succeed, 6th returns 429 (Too Many Requests)

### 3. Test authentication:

```bash
# Try to upgrade subscription without auth token
curl -X POST http://localhost:3000/api/stripe/upgrade-subscription \
  -H "Content-Type: application/json" \
  -d '{"newTier":"premium"}'
```

Expected: 401 Unauthorized

---

## 📚 Required vs Optional Variables

### Required for Development
- ✅ Firebase Admin SDK (3 variables)
- ✅ Firebase Client SDK (6 variables)
- ✅ Stripe keys (3 variables)
- ⚠️ Upstash Redis (2 variables) - Recommended but not required

### Required for Production
- ✅ All of the above
- ✅ Upstash Redis (REQUIRED for security)
- ✅ Zapier webhook (if using support form)

### What happens if variables are missing?

| Variable | Missing Behavior |
|----------|-----------------|
| Stripe | Payment operations fail |
| Firebase Admin | Server-side auth fails |
| Firebase Client | Client-side auth fails |
| Upstash Redis | ⚠️ Rate limiting disabled (logs warning) |
| Zapier | Support form submission fails |

---

## 🆘 Troubleshooting

### "Firebase Admin not initialized"
- Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Verify private key has correct `\n` characters and quotes

### "Rate limiting disabled"
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Verify URL starts with `https://`
- Test Redis connection in Upstash console

### "Stripe webhook signature verification failed"
- Check `STRIPE_WEBHOOK_SECRET` matches your webhook configuration
- Verify webhook endpoint URL is correct
- Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Environment variables not loading
- Restart your dev server after changing `.env.local`
- Check file is named exactly `.env.local` (not `.env.local.txt`)
- Verify file is in project root directory

---

## 📞 Support

If you encounter issues:
1. Check the [main README](./README.md) for general setup
2. Review [Security Fixes Documentation](./SECURITY_FIXES_APPLIED.md)
3. Check [Middleware Documentation](./lib/middleware/USAGE.md)

---

**Last Updated:** Phase 1 Security Implementation
**Next Steps:** See `lib/middleware/IMPLEMENTATION_STATUS.md` for migration status
