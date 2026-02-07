# VALIDATION TESTING GUIDE

**Phase 2C:** Priority 1 Routes Validation Testing  
**Date:** February 7, 2026  
**Status:** Ready for manual testing

---

## 🎯 TEST SCENARIOS

All tests validate the new Zod schemas applied to Priority 1 routes.

---

## TEST 1: Valid Checkout Request ✅

**Route:** `POST /api/checkout`  
**Expected:** 200 OK with `sessionId`

### Request
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "premium",
    "billingCycle": "annual",
    "couponCode": "SAVE20"
  }'
```

### Expected Response
```json
{
  "success": true,
  "sessionId": "cs_test_..."
}
```

### What's Being Validated
- ✅ `tier` = "premium" (valid enum value)
- ✅ `billingCycle` = "annual" (valid enum value)
- ✅ `couponCode` = "SAVE20" → transformed to uppercase automatically

---

## TEST 2: Invalid Tier ❌

**Route:** `POST /api/checkout`  
**Expected:** 400 Bad Request with detailed field error

### Request
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "invalid-tier",
    "billingCycle": "annual"
  }'
```

### Expected Response
```json
{
  "error": "Validation failed",
  "fields": {
    "tier": [
      "Invalid tier. Must be: essential, advanced, premium, or safety-net"
    ]
  }
}
```

### What's Being Tested
- ❌ `tier` = "invalid-tier" (not in enum)
- ✅ Should return specific error message pointing to the field

---

## TEST 3: Missing Required Field ❌

**Route:** `POST /api/checkout`  
**Expected:** 400 Bad Request with field error

### Request
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "premium"
  }'
```

### Expected Response
```json
{
  "error": "Validation failed",
  "fields": {
    "billingCycle": [
      "Required"
    ]
  }
}
```

### What's Being Tested
- ❌ Missing `billingCycle` (required field)
- ✅ Should identify which field is missing

---

## TEST 4: Invalid Email Format ❌

**Route:** `POST /api/checkout/create-subscription`  
**Expected:** 400 Bad Request (or 401 if no auth token)

**Note:** This route requires Firebase authentication. You'll need a valid Firebase ID token.

### Request
```bash
curl -X POST http://localhost:3000/api/checkout/create-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "email": "not-an-email",
    "tier": "premium",
    "billingCycle": "annual"
  }'
```

### Expected Response (with valid auth token)
```json
{
  "error": "Validation failed",
  "fields": {
    "email": [
      "Invalid email format"
    ]
  }
}
```

### Expected Response (without auth token)
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### What's Being Tested
- ❌ `email` = "not-an-email" (invalid email format)
- ✅ Should validate email format before processing

---

## TEST 5: Email Transformation ✅

**Route:** `POST /api/checkout/create-subscription`  
**Expected:** Email automatically lowercased and trimmed

### Request
```bash
curl -X POST http://localhost:3000/api/checkout/create-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "email": "  USER@EXAMPLE.COM  ",
    "tier": "premium",
    "billingCycle": "annual"
  }'
```

### Expected Behavior
- Input: `"  USER@EXAMPLE.COM  "`
- After validation: `"user@example.com"` (trimmed and lowercased)
- Stripe customer created with normalized email

---

## TEST 6: Coupon Code Transformation ✅

**Route:** `POST /api/checkout`  
**Expected:** Coupon code uppercased automatically

### Request
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "premium",
    "billingCycle": "annual",
    "couponCode": "  save20  "
  }'
```

### Expected Behavior
- Input: `"  save20  "`
- After validation: `"SAVE20"` (trimmed and uppercased)
- Stripe retrieves coupon with uppercase code

---

## TEST 7: Invalid Payment Method ID ❌

**Route:** `POST /api/checkout/create-subscription`  
**Expected:** 400 Bad Request

### Request
```bash
curl -X POST http://localhost:3000/api/checkout/create-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "email": "user@example.com",
    "tier": "premium",
    "billingCycle": "annual",
    "paymentMethodId": "invalid_id"
  }'
```

### Expected Response
```json
{
  "error": "Validation failed",
  "fields": {
    "paymentMethodId": [
      "Invalid payment method ID format"
    ]
  }
}
```

