# Get Invoices API - Documentation

## Overview

The `/api/stripe/get-invoices` endpoint fetches a user's invoice history from Stripe and returns it formatted for the TransactionsTable component.

**Purpose:** Display transaction history in the dashboard transactions page.

---

## API Endpoint

### Endpoint
```
GET /api/stripe/get-invoices
```

**Authentication:** Required (Firebase Auth via middleware)

**Rate Limiting:** 60 requests per minute per IP (`generalLimiter`)

**Request:** No body needed - userId comes from auth middleware

---

## Response Format

### Success (200)
```json
{
  "invoices": [
    {
      "id": "in_1234567890",
      "orderId": "#TSG-12345",
      "description": "Premium - Yearly Subscription",
      "date": "02-09-2026",
      "amount": "$4,990.00",
      "status": "completed",
      "paymentMethod": "•••• 4242",
      "invoiceUrl": "https://invoice.stripe.com/i/acct_xxx/test_xxx"
    },
    {
      "id": "in_0987654321",
      "orderId": "#TSG-12344",
      "description": "Advanced - Monthly Subscription",
      "date": "01-09-2026",
      "amount": "$249.00",
      "status": "completed",
      "paymentMethod": "•••• 4242",
      "invoiceUrl": "https://invoice.stripe.com/i/acct_xxx/test_xxx"
    }
  ]
}
```

### No Invoices (200)
```json
{
  "invoices": []
}
```

**Note:** Returns empty array (not an error) when:
- User has no Stripe customer ID (hasn't paid yet)
- User has no paid invoices

### Error Responses

| Status | Error | Condition |
|--------|-------|-----------|
| 404 | `User not found` | User document doesn't exist in Firestore |
| 500 | `Server configuration error` | Firebase Admin not initialized |
| 500 | `Failed to fetch invoices` | Stripe API error or other issues |

---

## Transaction Interface

Each invoice is mapped to this format:

```typescript
interface Transaction {
  id: string;              // Stripe invoice ID (e.g., "in_1234567890")
  orderId: string;         // Formatted order ID (e.g., "#TSG-12345")
  description: string;     // Invoice description (from line items)
  date: string;            // Formatted date "MM-DD-YYYY"
  amount: string;          // Formatted amount "$X,XXX.XX"
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;   // Card display (e.g., "•••• 4242")
  invoiceUrl?: string;     // Stripe hosted invoice URL
}
```

---

## Data Mapping

### Order ID Formatting
```typescript
// If invoice has number
invoice.number → "#TSG-{number}"  // e.g., "#TSG-12345"

// If no number (fallback)
invoice.id → "#{substring}"       // e.g., "#v_1Ab2Cd3Ef"
```

### Description
```typescript
// Priority order:
1. invoice.lines.data[0]?.description  // First line item description
2. "Genie Maintenance"                 // Fallback
```

### Date Format
```typescript
invoice.created (unix timestamp) → "MM-DD-YYYY"
// Example: 1707516000 → "02-09-2026"
```

### Amount Format
```typescript
invoice.amount_paid (cents) → "$X,XXX.XX"
// Examples:
// 24900 → "$249.00"
// 499000 → "$4,990.00"
```

### Status Mapping
```typescript
Stripe Status → Transaction Status
'paid'        → 'completed'
'open'        → 'pending'
'draft'       → 'pending'
'void'        → 'failed'
'uncollectible' → 'failed'
```

### Payment Method
```typescript
// Uses user's current payment method from Firestore
userData.paymentMethod?.last4 → "•••• {last4}"
// Example: "•••• 4242"

// Fallback if no payment method
"•••• ****"
```

**Note:** Shows current default card, not the card used for each specific transaction. This is an MVP approach - can be enhanced later to fetch actual payment method per invoice.

---

## Flow Diagram

```
1. Request received
   ↓
2. withAuthAndRateLimit middleware
   - Verify Firebase Auth token
   - Extract userId
   - Check rate limit (60/min)
   ↓
3. Get user from Firestore
   - Fetch user document
   - Extract stripeCustomerId
   ↓
4. Check Stripe Customer ID
   - If missing → return empty array
   - If present → continue
   ↓
5. Fetch invoices from Stripe
   - stripe.invoices.list()
   - Filter: status='paid', limit=50
   ↓
6. Map to Transaction format
   - Format order ID, date, amount
   - Get description from line items
   - Use current payment method display
   ↓
7. Return formatted invoices
```

---

## Integration Example

### Frontend Usage

```typescript
import { Transaction } from '@/components/transactions/TransactionsTable';
import { getAuth } from 'firebase/auth';

async function fetchInvoices(): Promise<Transaction[]> {
  try {
    // Get Firebase auth token
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const token = await user.getIdToken();

    // Call get-invoices API
    const response = await fetch('/api/stripe/get-invoices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch invoices');
    }

    return data.invoices;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
}
```

### In React Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { TransactionsTable, Transaction } from '@/components/transactions/TransactionsTable';

export default function TransactionsPage() {
  const [invoices, setInvoices] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      const data = await fetchInvoices();
      setInvoices(data);
      setLoading(false);
    }
    loadInvoices();
  }, []);

  if (loading) return <div>Loading...</div>;

  return <TransactionsTable transactions={invoices} />;
}
```

---

## Testing

### Test with curl

```bash
# Get your Firebase auth token (from browser console after logging in)
const token = await firebase.auth().currentUser.getIdToken();
console.log(token);

