# Environment Variables Quick Reference

## 📋 New Variables Added in Phase 1 Security Implementation

### Upstash Redis (Rate Limiting) - NEW ⭐

**Required for:** API rate limiting to prevent abuse

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
```

**How to get:**
1. Sign up at https://console.upstash.com (free tier available)
2. Create new Redis database
3. Copy REST URL and REST TOKEN from database details

**Status:**
- Development: ⚠️ Optional (rate limiting disabled if not set)
- Production: 🔴 REQUIRED (security vulnerability without it)

**What it does:**
- Limits API requests per IP address
- Prevents brute force attacks on coupon validation
- Protects against subscription manipulation spam
- Configurable limits per endpoint:
  - Checkout: 10 requests/minute
  - Coupon validation: 5 requests/minute
  - Webhooks: 20 requests/minute
  - General API: 60 requests/minute

---

### Firebase Client Config (Browser-side) - MOVED TO ENV

**Note:** These were previously hardcoded in `lib/firebase.ts` and have been moved to environment variables for security best practices.

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc...
```

**How to get:**
1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps" section
3. Copy values from Firebase SDK configuration

**Why NEXT_PUBLIC_ is safe:**
- Firebase is designed for these to be public
- Security comes from Firestore Rules and Firebase Auth
- These are client identifiers, not secrets

---

## 📊 Complete Variable Checklist

### Required for All Environments

| Variable | Purpose | Secret? | Where to Get |
|----------|---------|---------|--------------|
| `STRIPE_SECRET_KEY` | Server-side Stripe operations | 🔒 Yes | Stripe Dashboard → API Keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | 🔓 No | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhooks | 🔒 Yes | Stripe Dashboard → Webhooks |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK | 🔒 Yes | Firebase Console → Service Account |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK | 🔒 Yes | Firebase Console → Service Account |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK | 🔒 Yes | Firebase Console → Service Account |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Client SDK | 🔓 No | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Client SDK | 🔓 No | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Client SDK | 🔓 No | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Client SDK | 🔓 No | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Client SDK | 🔓 No | Firebase Console → Project Settings |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Client SDK | 🔓 No | Firebase Console → Project Settings |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | 🔒 Yes | Upstash Console → Database Details |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | 🔒 Yes | Upstash Console → Database Details |

### Optional Variables

| Variable | Purpose | Secret? | Where to Get |
|----------|---------|---------|--------------|
| `NEXT_PUBLIC_ZAPIER_WEBHOOK_URL` | Support ticket automation | 🔓 No | Zapier → Webhook Configuration |
| `SLACK_WEBHOOK_URL` | New user signup notifications | 🔒 Yes | Slack → Incoming Webhooks |
| `SLACK_SUPPORT_WEBHOOK_URL` | Support ticket create/update notifications | 🔒 Yes | Slack → Incoming Webhooks |
| `HELPSCOUT_APP_ID` | HelpScout OAuth2 (conversation creation) | 🔒 Yes | HelpScout → Apps → OAuth2 |
| `HELPSCOUT_APP_SECRET` | HelpScout OAuth2 (conversation creation) | 🔒 Yes | HelpScout → Apps → OAuth2 |
| `HELPSCOUT_MAILBOX_ID` | HelpScout mailbox for new conversations | 🔒 Yes | HelpScout → Mailboxes |
| `LOOPS_API_KEY` | Loops transactional emails (payment confirmed, dashboard ready, account deletion) | 🔒 Yes | Loops → Settings → API |
| `LOOPS_SUPPORT_TICKET_TEMPLATE_ID` | Loops transactional template for support tickets | 🔒 Yes | Loops → Transactional Emails |
| `NOTION_SALES_PIPELINE_DB_ID` | TSG Sales Pipeline **data source** ID (for payment tracking, weekly digest, book-call prospects) | 🔒 No | Notion → Database → ⋮ → Manage data sources → Copy data source ID |
| `PASSWORD_RESET_EMAIL_MODE` | Password reset email: `console` (log URL for testing) or `loops` (send via Loops) | 🔓 No | Default: `loops` |
| `LOOPS_PASSWORD_RESET_TEMPLATE_ID` | Loops transactional template for password reset emails | 🔒 Yes | Loops → Transactional Emails |
| `CRON_SECRET` | Optional auth for Vercel Cron (e.g. weekly-sales-digest) | 🔒 Yes | Generate secure random string |

