# Deployment Guide

## Overview

This guide covers deploying TradeSiteGenie Dashboard to production. The recommended platform is Vercel, though the app can be deployed to any platform supporting Next.js.

---

## Environment Strategy

### Local Development

**Environment:** `.env.local` (git-ignored)

**Purpose:** Developer's local machine with test credentials

**Characteristics:**
- Uses Stripe test mode keys (`sk_test_...`, `pk_test_...`)
- Points to development Firebase project (optional)
- Upstash Redis optional (rate limiting disabled if missing)
- All features accessible for testing

---

### Production

**Environment:** Vercel Environment Variables (or equivalent)

**Purpose:** Live application serving real customers

**Characteristics:**
- Uses Stripe live mode keys (`sk_live_...`, `pk_live_...`)
- Points to production Firebase project
- Upstash Redis **REQUIRED** (rate limiting mandatory)
- Sentry enabled for error monitoring

**Domain:** `https://my.tradesitegenie.com` (or configured domain)

---

## Required Secrets Checklist

Before deploying to production, verify ALL environment variables are configured:

### Stripe Configuration (REQUIRED)

```bash
✅ STRIPE_SECRET_KEY=sk_live_...
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
✅ STRIPE_WEBHOOK_SECRET=whsec_...
```

**Verification:**
- Secret key starts with `sk_live_` (not `sk_test_`)
- Webhook secret matches production webhook in Stripe Dashboard
- Publishable key matches secret key mode (both live or both test)

---

### Firebase Admin SDK (REQUIRED)

```bash
✅ FIREBASE_PROJECT_ID=your-production-project
✅ FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...iam.gserviceaccount.com
✅ FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Verification:**
- Project ID matches production Firebase project
- Private key has quotes and preserves `\n` characters
- Client email is valid service account

---

### Firebase Client SDK (REQUIRED)

```bash
✅ NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-production-project
✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
✅ NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc...
```

**Verification:**
- All values match production Firebase project
- Project ID matches between Admin and Client SDK

---

### Upstash Redis (REQUIRED IN PRODUCTION)

```bash
✅ UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
✅ UPSTASH_REDIS_REST_TOKEN=AYBxACQcM...
```

**Verification:**
- Test connection in Upstash Console
- Database is in closest region to primary users

⚠️ **CRITICAL:** Without Redis, rate limiting is disabled and API is vulnerable to abuse.

---

### Sentry Monitoring (RECOMMENDED)

```bash
✅ SENTRY_AUTH_TOKEN=sntrys_...
✅ NEXT_PUBLIC_SENTRY_DSN=https://...@...sentry.io/...
✅ SENTRY_ORG=tradesitegenie
✅ SENTRY_PROJECT=javascript-nextjs
```

**Verification:**
- Auth token has permission to upload source maps
- DSN points to correct Sentry project

---

### Notifications (OPTIONAL)

```bash
⚠️ SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
⚠️ SLACK_SUPPORT_WEBHOOK_URL=https://hooks.slack.com/services/...
⚠️ DELIVERY_SCOUT_API_KEY=your-generated-api-key
```

**Impact if missing:**
- `SLACK_WEBHOOK_URL`: New user signup notifications won't send (non-blocking)
- `SLACK_SUPPORT_WEBHOOK_URL`: Support ticket create/update notifications won't send (non-blocking)
- Delivery Scout: Lindy AI can't update customer data

### HelpScout Integration (OPTIONAL - for ticket create/update)

```bash
⚠️ HELPSCOUT_APP_ID=your-app-id
⚠️ HELPSCOUT_APP_SECRET=your-app-secret
⚠️ HELPSCOUT_MAILBOX_ID=123456
```

**Impact if missing:**
- HelpScout conversation creation skipped on ticket create
- HelpScout note sync skipped on ticket update
- Uses OAuth2 Client Credentials flow (not Basic Auth)

---

## Pre-Deployment Checks

Run these checks locally before deploying:

### 1. TypeScript Type Check

```bash
npx tsc --noEmit
```

**Expected:** No errors.

**If errors found:**
- Fix all type errors before deploying
- Common issues: undefined types, missing imports, wrong types

---

### 2. Linter Check

```bash
npm run lint
```

**Expected:** No errors or warnings.

**If warnings found:**
- Fix critical warnings
- Document any intentional lint bypasses

---

### 3. Build Test

```bash
npm run build
```

**Expected:**
- Build completes successfully
- No "Failed to compile" errors
- Sentry source maps upload successfully

**If build fails:**
- Check error messages
- Verify all imports are valid
- Clear cache: `rm -rf .next` and retry

---

### 4. Environment Variable Audit

```bash
# Compare .env.local with .env.example
diff <(sort .env.example | grep -v "^#" | grep -v "^$") \
     <(sort .env.local | cut -d= -f1 | grep -v "^#" | grep -v "^$")
