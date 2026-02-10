# Create User Handler - Implementation Summary

## What Was Added

### ✅ New Action: `create_user`

Creates a new TSG customer account in Firestore with all required fields, proper defaults, and tier-based hour allocation.

**Special Note:** This is the only action that does NOT require a `userId` in the request (since we're creating the user).

---

## Files Modified

### 1. `/types/delivery-scout.ts`
- Added `SubscriptionTierSchema` enum ('essential' | 'advanced' | 'premium')
- Added `CreateUserSchema` Zod schema with validation
- Added `CreateUserPayload` TypeScript type
- Added `'create_user'` to `DeliveryScoutAction` union type
- Added `create_user: CreateUserSchema` to `ValidationSchemas` map

### 2. `/app/api/delivery-scout/route.ts`
- Updated `validateRequestBody()` to allow missing `userId` for `create_user` action
- Added `handleCreateUser()` function with tier-based hour allocation
- Updated switch statement to handle `'create_user'` case
- Added `'create_user'` to `validActions` array
- Added `CreateUserPayload` to imports

---

## Key Features

### Tier-Based Hour Allocation

| Tier | Support Hours | Maintenance Hours |
|------|--------------|-------------------|
| **Essential** | 3 hrs/month | 6 hrs/month |
| **Advanced** | 8 hrs/month | 12 hrs/month |
| **Premium** | 15 hrs/month | 20 hrs/month |

### Required Fields
- `email` (valid email format)
- `displayName` (non-empty string)
- `tier` ('essential', 'advanced', or 'premium')

### Optional Company Fields
- `companyName`, `websiteUrl`, `businessService`, `serviceArea`
- `yearFounded`, `numEmployees`
- `address`, `city`, `state`, `zipCode`

### Auto-Generated Fields
- `userId` (Firestore auto-ID, returned in response)
- All timestamps using `serverTimestamp()`
- Default metrics: websiteTraffic=0, siteSpeedSeconds=0
- Default subscription: status='active', startDate=now, endDate=null

---

## Example Request

```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_user",
    "data": {
      "email": "john@blueridgeplumbing.com",
      "displayName": "John Smith",
      "tier": "advanced",
      "companyName": "Blue Ridge Plumbing",
      "websiteUrl": "https://blueridgeplumbing.com",
      "businessService": "Plumbing",
      "serviceArea": "Baltimore, MD"
    }
  }'
```

**Note:** No `userId` in the request body!

---

## Example Response

```json
{
  "success": true,
  "message": "User created successfully",
  "userId": "8xK3pQm9vLn2"
}
```

---

## Quick Test

```bash
# Test locally (replace YOUR_API_KEY with your actual key)
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_user",
    "data": {
      "email": "test@example.com",
      "displayName": "Test User",
      "tier": "advanced",
      "companyName": "Test Company"
    }
  }' \
  -i
```

### Expected Response:
- Status: `200 OK`
- Body: `{ "success": true, "message": "User created successfully", "userId": "..." }`

### Verify in Firestore:
1. Go to Firebase Console → Firestore
2. Navigate to `users` collection
3. Find the document with the returned `userId`
4. Confirm all fields are present:
   - ✅ email, displayName, createdAt
   - ✅ subscription (tier='advanced', status='active', timestamps)
   - ✅ metrics (supportHoursRemaining=8, maintenanceHoursRemaining=12)
   - ✅ company (legalName, websiteUrl, etc.)
   - ✅ meeting=null

---

## Validation Examples

### ❌ Missing Email
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_user",
    "data": {
      "displayName": "John Smith",
      "tier": "advanced"
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": ["email: Required"]
}
```

---

### ❌ Invalid Tier
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_user",
    "data": {
      "email": "john@example.com",
      "displayName": "John Smith",
      "tier": "pro"
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": ["tier: Must be one of: essential, advanced, premium"]
}
```

---

### ❌ Invalid Email Format
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_user",
    "data": {
      "email": "not-an-email",
      "displayName": "John Smith",
      "tier": "advanced"
    }
  }'
```

**Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": ["email: Must be a valid email address"]
}
```

---

## Verification Checklist

- [x] TypeScript compiles without errors (`npx tsc --noEmit`)
- [x] No linter errors
- [x] Handler function follows existing patterns
- [x] Zod validation schema matches requirements
- [x] Tier-based hours allocation (3/8/15 for support)
- [x] All timestamps use `serverTimestamp()`
- [x] Auto-generated userId returned in response
- [x] Special handling for missing userId in request
- [x] Documentation created

---

## Important Notes

### 🔑 Special Behavior

1. **No userId required** - Unlike all other actions, `create_user` does NOT require a `userId` field in the request.

2. **Auto-generated ID** - Firestore creates a unique ID automatically.

3. **ID in response** - The `userId` is returned so you know what was created.

### ⚠️ Not Idempotent

Calling `create_user` multiple times will create multiple users. To prevent duplicates:
- Check if email already exists before calling
- Implement deduplication in your workflow

### 🧪 Testing

Use the test script or curl commands above to verify the implementation works correctly.

---

## Full Documentation

See `/docs/create-user-handler.md` for complete documentation including:
- All validation rules
- Full Firestore document structure
- Additional examples
- Use cases
- Code implementation details

---

## Next Steps

1. ✅ Implementation complete
2. 🧪 Test with curl command above
3. 🔍 Verify in Firestore console
4. 📝 Update Lindy AI workflow to use create_user
5. 🤖 Add to test suite if needed

Ready to use! 🎉
