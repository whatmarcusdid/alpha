# Preview Proration API Documentation

## Overview

The `/api/stripe/preview-proration` endpoint calculates what a user will be charged (upgrade) or credited (downgrade) when switching subscription plans **WITHOUT actually making the change**. This allows users to see the financial impact before committing to a plan change.

---

## Endpoint

```
POST /api/stripe/preview-proration
```

**Authentication:** Required (Firebase Auth token via `Authorization: Bearer <token>`)  
**Rate Limit:** 60 requests/minute per IP (`generalLimiter`)

---

## Request

### Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <firebase-auth-token>"
}
```

### Body
```json
{
  "newTier": "essential" | "advanced" | "premium"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `newTier` | string | Yes | The target subscription tier |

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "preview": {
    "amountDue": 1200.00,
    "credit": 0,
    "subtotal": 2999.00,
    "prorationCredit": -1799.00,
    "tax": 0,
    "isUpgrade": true,
    "isDowngrade": false,
    "currentTier": "advanced",
    "newTier": "premium",
    "renewalDate": "2026-06-15T00:00:00.000Z",
    "lineItems": [
      {
        "description": "Unused time on Advanced Plan",
        "amount": -450.00
      },
      {
        "description": "Premium Plan (prorated)",
        "amount": 1650.00
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `amountDue` | number | Amount the user needs to pay today (0 for downgrades) |
| `credit` | number | Credit amount applied for downgrades (0 for upgrades) |
| `subtotal` | number | New plan's full annual price |
| `prorationCredit` | number | Credit from unused time on current plan (negative = credit) |
| `tax` | number | Tax amount (if applicable) |
| `isUpgrade` | boolean | True if moving to a higher tier |
| `isDowngrade` | boolean | True if moving to a lower tier |
| `currentTier` | string | User's current subscription tier |
| `newTier` | string | Target subscription tier |
| `renewalDate` | string | ISO date when subscription renews/ends |
| `lineItems` | array | Detailed breakdown of charges and credits |

---

## Error Responses

### 400 Bad Request - No Active Subscription
```json
{
  "success": false,
  "error": "No active subscription found"
}
```

### 400 Bad Request - Invalid Tier
```json
{
  "success": false,
  "error": "Invalid tier specified"
}
```

### 400 Bad Request - Already on Plan
```json
{
  "success": false,
  "error": "You are already on this plan"
}
```

### 404 Not Found - User Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests. Please try again in 60 seconds.",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Stripe error: <error message>"
}
```

---

## Usage Examples

### Example 1: Preview Upgrade (Advanced → Premium)

**Request:**
```typescript
const response = await fetch('/api/stripe/preview-proration', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    newTier: 'premium',
  }),
});

const data = await response.json();
```

**Response:**
```json
{
  "success": true,
  "preview": {
    "amountDue": 1200.00,
    "credit": 0,
    "subtotal": 2999.00,
    "prorationCredit": -1799.00,
    "tax": 0,
    "isUpgrade": true,
    "isDowngrade": false,
    "currentTier": "advanced",
    "newTier": "premium",
    "renewalDate": "2026-06-15T00:00:00.000Z",
    "lineItems": [
      {
        "description": "Unused time on Advanced Plan",
        "amount": -899.50
      },
      {
        "description": "Premium Plan (Jun 15, 2025 - Jun 15, 2026)",
        "amount": 2099.50
      }
    ]
  }
}
```

**Interpretation:**
- User is upgrading from Advanced ($1,799/year) to Premium ($2,999/year)
- They get credit of $899.50 for unused time on Advanced
- They pay $1,200.00 today for the prorated Premium plan
- Total = $2,999 - $1,799 credit = $1,200 due today

---

### Example 2: Preview Downgrade (Premium → Essential)

**Request:**
```typescript
const response = await fetch('/api/stripe/preview-proration', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    newTier: 'essential',
  }),
});

const data = await response.json();
```

**Response:**
```json
{
  "success": true,
  "preview": {
    "amountDue": 0,
    "credit": 2100.00,
    "subtotal": 899.00,
    "prorationCredit": -2100.00,
    "tax": 0,
    "isUpgrade": false,
    "isDowngrade": true,
    "currentTier": "premium",
    "newTier": "essential",
    "renewalDate": "2026-06-15T00:00:00.000Z",
    "lineItems": [
      {
        "description": "Unused time on Premium Plan",
        "amount": -2500.00
      },
      {
        "description": "Essential Plan (Jun 15, 2025 - Jun 15, 2026)",
        "amount": 400.00
      }
    ]
  }
}
```

**Interpretation:**
- User is downgrading from Premium ($2,999/year) to Essential ($899/year)
- They have $2,500 credit for unused Premium time
- Essential plan costs $400 prorated
- They owe $0 today and have $2,100 credit applied to future invoices

---

## Integration Example (React Component)

```typescript
import { useState } from 'react';