```

**Expected:** All variables from `.env.example` should exist in `.env.local`.

---

### 5. Critical User Journey Tests

Test these flows manually in development:

- [ ] **User signup** (email, Google, Apple)
- [ ] **User signin**
- [ ] **Dashboard loads** with real data
- [ ] **Update payment method**
- [ ] **View billing history**
- [ ] **Upgrade subscription** (if test card available)
- [ ] **Cancel subscription**
- [ ] **Sign out**

---

## Deployment Steps (Vercel)

### First-Time Setup

#### 1. Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import GitHub repository: `whatmarcusdid/alpha`
3. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Click "Deploy" (will fail without env vars - expected)

---

#### 2. Configure Environment Variables

1. Go to Project Settings → Environment Variables
2. Add ALL variables from production checklist above
3. Set for: **Production**, **Preview**, **Development**
4. Click "Save" for each variable

**Tips:**
- Copy-paste from password manager to avoid typos
- Double-check `FIREBASE_PRIVATE_KEY` has correct format
- Verify Stripe keys are live mode (`sk_live_`, not `sk_test_`)

---

#### 3. Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add domain: `my.tradesitegenie.com`
3. Configure DNS records as shown
4. Wait for SSL certificate provisioning (~5 minutes)

---

#### 4. Redeploy

1. Go to Deployments tab
2. Click "Redeploy" on latest failed deployment
3. Wait for build to complete (~2-3 minutes)
4. Verify deployment succeeds

---

### Ongoing Deployments

#### Automatic Deployments (Recommended)

**Trigger:** Push to `main` branch

**Process:**
1. Developer pushes code to GitHub
2. Vercel detects push via webhook
3. Runs build automatically
4. Deploys if build succeeds
5. Sends notifications (Slack, email) if configured

**Branches:**
- `main` → Production deployment
- Other branches → Preview deployments (shareable URLs)

---

#### Manual Deployment

**When to use:** Emergency fixes, rollbacks

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Post-Deployment Verification

### Smoke Tests (Critical Path)

Run these tests immediately after deployment:

#### 1. Health Check

```bash
curl https://my.tradesitegenie.com/api/hello
```

**Expected:** `{ message: 'Hello from TradeSiteGenie!' }` or similar

---

#### 2. Stripe Webhook Connection

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find webhook for `https://my.tradesitegenie.com/api/webhooks/stripe`
3. Click "Send test event"
4. Select event: `customer.subscription.created`
5. Verify: ✅ Delivered successfully

**If failed:**
- Check webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
- Check server logs/Sentry for errors

---

#### 3. Authentication Flow

1. Visit `https://my.tradesitegenie.com/signin`
2. Create test account or sign in with existing
3. Verify redirect to dashboard
4. Check dashboard loads without errors
5. Sign out

**If failed:**
- Check Firebase Auth is enabled for email/Google/Apple
- Check `NEXT_PUBLIC_FIREBASE_*` variables are correct
- Check browser console for errors

---