### What's Being Tested
- ❌ `paymentMethodId` = "invalid_id" (doesn't start with "pm_")
- ✅ Should validate Stripe ID format

---

## TEST 8: Upgrade Subscription ✅

**Route:** `POST /api/stripe/upgrade-subscription`  
**Expected:** 200 OK (if valid upgrade path)

### Request
```bash
curl -X POST http://localhost:3000/api/stripe/upgrade-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "newTier": "premium"
  }'
```

### Expected Response (if currently on essential/advanced)
```json
{
  "success": true,
  "subscription": {
    "tier": "premium",
    "status": "active",
    "currentPeriodEnd": "2027-02-07T...",
    "proratedAmount": 123.45
  }
}
```

### Expected Response (if invalid upgrade path)
```json
{
  "success": false,
  "error": "Invalid upgrade path. You can only upgrade to a higher tier."
}
```

### What's Being Tested
- ✅ `newTier` validated as valid tier enum (Zod)
- ✅ Upgrade path validation (business logic - preserved)

---

## TEST 9: Invalid JSON ❌

**Route:** Any route  
**Expected:** 400 Bad Request

### Request
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d 'not valid json'
```

### Expected Response
```json
{
  "error": "Invalid JSON in request body"
}
```

### What's Being Tested
- ❌ Malformed JSON
- ✅ `validateRequestBody` utility catches JSON parse errors

---

## 🧪 HOW TO RUN TESTS

### Option 1: Manual Testing with curl
1. Ensure dev server is running: `npm run dev`
2. Copy/paste test commands from above
3. Verify responses match expected output

### Option 2: Automated Testing Script
Create `test-validation.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== TEST 1: Valid Request ==="
curl -s -X POST $BASE_URL/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"premium","billingCycle":"annual","couponCode":"SAVE20"}' | jq '.'

echo -e "\n=== TEST 2: Invalid Tier ==="
curl -s -X POST $BASE_URL/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"invalid","billingCycle":"annual"}' | jq '.'

echo -e "\n=== TEST 3: Missing Field ==="
curl -s -X POST $BASE_URL/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"premium"}' | jq '.'

echo -e "\n=== TEST 4: Invalid JSON ==="
curl -s -X POST $BASE_URL/api/checkout \
  -H "Content-Type: application/json" \
  -d 'not valid json' | jq '.'
```

Run with: `bash test-validation.sh`

---

## ✅ VALIDATION CHECKLIST

For each test, verify:

- [ ] Response status code is correct (200, 400, 401)
- [ ] Error messages are user-friendly and specific
- [ ] Field-level errors identify exact problems
- [ ] Data transformations work (uppercase, lowercase, trim)
- [ ] Business logic still executes correctly
- [ ] No breaking changes for valid requests

---

## 🐛 TROUBLESHOOTING

### Server Not Responding
```bash
# Check if server is running
curl http://localhost:3000/api/hello

# Restart server
npm run dev
```

### Port Conflicts
If port 3000 is in use, check which port Next.js started on:
```bash
# Look for line in terminal:
# "⚠ Port 3000 is in use, using port 3001 instead"

# Update BASE_URL in tests
BASE_URL="http://localhost:3001"
```

### Corrupted Cache
```bash
# Clear Next.js cache and restart
rm -rf .next
npm run dev
```

---

## 📊 EXPECTED TEST RESULTS

| Test | Expected Status | Expected Behavior |
|------|----------------|-------------------|
| Valid request | 200 | Returns sessionId/success |
| Invalid tier | 400 | Returns field error for tier |
| Missing field | 400 | Returns field error for missing field |
| Invalid email | 400 | Returns field error for email |
| Email transformation | 200 | Email normalized (lowercase, trimmed) |
| Coupon transformation | 200 | Coupon uppercased |
| Invalid PM ID | 400 | Returns field error for paymentMethodId |
| Valid upgrade | 200 | Returns updated subscription |
| Invalid JSON | 400 | Returns JSON parse error |

---

## 🎯 SUCCESS CRITERIA

Validation is working correctly if:

1. ✅ Valid requests succeed (200 status)
2. ✅ Invalid requests fail with 400 status
3. ✅ Error messages are specific and helpful
4. ✅ Field-level errors identify exact problems
5. ✅ Data transformations work automatically
6. ✅ Business logic executes as expected
7. ✅ No breaking changes for existing clients

---

**Status:** Ready for testing  
**Note:** Requires running dev server on http://localhost:3000 (or 3001)