function PlanUpgradePreview({ newTier, authToken }: Props) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/preview-proration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ newTier }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch preview');
      }

      setPreview(data.preview);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Calculating...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!preview) return <button onClick={fetchPreview}>Show Preview</button>;

  return (
    <div className="preview-summary">
      <h3>Plan Change Preview</h3>
      
      <div className="pricing-breakdown">
        <p>Current Plan: {preview.currentTier}</p>
        <p>New Plan: {preview.newTier}</p>
        
        {preview.isUpgrade && (
          <>
            <h4>Amount Due Today: ${preview.amountDue.toFixed(2)}</h4>
            <p>You'll be charged immediately and your plan will upgrade.</p>
          </>
        )}
        
        {preview.isDowngrade && (
          <>
            <h4>Credit Applied: ${preview.credit.toFixed(2)}</h4>
            <p>Your credit will be applied to future invoices.</p>
          </>
        )}
      </div>

      <div className="line-items">
        <h4>Breakdown:</h4>
        {preview.lineItems.map((item: any, idx: number) => (
          <div key={idx}>
            <span>{item.description}</span>
            <span>${item.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <button onClick={handleConfirmChange}>
        {preview.isUpgrade ? 'Upgrade Now' : 'Downgrade Now'}
      </button>
    </div>
  );
}
```

---

## Technical Details

### Proration Behavior

**Upgrades (`isUpgrade: true`):**
- Uses `subscription_proration_behavior: 'always_invoice'`
- User is charged immediately for the difference
- `amountDue` shows what they pay today
- Credit from unused time is automatically applied

**Downgrades (`isDowngrade: false`):**
- Uses `subscription_proration_behavior: 'create_prorations'`
- Credit is stored for future invoices
- `amountDue` is 0 (nothing due today)
- `credit` field shows the stored credit amount

### Stripe API

This endpoint uses Stripe's `invoices.retrieveUpcoming()` method to preview the invoice:

```typescript
const preview = await stripe.invoices.retrieveUpcoming({
  customer: stripeCustomerId,
  subscription: stripeSubscriptionId,
  subscription_items: [{
    id: subscriptionItemId,
    price: newPriceId,
  }],
  subscription_proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
});
```

**Important:** This method does NOT modify the actual subscription - it only previews what would happen.

---

## Testing

### Manual Testing with cURL

```bash
# Get your Firebase auth token first
# Then test the preview:

curl -X POST http://localhost:3000/api/stripe/preview-proration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"newTier": "premium"}'
```

### Expected Scenarios

| Current Tier | New Tier | Expected Outcome |
|--------------|----------|------------------|
| Essential | Advanced | `amountDue > 0`, `isUpgrade: true` |
| Essential | Premium | `amountDue > 0`, `isUpgrade: true` |
| Advanced | Essential | `amountDue = 0`, `credit > 0`, `isDowngrade: true` |
| Premium | Essential | `amountDue = 0`, `credit > 0`, `isDowngrade: true` |
| Advanced | Advanced | Error: "You are already on this plan" |

---

## Security

- ✅ **Authentication Required:** Firebase Auth token must be valid
- ✅ **Rate Limited:** 60 requests/minute per IP
- ✅ **User Isolation:** Can only preview changes for authenticated user
- ✅ **Read-Only:** Does NOT modify any subscriptions
- ✅ **Error Tracking:** All errors logged to Sentry

---

## Related Endpoints

- **Actual Upgrade:** `POST /api/stripe/upgrade-subscription`
- **Actual Downgrade:** `POST /api/stripe/downgrade-subscription`
- **Reactivate Subscription:** `POST /api/stripe/reactivate-subscription`
- **Get Invoices:** `GET /api/stripe/get-invoices`

---

## Troubleshooting

### "No active subscription found"
**Cause:** User's subscription status is not 'active' in Firestore  
**Solution:** Check if subscription was canceled or expired

### "No Stripe customer ID found"
**Cause:** User document missing `stripeCustomerId` field  
**Solution:** Ensure user completed initial checkout and webhook updated Firestore

### "Subscription has no items"
**Cause:** Stripe subscription has no line items  
**Solution:** This indicates a data integrity issue - investigate Stripe dashboard

### Negative `amountDue`
**Cause:** Downgrade creates more credit than new plan costs  
**Solution:** This is expected - we set `amountDue` to 0 and show credit instead

---

## Changelog

### v1.0.0 (2025-02-09)
- Initial release
- Support for Essential, Advanced, Premium tier previews
- Upgrade and downgrade proration calculations
- Detailed line item breakdowns
