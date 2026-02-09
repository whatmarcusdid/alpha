# Slack New User Notification API

## Overview

The `/api/notifications/new-user` endpoint sends a Slack notification when a new customer signs up for TradeSiteGenie.

**Purpose:** Notify the TSG team immediately when a new customer completes signup so they can onboard the customer.

**Integration Point:** Called from `SignUpForm.tsx` after successful user creation and payment.

---

## API Endpoint

### Endpoint
```
POST /api/notifications/new-user
```

### Request Format

```json
{
  "userId": "abc123xyz456",
  "email": "john@example.com",
  "displayName": "John Smith",
  "tier": "premium",
  "billingCycle": "yearly",
  "amount": 1499
}
```

---

## Request Body Fields

| Field | Type | Required | Valid Values | Description |
|-------|------|----------|--------------|-------------|
| `userId` | string | ✅ Yes | Any string | Firestore user ID |
| `email` | string | ✅ Yes | Any string | Customer email address |
| `displayName` | string | ✅ Yes | Any string | Customer's full name |
| `tier` | string | ✅ Yes | `essential`, `advanced`, `premium` | Subscription tier |
| `billingCycle` | string | ✅ Yes | `monthly`, `yearly` | Billing frequency |
| `amount` | number | ✅ Yes | Positive number | Amount paid (in dollars) |

---

## Response Format

### Success (200)
```json
{
  "success": true,
  "message": "Notification sent"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": "Missing required field: email"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Failed to send notification"
}
```

---

## Slack Message Format

The notification appears in Slack with this format:

```
🎉 *New Customer Signup*

*Customer:* John Smith
*Email:* john@example.com
*Plan:* Premium - Yearly ($1,499)
*Signed up:* Feb 9, 2026 at 2:45 PM EST
*User ID:* `abc123xyz456`

New customer - john@example.com, John Smith, Company Name TBD, signed up for Premium plan
```

### Message Components

1. **Emoji + Header** - 🎉 *New Customer Signup*
2. **Customer Details** - Name and email
3. **Plan Info** - Tier, billing cycle, and amount
4. **Timestamp** - When the signup occurred
5. **User ID** - Firestore document ID (in code block for easy copying)
6. **Agent Trigger Line** - Last line triggers TSG Delivery Scout agent

---

## Environment Variables

### Required

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**How to get this:**
1. Go to https://api.slack.com/apps
2. Select your Slack app (or create one)
3. Navigate to "Incoming Webhooks"
4. Enable incoming webhooks
5. Add new webhook to your channel (e.g., `#new-signups`)
6. Copy the webhook URL

**Security:**
- This is a server-only secret (no `NEXT_PUBLIC_` prefix)
- Never commit this to version control
- Store in `.env.local` (dev) and Vercel environment variables (prod)

---

## Integration Example

### In SignUpForm.tsx

```typescript
// After successful signup and payment
const handleEmailSignUp = async (e: React.FormEvent) => {
  try {
    // ... create user and process payment ...
    
    // Send Slack notification
    await fetch('/api/notifications/new-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        email: user.email,
        displayName: name,
        tier: selectedTier,
        billingCycle: selectedBillingCycle,
        amount: finalAmount,
      }),
    });
    
    // Don't wait for notification - proceed with redirect
    router.push('/dashboard');
  } catch (error) {
    // Handle error
  }
};
```

**Note:** The notification is fire-and-forget. Don't block the user signup flow if it fails.

---

## Error Handling

### Client-Side (SignUpForm)

```typescript
// Fire-and-forget approach
fetch('/api/notifications/new-user', {
  method: 'POST',
  body: JSON.stringify(data),
}).catch(error => {
  // Log error but don't show to user
  console.error('Failed to send notification:', error);
  // User signup is still successful - continue
});
```

### Server-Side (API Route)

The API route handles these error scenarios:

| Error | Status | Response |
|-------|--------|----------|
| Invalid JSON | 400 | `Invalid JSON in request body` |
| Missing field | 400 | `Missing required field: [field]` |
| Invalid tier | 400 | `Invalid tier: [value]` |
| Invalid billing cycle | 400 | `Invalid billingCycle: [value]` |
| Invalid amount | 400 | `Amount must be a positive number` |
| Webhook not configured | 500 | `Notification service not configured` |
| Slack API error | 500 | `Failed to send notification` |
| Unexpected error | 500 | `Internal server error` |

All errors are logged server-side with `console.error()` but internal details are not exposed to clients.

---

## Testing

### Test Locally

```bash
curl -X POST http://localhost:3000/api/notifications/new-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "email": "test@example.com",
    "displayName": "Test User",
    "tier": "advanced",
    "billingCycle": "monthly",
    "amount": 249
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification sent"
}
```

**Expected in Slack:**
```
🎉 *New Customer Signup*

*Customer:* Test User
*Email:* test@example.com
*Plan:* Advanced - Monthly ($249)
*Signed up:* Feb 9, 2026 at 3:15 PM EST
*User ID:* `test123`

New customer - test@example.com, Test User, Company Name TBD, signed up for Advanced plan
```

---

### Test Validation Errors

#### Missing Required Field

```bash
curl -X POST http://localhost:3000/api/notifications/new-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "email": "test@example.com"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Missing required field: displayName"
}
```

---

#### Invalid Tier

```bash
curl -X POST http://localhost:3000/api/notifications/new-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "email": "test@example.com",
    "displayName": "Test User",
    "tier": "pro",
    "billingCycle": "monthly",
    "amount": 249
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Invalid tier: pro. Must be one of: essential, advanced, premium"
}
```

---

#### Invalid Amount

```bash
curl -X POST http://localhost:3000/api/notifications/new-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "email": "test@example.com",
    "displayName": "Test User",
    "tier": "advanced",
    "billingCycle": "monthly",
    "amount": -100
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Amount must be a positive number"
}
```

