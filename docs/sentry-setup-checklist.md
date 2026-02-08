# Sentry Setup Checklist - TradeSiteGenie Dashboard

This checklist tracks the complete Sentry integration for error monitoring, performance tracking, and observability.

---

## 1. Configuration Files ✅

### Next.js Configuration
- [x] **`next.config.js`** - Uses ES module syntax with Sentry webpack plugin
  - Uses `import` instead of `require()`
  - Exports with `export default withSentryConfig()`
  - Includes webpack fallbacks for Firebase (fs, net, tls)
  - Sentry options: org, project, silent, widenClientFileUpload, reactComponentAnnotation, tunnelRoute, hideSourceMaps, disableLogger, automaticVercelMonitors

### Sentry Initialization Files
- [x] **`sentry.client.config.ts`** - Browser-side error tracking
  - ✅ DSN configured
  - ✅ Enabled only in production (`process.env.NODE_ENV === 'production'`)
  - ✅ Integrations: consoleLoggingIntegration, browserTracingIntegration
  - ✅ Traces sample rate: 1.0
  - ✅ Environment and release tracking
  - ✅ `beforeSend` filters: sessionId redaction, auth/id-token-expired errors
  
- [x] **`sentry.server.config.ts`** - Server-side error tracking
  - ✅ DSN configured
  - ✅ Enabled only in production
  - ✅ Integrations: consoleLoggingIntegration (warn, error only)
  - ✅ Traces sample rate: 1.0
  - ✅ Environment and release tracking
  - ✅ `beforeSend` filters: Stripe test mode errors, stripeCustomerId redaction, email redaction
  
- [x] **`sentry.edge.config.ts`** - Edge runtime tracking
  - ✅ DSN configured
  - ✅ Basic initialization for middleware/edge functions

### Instrumentation
- [x] **`instrumentation.ts`** - Ensures Sentry loads at app startup
  - Verify this file exists and properly imports Sentry configs

### Documentation
- [x] **`.cursor/rules/sentry.md`** - Best practices guide
  - Exception catching patterns
  - Tracing examples
  - Logger usage
  - Configuration guidelines
  - Privacy & security rules

---

## 2. Test Infrastructure ✅

### Test Page
- [x] **`app/sentry-example-page/page.tsx`**
  - ✅ Test Client Error button (throws JS error)
  - ✅ Test Server Error button (calls API route)
  - ✅ Send Test Message button (info-level message)
  - ✅ Test Performance Tracking button (creates span)
  - ✅ Instructions section with verification steps
  - ✅ TSG design system colors

### Test API Route
- [x] **`app/api/test-sentry-error/route.ts`**
  - ✅ Wrapped in `Sentry.startSpan` with `op: 'http.server'`
  - ✅ Span attribute: `test: true`
  - ✅ Throws intentional error
  - ✅ Captures exception with tags (endpoint, test)
  - ✅ Returns helpful next steps in response

---

## 3. Monitored API Routes ✅

### Stripe Endpoints

#### Get Session Details
- [x] **`app/api/stripe/get-session-details/route.ts`**
  - ✅ Wrapped in `Sentry.startSpan`
  - ✅ Span attributes: sessionId, paymentStatus, amount
  - ✅ Warning for missing sessionId
  - ✅ Warning for non-paid payment status
  - ✅ Exception tracking with tags and extra context

#### Create Setup Intent
- [x] **`app/api/stripe/create-setup-intent/route.ts`**
  - ✅ Wrapped in `Sentry.startSpan`
  - ✅ Span attributes: userId, customerId
  - ✅ Warning when no Stripe customer found
  - ✅ Exception tracking with userId context
  - ✅ Now properly attaches customer ID to SetupIntent

#### Downgrade to Safety Net
- [x] **`app/api/stripe/downgrade-to-safety-net/route.ts`**
  - ✅ Wrapped in `Sentry.startSpan`
  - ✅ Span attributes: userId, subscriptionId, immediate, currentTier
  - ✅ Warning for unauthorized access attempts
  - ✅ Info message when already on Safety Net
  - ✅ Success tracking with tier transition details
  - ✅ Exception tracking with full context