# Call the API
curl -X GET http://localhost:3001/api/stripe/get-invoices \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Expected Response (with invoices)
```json
{
  "invoices": [
    {
      "id": "in_xxx",
      "orderId": "#TSG-12345",
      "description": "Premium - Yearly Subscription",
      "date": "02-09-2026",
      "amount": "$4,990.00",
      "status": "completed",
      "paymentMethod": "•••• 4242",
      "invoiceUrl": "https://invoice.stripe.com/..."
    }
  ]
}
```

### Expected Response (no invoices)
```json
{
  "invoices": []
}
```

---

## Error Handling

### User Not Found
```bash
Status: 404
Response: { "error": "User not found" }
```

### Server Error
```bash
Status: 500
Response: { "error": "Failed to fetch invoices", "details": "..." }
```

### Rate Limit Exceeded
```bash
Status: 429
Response: { "error": "Too many requests. Please try again in 60 seconds." }
Headers: 
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1707516000
  Retry-After: 60
```

---

## Stripe API Details

### Invoice List Parameters
```typescript
stripe.invoices.list({
  customer: stripeCustomerId,  // Filter by customer
  limit: 50,                   // Max 50 invoices
  status: 'paid',             // Only paid invoices
})
```

### Why only 'paid' invoices?
- `paid` = Completed transactions (what users want to see)
- `open` = Awaiting payment (not relevant for history)
- `draft` = Not finalized (internal)
- `void` = Cancelled (could add later)
- `uncollectible` = Failed (could add later)

---

## Performance Considerations

### Caching Strategy
Currently no caching - fetches fresh data on each request.

**Future enhancement:**
```typescript
// Cache invoices for 5 minutes
const cacheKey = `invoices:${userId}`;
const cachedData = await redis.get(cacheKey);

if (cachedData) {
  return NextResponse.json({ invoices: JSON.parse(cachedData) });
}

// Fetch from Stripe...
await redis.setex(cacheKey, 300, JSON.stringify(invoices));
```

### Pagination
Currently limited to 50 invoices.

**Future enhancement:**
```typescript
// Add pagination parameters
?page=1&limit=20

// Stripe pagination
stripe.invoices.list({
  customer: customerId,
  limit: 20,
  starting_after: lastInvoiceId, // For next page
})
```

---

## Security

### ✅ Protected
- Firebase Auth required via middleware
- Rate limited (60 requests/min)
- User can only see their own invoices
- Sensitive data (customer ID) truncated in logs

### ✅ Privacy
- Only returns user's own invoices
- No other customer data exposed
- Invoice URLs are scoped to customer

---

## Monitoring & Logging

### Success Log
```
✅ Fetched 5 invoices for user abc123xyz456
```

### Sentry Success Event
```
Level: info
Message: "Invoices fetched successfully"
Extra: { userId, customerId (truncated), invoiceCount }
```