#### 4. Payment Method Update

1. Sign in to dashboard
2. Click "Update Payment Method"
3. Verify Stripe Elements loads
4. Cancel modal (don't submit actual card)

**If failed:**
- Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is correct
- Check create-setup-intent API in Network tab
- Check Sentry for errors

---

#### 5. Check Sentry Integration

1. Visit `https://my.tradesitegenie.com/sentry-example-page`
2. Click "Test Client Error"
3. Check Sentry dashboard for error within 30 seconds

**If failed:**
- Verify `NEXT_PUBLIC_SENTRY_DSN` is correct
- Check Sentry is enabled (production mode)
- Check source maps uploaded

---

### Performance Checks

#### 1. Page Load Speed

- **Dashboard:** Should load in <2 seconds
- **Transactions:** Should load in <3 seconds (includes Stripe API call)
- **Checkout:** Should load in <2 seconds

**Tools:**
- Chrome DevTools → Network tab
- Lighthouse audit
- Vercel Analytics (if enabled)

---

#### 2. API Response Times

```bash
# Test critical endpoints
time curl -X POST https://my.tradesitegenie.com/api/stripe/preview-proration \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newTier":"premium"}'
```

**Expected:** <500ms for most endpoints, <1s for Stripe API calls

---

## Rollback Procedure

### Quick Rollback (Vercel UI)

1. Go to Vercel Dashboard → Deployments
2. Find last known good deployment
3. Click three dots → "Promote to Production"
4. Confirm promotion
5. Verify rollback successful

**Time:** ~1 minute

---

### Rollback via Git

```bash
# Find last good commit
git log --oneline -10

# Create revert commit
git revert <bad-commit-sha>
git push origin main

# Or reset to last good commit (destructive)
git reset --hard <good-commit-sha>
git push --force origin main
```

**Time:** ~2-5 minutes (includes rebuild)

⚠️ **Warning:** Force push requires special permissions, use revert when possible.

---

## Incident Response Checklist

When production is down or degraded:

### Immediate Actions (First 5 minutes)

1. **Check Vercel status:**
   - Go to Vercel Dashboard
   - Check deployment status
   - Check function logs

2. **Check Sentry:**
   - Look for error spikes
   - Identify failing endpoints
   - Check error frequency

3. **Check external services:**
   - Stripe Dashboard → Webhooks (delivery status)
   - Firebase Console → Usage (quota issues?)
   - Upstash Console → Connection status

---

### Diagnosis Phase (Next 10 minutes)

4. **Identify scope:**
   - Is entire app down or specific feature?
   - Are all users affected or specific subset?
   - When did issue start?

5. **Check recent changes:**
   ```bash
   git log --since="2 hours ago" --oneline
   ```

6. **Review deployment logs:**
   - Vercel → Deployments → Click latest → View logs
   - Look for build warnings or errors

---

### Resolution Phase

7. **If caused by recent deploy:**
   - Rollback to last known good version (see Rollback Procedure)

8. **If external service issue:**
   - Check service status pages (Stripe, Firebase, Vercel)
   - Wait for service restoration
   - Monitor for automatic recovery

9. **If configuration issue:**
   - Review environment variables in Vercel
   - Check for missing or incorrect values
   - Redeploy after fixing

---

### Communication

10. **Notify stakeholders:**
    - Internal team via Slack
    - Customers if impact >15 minutes (via status page or email)

11. **Document incident:**
    - What happened
    - What was affected
    - How it was resolved
    - How to prevent recurrence

---

## Monitoring and Alerts

### Recommended Alerts

#### Vercel Deployment Failures

**Setup:**
1. Vercel Dashboard → Settings → Notifications
2. Enable "Deployment Failed" notifications
3. Add Slack webhook or email

**Trigger:** Any failed deployment to production

---

#### Sentry Error Spikes

**Setup:**
1. Sentry Dashboard → Alerts
2. Create "Error Spike" alert
3. Condition: >10 errors in 5 minutes
4. Action: Slack notification

**Trigger:** Sudden increase in errors (potential incident)

---

#### Stripe Webhook Failures

**Setup:**
1. Stripe Dashboard → Developers → Webhooks
2. Configure webhook for your endpoint
3. Enable "Email me when this endpoint is disabled"

**Trigger:** Multiple consecutive webhook delivery failures

---

### Health Monitoring

**Manual check:**
```bash
# Test health endpoint
curl https://my.tradesitegenie.com/api/hello

# Check status
curl -I https://my.tradesitegenie.com
```

**Expected:**
- HTTP 200 response
- Response time <500ms

**Recommended:** Set up uptime monitoring (Pingdom, UptimeRobot, etc.)

---

## Database Migration Strategy

### Current Approach (Manual)

**Firestore schema changes:**
1. Document changes in [DATA_MODELS.md](./DATA_MODELS.md)
2. Write migration script in `/scripts/migrations/` (if needed)
3. Test on development Firebase project
4. Manually run in production
5. Monitor for errors

**Limitations:**
- No automated migrations
- No rollback mechanism
- Manual execution required

**Example migration script template:**

```typescript
// scripts/migrations/001-add-payment-method-field.ts
import { adminDb } from '../lib/firebase/admin';

async function migrate() {
  const usersRef = adminDb.collection('users');
  const snapshot = await usersRef.get();
  
  console.log(`Migrating ${snapshot.size} users...`);
  
  const batch = adminDb.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    if (!doc.data().paymentMethod) {
      batch.update(doc.ref, { paymentMethod: null });
      count++;
    }
  });
  
  await batch.commit();
  console.log(`✅ Migrated ${count} users`);
}

migrate().catch(console.error);
```

**TBD:** Implement automated migration system with versioning and rollbacks.

---

## Vercel-Specific Configuration

### Build Settings

**Build Command:** `npm run build` (default)

**Output Directory:** `.next` (default)

**Install Command:** `npm install` (default)

**Node.js Version:** 18.x (or latest LTS)

---

### Function Configuration

**Timeout:** 10 seconds (default, sufficient for most routes)

**Memory:** 1024 MB (default)

**Region:** `iad1` (Washington DC) or closest to Firebase region

**Increase if needed:**
- Webhook processing timeout → 15 seconds
- Invoice retrieval timeout → 15 seconds

---

### Environment Variable Encryption

Vercel automatically encrypts all environment variables. Sensitive values are:
- Never logged in build output
- Never exposed in client bundle (unless `NEXT_PUBLIC_` prefix)
- Only accessible to server functions

---

## Pre-Deploy Checklist

Copy this checklist for each deployment:

### Code Quality

- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] No linter errors (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No console errors/warnings in browser

### Testing

- [ ] Manual testing of critical flows completed
- [ ] Test scripts pass (if applicable)
- [ ] No breaking changes for existing users

### Configuration

- [ ] All required environment variables set in Vercel
- [ ] Webhook URLs updated if domain changed
- [ ] DNS configured for custom domain (if applicable)

### Documentation

- [ ] CHANGELOG.md updated with changes
- [ ] API_INDEX.md updated if new endpoints
- [ ] DATA_MODELS.md updated if schema changes

### Communication

- [ ] Team notified of deployment
- [ ] Rollback plan identified
- [ ] Monitoring dashboards open (Sentry, Vercel, Stripe)

---

## Post-Deploy Checklist

Run within 15 minutes of deployment:

### Automated Checks

- [ ] Vercel build succeeded (check Deployments tab)
- [ ] No build warnings or errors
- [ ] Source maps uploaded to Sentry
- [ ] All functions deployed successfully

### Manual Smoke Tests

- [ ] Home page loads: `https://my.tradesitegenie.com`
- [ ] Signin page loads: `https://my.tradesitegenie.com/signin`
- [ ] Health check: `https://my.tradesitegenie.com/api/hello`
- [ ] Dashboard loads for authenticated user
- [ ] No errors in browser console
- [ ] No errors in Sentry (first 5 minutes)

### Integration Tests

- [ ] Stripe webhook test event succeeds
- [ ] Firebase Auth sign-in works
- [ ] Firestore reads/writes work
- [ ] Slack notification test succeeds (if configured)

### Performance Checks

- [ ] Lighthouse score >90 (run on dashboard)
- [ ] API response times <1s
- [ ] Page load times <3s

---

## Rollback Criteria

Roll back deployment immediately if:

- ✅ Build failed
- ✅ Critical functionality broken (signin, dashboard, checkout)
- ✅ >5 errors per minute in Sentry
- ✅ API response times >5 seconds
- ✅ Database writes failing
- ✅ Payment processing broken

Do NOT roll back for:

- ❌ Minor UI issues (fix forward)
- ❌ Non-critical feature bugs (fix forward)
- ❌ Warnings in logs (investigate, then fix forward)

---

## Multi-Region Considerations

**Current deployment:** Single region (US East - `iad1`)

**Future considerations:**
- Vercel Edge Functions for global distribution
- Firebase multi-region Firestore (requires migration)
- Stripe region-specific processing

**TBD:** Multi-region deployment strategy as customer base grows.

---

## Disaster Recovery

### Scenario 1: Complete Vercel Outage

**Fallback:** Vercel has >99.9% uptime, full outage rare.

**Steps:**
1. Check Vercel status page
2. No immediate action needed (wait for restoration)
3. Consider CDN failover for static pages (TBD)

**Prevention:** TBD - Implement multi-cloud or static fallback pages.

---

### Scenario 2: Firebase Outage

**Fallback:** Firebase auth and Firestore unavailable.

**Steps:**
1. Check Firebase status page
2. Enable maintenance mode (TBD - not implemented)
3. Wait for Firebase restoration
4. Verify data integrity after restoration

**Prevention:** TBD - Implement read replicas or backup auth provider.

---

### Scenario 3: Stripe Outage

**Fallback:** Payment processing unavailable, but app still accessible.

**Impact:**
- Users can't update payment methods
- Users can't upgrade/downgrade subscriptions
- Existing subscriptions continue normally

**Steps:**
1. Check Stripe status page
2. Display maintenance banner (TBD)
3. Queue failed operations for retry (TBD)

**Prevention:** Stripe has >99.99% uptime, full outage extremely rare.

---

### Scenario 4: Data Loss/Corruption

**Backups:**
- **Firestore:** Automatic daily backups by Firebase (enterprise plan)
- **Stripe:** Data retained by Stripe, can restore subscriptions
- **Firebase Auth:** User accounts retained

**Recovery:**
1. Identify scope of data loss
2. Contact Firebase support for restore (if backup available)
3. Reconcile Firestore with Stripe data via script
4. Notify affected users if necessary

**Prevention:**
- TBD - Implement daily backup verification
- TBD - Export critical data to external storage

---

## Deployment Frequency

**Recommended cadence:**
- **Hotfixes:** As needed (security, critical bugs)
- **Features:** Weekly or bi-weekly
- **Dependencies:** Monthly (security updates)

**Best practices:**
- Deploy during low-traffic hours (early morning US time)
- Avoid deployments on Fridays (limited support over weekend)
- Batch small changes to reduce deployment frequency

---

## Cross-References

- **Environment setup:** [SETUP.md](./SETUP.md)
- **Environment variables:** [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- **Security checklist:** [SECURITY_MODEL.md](./SECURITY_MODEL.md)
- **Testing strategy:** [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)
- **Troubleshooting:** [ERRORS_AND_TROUBLESHOOTING.md](./ERRORS_AND_TROUBLESHOOTING.md)

---

**Last Updated:** February 2026  
**Next Review:** After implementing automated testing or CI/CD improvements