#### Stripe Webhook Handler
- [x] **`app/api/webhooks/stripe/route.ts`**
  - ✅ Wrapped in `Sentry.startSpan` with `op: 'webhook.stripe'`
  - ✅ Span attribute: eventType
  - ✅ New `checkout.session.completed` handler
  - ✅ Critical error when no user found for paid customer
  - ✅ Success tracking when subscription activated
  - ✅ Exception tracking in main catch block

---

## 4. Monitored Components ✅

### Payment Management
- [x] **`components/manage/UpdatePaymentMethodModalWrapper.tsx`**
  - ✅ Wrapped in `Sentry.startSpan` with `op: 'ui.action'`
  - ✅ Span attribute: userId
  - ✅ Exception tracking with component and action tags
  - ✅ User context (id, email) included in errors

---

## 5. Testing Procedures ✅

### Manual Testing

#### Initial Setup Test
- [ ] Navigate to `http://localhost:3000/sentry-example-page`
- [ ] Verify page loads with TSG design system
- [ ] Verify all 4 test buttons are visible

#### Client Error Test
- [ ] Click "Test Client Error" button
- [ ] Verify alert appears: "Client error sent to Sentry!"
- [ ] Open Sentry dashboard: https://tradesitegenie.sentry.io
- [ ] Navigate to **Issues**
- [ ] Find issue titled: "🧪 Test client error from TSG Dashboard!"
- [ ] Verify issue shows browser context and stack trace

#### Server Error Test
- [ ] Click "Test Server Error" button
- [ ] Verify alert with "Server error successfully captured"
- [ ] Check Sentry dashboard → Issues
- [ ] Find issue titled: "🧪 Test server error from TSG Dashboard API!"
- [ ] Verify issue shows server context
- [ ] Verify tags: `endpoint: test-sentry-error`, `test: true`

#### Message Test
- [ ] Click "Send Test Message" button
- [ ] Verify alert appears
- [ ] Check Sentry dashboard → Issues
- [ ] Find info-level message: "🧪 Test message from TSG Dashboard"
- [ ] Verify tags: `testType: message`, `source: sentry-example-page`

#### Performance Test
- [ ] Click "Test Performance Tracking" button
- [ ] Wait ~1 second for operation to complete
- [ ] Verify alert appears
- [ ] Check Sentry dashboard → **Performance**
- [ ] Find transaction: "🧪 TSG Dashboard Performance Test"
- [ ] Verify duration shows ~1 second

#### Stack Traces Verification
- [ ] In any error issue, click to view details
- [ ] Verify source maps are working (should show TypeScript code, not minified)
- [ ] Verify file paths are correct
- [ ] Verify line numbers match your source code

---

## 6. Environment Variables ✅

### Required in `.env.local` (Development)
- [ ] `SENTRY_AUTH_TOKEN` - For uploading source maps during build
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Public DSN for client-side tracking
- [ ] `SENTRY_ORG` - Your Sentry organization slug (`tradesitegenie`)
- [ ] `SENTRY_PROJECT` - Your Sentry project slug (`javascript-nextjs`)

### Required in Vercel (Production)
- [ ] `SENTRY_AUTH_TOKEN` - Set in Vercel project settings
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Already public in code, but verify it's correct
- [ ] `SENTRY_ORG` - Set in Vercel project settings
- [ ] `SENTRY_PROJECT` - Set in Vercel project settings
- [ ] `VERCEL_GIT_COMMIT_SHA` - Automatically provided by Vercel (for releases)

### Verification Steps
```bash
# Check local environment
echo $SENTRY_AUTH_TOKEN
echo $NEXT_PUBLIC_SENTRY_DSN

# Or in your terminal
cat .env.local | grep SENTRY
```

---

## 7. Production Deployment ✅

### Pre-Deployment
- [ ] Run `npm run build` locally
- [ ] Verify build succeeds without Sentry errors
- [ ] Check build output for "Sentry webpack plugin" messages
- [ ] Verify no warnings about missing environment variables

### Source Maps Upload
- [ ] After deployment, check Sentry dashboard → Settings → Source Maps
- [ ] Verify latest release appears with uploaded source maps
- [ ] Release name should match Git commit SHA
- [ ] Verify files list shows your built JavaScript files