### Sentry Error Event
```
Level: error
Message: Exception details
Tags: { endpoint: 'get-invoices', stripe: 'true' }
Extra: { userId }
```

---

## Example Invoice Data

### Stripe Invoice Object (abbreviated)
```json
{
  "id": "in_1234567890",
  "number": "12345-0001",
  "created": 1707516000,
  "amount_paid": 499000,
  "status": "paid",
  "hosted_invoice_url": "https://invoice.stripe.com/i/acct_xxx/test_xxx",
  "lines": {
    "data": [
      {
        "description": "Premium - Yearly Subscription"
      }
    ]
  }
}
```

### Mapped Transaction
```json
{
  "id": "in_1234567890",
  "orderId": "#TSG-12345-0001",
  "description": "Premium - Yearly Subscription",
  "date": "02-09-2026",
  "amount": "$4,990.00",
  "status": "completed",
  "paymentMethod": "•••• 4242",
  "invoiceUrl": "https://invoice.stripe.com/i/acct_xxx/test_xxx"
}
```

---

## Edge Cases Handled

### No Stripe Customer ID
```
Scenario: User created but never paid
Response: { invoices: [] }
Status: 200 (not an error)
```

### No Payment Method in Firestore
```
Scenario: Payment method not stored yet
Payment Method Display: "•••• ****"
```

### Invoice Without Number
```
Scenario: Stripe invoice has no number field
Order ID: "#" + first 9 chars of invoice ID
```

### Invoice Without Line Items
```
Scenario: Invoice has no line items or description
Description: "Genie Maintenance"
```

---

## Future Enhancements

### 1. **Show Actual Card Used Per Transaction**
Instead of current default card, fetch the actual payment method used for each invoice:

```typescript
// Expand charge to get payment method details
const invoice = await stripe.invoices.retrieve(invoiceId, {
  expand: ['charge.payment_method']
});

const paymentMethod = invoice.charge?.payment_method;
const last4 = paymentMethod?.card?.last4;
```

**Trade-off:** More API calls, slower response

---

### 2. **Include All Invoice Statuses**
Currently only shows 'paid' invoices. Could add:
- Open invoices (awaiting payment)
- Failed invoices (payment failed)
- Refunded invoices

```typescript
stripe.invoices.list({
  customer: customerId,
  limit: 50,
  // Remove status filter to get all
})
```

---

### 3. **Pagination**
Support fetching older invoices:

```typescript
// Query parameters
GET /api/stripe/get-invoices?page=2&limit=20

// Stripe pagination
stripe.invoices.list({
  customer: customerId,
  limit: 20,
  starting_after: lastInvoiceId,
})
```

---

### 4. **Caching**
Cache invoice data for 5 minutes to reduce Stripe API calls:

```typescript
// Check cache first
const cached = await redis.get(`invoices:${userId}`);
if (cached) return JSON.parse(cached);

// Fetch and cache
const invoices = await fetchFromStripe();
await redis.setex(`invoices:${userId}`, 300, JSON.stringify(invoices));
```

---

## Related Files

| File | Purpose |
|------|---------|
| `/app/api/stripe/get-invoices/route.ts` | Invoice fetch API (this file) |
| `/components/transactions/TransactionsTable.tsx` | Displays invoices in table |
| `/app/dashboard/transactions/page.tsx` | Transactions page |
| `/lib/middleware/apiHandler.ts` | Auth middleware |
| `/lib/middleware/rateLimiting.ts` | Rate limiting |

---

## Summary

| Feature | Implementation |
|---------|---------------|
| **Endpoint** | `GET /api/stripe/get-invoices` |
| **Authentication** | Firebase Auth (required) |
| **Rate Limiting** | 60 requests/min (generalLimiter) |
| **Data Source** | Stripe Invoices API |
| **Filter** | Paid invoices only |
| **Limit** | 50 most recent invoices |
| **Format** | Transaction interface for TransactionsTable |
| **Error Handling** | Comprehensive with Sentry tracking |
| **Empty State** | Returns empty array (not error) |

The get-invoices API is ready to power your transactions dashboard! 🎉