---

### Loops (Transactional Emails)

**Used by:** 
- `/api/user/request-deletion` - Account deletion requests to Help Scout inbox
- Stripe webhook - Payment Confirmed email after checkout
- `/api/notifications/dashboard-ready` - Dashboard Ready email after signup
- `/api/auth/request-password-reset` - Password reset emails (when `PASSWORD_RESET_EMAIL_MODE=loops`)

```bash
LOOPS_API_KEY=your_loops_api_key_here
LOOPS_SUPPORT_TICKET_TEMPLATE_ID=support-ticket-to-helpscout
LOOPS_PASSWORD_RESET_TEMPLATE_ID=your-password-reset-template-id  # For custom password reset flow
```

**Password Reset Mode:** Set `PASSWORD_RESET_EMAIL_MODE=console` to log reset URLs to server console instead of sending emails (useful before Loops template is ready).

**How to get:**
1. Sign up at https://app.loops.so
2. Create transactional email templates (payment confirmed, dashboard ready, support tickets)
3. Copy API key from Settings → API
4. Use template IDs when sending

**Status:** Optional - If not set, payment confirmation and dashboard ready emails are skipped; account deletion still logged to Firestore and Slack.

---

## 🔐 Security Classifications

### Server-Only Secrets (Never expose to browser)
```bash
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
HELPSCOUT_APP_ID
HELPSCOUT_APP_SECRET
HELPSCOUT_MAILBOX_ID
LOOPS_API_KEY
LOOPS_SUPPORT_TICKET_TEMPLATE_ID
LOOPS_PASSWORD_RESET_TEMPLATE_ID
CRON_SECRET
```

### Public Client Variables (Safe to expose)
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_FIREBASE_* (all 6 variables)
NEXT_PUBLIC_ZAPIER_WEBHOOK_URL
```

---

## 🚨 Migration Checklist

If you're migrating from pre-Phase 1:

- [ ] Create `.env.example` from template
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add existing Stripe/Firebase credentials
- [ ] **NEW:** Get Upstash Redis credentials
- [ ] **NEW:** Add Upstash credentials to `.env.local`
- [ ] **NEW:** Move Firebase client config from code to env vars
- [ ] Update `.gitignore` to include all env file patterns
- [ ] Restart development server
- [ ] Test rate limiting works (see docs/SETUP.md)
- [ ] Deploy to production with all env vars set

---

## 📝 Development vs Production

### Local Development (.env.local)
```bash
# All variables from .env.example
# Use test/development keys from services
# Git-ignored (never commit)
```

### Production (Hosting Platform)
```bash
# Same variables but with production keys
# Set in Vercel/hosting platform UI
# Use production Stripe keys
# Use production Firebase project
# MUST include Upstash Redis for security
```

---

## 🆘 Common Issues

### "Rate limiting disabled"
**Problem:** Missing Upstash Redis credentials
**Solution:** Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### "Firebase Admin not initialized"
**Problem:** Missing or incorrect Firebase Admin credentials
**Solution:** Check `FIREBASE_PRIVATE_KEY` has proper quotes and `\n` characters

### "Environment variables not loading"
**Problem:** Server not restarted after changes
**Solution:** Stop and restart `npm run dev`

### Production security warning
**Problem:** Deployed without Upstash Redis
**Solution:** Add Upstash credentials to production environment variables

---

## 📚 Related Documentation

- **Full Setup Guide:** [docs/SETUP.md](./SETUP.md)
- **Security Implementation:** [../SECURITY_FIXES_APPLIED.md](../SECURITY_FIXES_APPLIED.md)
- **Middleware Usage:** [../lib/middleware/USAGE.md](../lib/middleware/USAGE.md)
- **Main README:** [../README.md](../README.md)
- **Account Deletion API:** [account-deletion-api.md](./account-deletion-api.md) - Loops env vars usage

---

**Last Updated:** February 2026  
**Next Review:** When adding new external services