### Post-Deployment Testing
- [ ] Visit production URL: `https://your-domain.com/sentry-example-page`
- [ ] Click "Test Client Error" button
- [ ] Verify error appears in Sentry with:
  - ✅ Correct environment tag (`production`)
  - ✅ Release tag (Git commit SHA)
  - ✅ Readable stack traces (not minified)
  - ✅ Source file links work

### Error Monitoring
- [ ] Trigger a real error in production (e.g., try to load invalid data)
- [ ] Verify error appears in Sentry within 30 seconds
- [ ] Check that stack trace is readable and source maps work
- [ ] Verify user context is included (if user was logged in)

### Performance Monitoring
- [ ] Navigate through production app
- [ ] Go to Sentry dashboard → Performance
- [ ] Verify transactions appear for:
  - Page loads
  - API calls
  - Webhook processing
- [ ] Check transaction durations are reasonable

---

## 8. Alert Configuration 🔔

### Recommended Alerts

#### Critical Errors
- [ ] **Alert Name**: "Critical Payment Errors"
  - **Trigger**: Any error with tag `critical: true`
  - **Actions**: Email + Slack notification
  - **Priority**: High

#### Webhook Failures
- [ ] **Alert Name**: "Stripe Webhook Failures"
  - **Trigger**: Errors with tag `webhook: true`
  - **Actions**: Email notification
  - **Priority**: Medium

#### High Error Rate
- [ ] **Alert Name**: "Error Spike"
  - **Trigger**: More than 10 errors in 5 minutes
  - **Actions**: Slack notification
  - **Priority**: High

### How to Set Up Alerts
1. Go to Sentry dashboard → Alerts
2. Click "Create Alert"
3. Choose "Issues" or "Metric Alert"
4. Configure conditions and actions
5. Test alert to verify delivery

---

## 9. Team Setup 👥

### Sentry Organization
- [ ] Invite team members to Sentry organization
- [ ] Assign appropriate roles (Admin, Member, Billing)
- [ ] Set up Slack integration for alerts

### Documentation
- [ ] Share this checklist with team
- [ ] Review `.cursor/rules/sentry.md` with developers
- [ ] Document any custom alert configurations

---

## 10. Ongoing Maintenance 🔧

### Weekly Tasks
- [ ] Review new issues in Sentry dashboard
- [ ] Resolve or ignore noise/expected errors
- [ ] Check error trends (increasing/decreasing)

### Monthly Tasks
- [ ] Review performance metrics
- [ ] Analyze slow transactions
- [ ] Update alert thresholds if needed
- [ ] Review and update `beforeSend` filters

### When Adding New Features
- [ ] Add `Sentry.captureException` to new try/catch blocks
- [ ] Wrap important operations in `Sentry.startSpan`
- [ ] Add meaningful tags and attributes
- [ ] Test error handling locally before deployment

---

## ✅ Completion Criteria

Your Sentry setup is **COMPLETE** when:

1. ✅ All configuration files exist and are properly configured
2. ✅ Test page works and generates errors in Sentry dashboard
3. ✅ All monitored API routes have Sentry tracing
4. ✅ Source maps upload successfully on build
5. ✅ Stack traces are readable (not minified) in production
6. ✅ Alerts are configured for critical errors
7. ✅ Team has access to Sentry dashboard

---

## 🔗 Quick Links

- **Sentry Dashboard**: https://tradesitegenie.sentry.io
- **Test Page**: `/sentry-example-page`
- **Documentation**: `.cursor/rules/sentry.md`
- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

## 📝 Notes

### Privacy Reminders
- Always truncate customer IDs: `.substring(0, 10) + '...'`
- Never send full emails to Sentry
- Redact sensitive data in `beforeSend` functions
- Use `[REDACTED]` placeholder for PII

### Performance Considerations
- Sentry is **disabled in development** to avoid noise
- 100% trace sampling is fine for low-medium traffic
- Reduce `tracesSampleRate` if costs become an issue
- Use tags to filter out noisy errors

### Common Issues
- **Source maps not uploading**: Check `SENTRY_AUTH_TOKEN` is set
- **Errors not appearing**: Verify Sentry is enabled in production
- **Minified stack traces**: Ensure source maps uploaded for that release
- **Too many errors**: Review `beforeSend` filters to exclude expected errors

---

**Last Updated**: February 8, 2026  
**Sentry Version**: @sentry/nextjs ^10.38.0  
**Next.js Version**: ^16.1.1