---

## Tier & Billing Cycle Mapping

### Tier Names

| Input | Display Name | Monthly Price | Yearly Price |
|-------|-------------|---------------|--------------|
| `essential` | Essential | $99 | $999 |
| `advanced` | Advanced | $249 | $2,490 |
| `premium` | Premium | $499 | $4,990 |

### Billing Cycle

| Input | Display Name |
|-------|-------------|
| `monthly` | Monthly |
| `yearly` | Yearly |

---

## Amount Formatting

The API automatically formats amounts with:
- Dollar sign: `$`
- Thousands separator: `,`
- No decimal places for whole numbers: `$1,499` (not `$1,499.00`)

**Examples:**
- `99` → `$99`
- `249` → `$249`
- `999` → `$999`
- `1499` → `$1,499`
- `2490` → `$2,490`

---

## Security Considerations

### ✅ What's Protected

- Slack webhook URL is stored in environment variables (not exposed)
- Input validation prevents invalid data from being sent
- Error messages don't expose internal implementation details
- Webhook failures are logged server-side only

### ⚠️ What's NOT Protected

- No API authentication (internal endpoint only)
- Assumes caller (SignUpForm) provides valid data
- Fire-and-forget approach means no retry logic

**Why no authentication?**
This is an internal API endpoint called from server-side code (SignUpForm after user creation). It's not exposed to external users, so API key authentication is unnecessary.

If you need to call this from external systems, consider adding API key authentication similar to the Delivery Scout endpoint.

---

## Monitoring & Logging

### Success Logs

```
✅ Slack notification sent successfully: {
  email: 'john@example.com',
  tier: 'premium',
  billingCycle: 'yearly'
}
```

### Error Logs

```
❌ SLACK_WEBHOOK_URL environment variable not configured
❌ Slack webhook returned error: 404 Not Found
❌ Error sending Slack notification: [error details]
❌ Unexpected error in new-user notification: [error details]
```

**Recommendation:** Set up error monitoring (Sentry) to alert when notifications fail.

---

## Troubleshooting

### Notification not appearing in Slack

1. **Check webhook URL is configured**
   ```bash
   # In terminal
   echo $SLACK_WEBHOOK_URL
   
   # Should print: https://hooks.slack.com/services/...
   ```

2. **Check webhook is valid**
   ```bash
   curl -X POST $SLACK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"text":"Test message"}'
   
   # Should return: ok
   ```

3. **Check server logs**
   - Look for `❌` error emojis in server console
   - Check for 4xx/5xx responses from Slack webhook

4. **Verify webhook channel**
   - Go to Slack app settings
   - Check which channel the webhook posts to
   - Ensure you're looking at the correct channel

---

### Getting 400 errors

Check the error message - it will tell you exactly what's wrong:
- `Missing required field: [field]` - Add the missing field
- `Invalid tier: [value]` - Use `essential`, `advanced`, or `premium`
- `Invalid billingCycle: [value]` - Use `monthly` or `yearly`
- `Amount must be a positive number` - Ensure amount > 0

---

### Getting 500 errors

1. **`Notification service not configured`**
   - Add `SLACK_WEBHOOK_URL` to `.env.local` (dev) or Vercel env vars (prod)
   - Restart dev server after adding env var

2. **`Failed to send notification`**
   - Check server logs for specific Slack API error
   - Verify webhook URL is still valid (may expire)
   - Check Slack app has webhook enabled

---

## Production Deployment

### Vercel Environment Variables

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `SLACK_WEBHOOK_URL`
   - **Value:** Your Slack webhook URL
   - **Environment:** Production, Preview, Development (select all)
3. Click "Save"
4. Redeploy your application

### Testing in Production

```bash
curl -X POST https://my.tradesitegenie.com/api/notifications/new-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "prod-test-123",
    "email": "production-test@example.com",
    "displayName": "Production Test",
    "tier": "essential",
    "billingCycle": "monthly",
    "amount": 99
  }'
```

Check your Slack channel for the notification!

---

## Next Steps

1. ✅ API route created at `/app/api/notifications/new-user/route.ts`
2. 🔧 Add `SLACK_WEBHOOK_URL` to `.env.local`
3. 🧪 Test locally with curl command
4. 🔗 Integrate into `SignUpForm.tsx`
5. 🚀 Deploy to production
6. 📊 Set up error monitoring

---

## Code Reference

### Complete File Structure

```
app/api/notifications/new-user/
└── route.ts (304 lines)
    ├── Type definitions
    ├── Helper functions
    │   ├── validateRequestBody()
    │   ├── capitalize()
    │   ├── formatTimestamp()
    │   ├── formatSlackMessage()
    │   └── sendSlackNotification()
    └── Route handlers
        ├── POST() - Main handler
        └── GET() - Returns 405
```

### Key Functions

```typescript
// Validate incoming request
validateRequestBody(body: any): string | null

// Format message for Slack
formatSlackMessage(data: NotificationRequest): string

// Send to Slack webhook
sendSlackNotification(webhookUrl: string, message: string): Promise<boolean>
```

---

## Summary

| Feature | Implementation |
|---------|---------------|
| **Endpoint** | `POST /api/notifications/new-user` |
| **Authentication** | None (internal API) |
| **Required Fields** | userId, email, displayName, tier, billingCycle, amount |
| **Environment Variable** | `SLACK_WEBHOOK_URL` |
| **Response Format** | JSON with `success` and `message`/`error` |
| **Error Handling** | Validates input, logs errors, returns 400/500 status codes |
| **Integration** | Called from `SignUpForm.tsx` after signup |
| **Use Case** | Notify team of new customer signups |

The notification endpoint is ready to use! 🎉
