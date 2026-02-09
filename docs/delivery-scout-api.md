# Delivery Scout API Documentation

## Overview

The Delivery Scout API endpoint (`/api/delivery-scout`) accepts authenticated POST requests from Lindy AI and routes actions to Firestore handler functions.

**Endpoint:** `POST /api/delivery-scout`

## Authentication

The endpoint uses **API key authentication** (not Firebase Auth) via the `DELIVERY_SCOUT_API_KEY` environment variable.

### Setup

1. Generate a secure API key:
   ```bash
   openssl rand -base64 32
   ```

2. Add to your `.env.local`:
   ```
   DELIVERY_SCOUT_API_KEY=your_generated_api_key_here
   ```

3. Configure Lindy AI with the API key

### Request Format

**Headers:**
```
Authorization: Bearer <your-api-key>
Content-Type: application/json
```

**Body:**
```json
{
  "action": "create_ticket",
  "userId": "user123",
  "data": {
    "subject": "Website is down",
    "priority": "P1",
    "description": "Users cannot access the site"
  }
}
```

## Available Actions

See [Handler Functions Documentation](./delivery-scout-handlers.md) for detailed information about each handler.

### Update Actions (Idempotent)

#### 1. `update_meeting`
Updates meeting information in the user document.

**Required:** At least one field (month, day, title)

**Example:**
```json
{
  "action": "update_meeting",
  "userId": "user123",
  "data": { "month": "March", "day": "15", "title": "Q1 Review" }
}
```

#### 2. `update_metrics`
Updates metrics in the user document.

**Required:** At least one metric field

**Example:**
```json
{
  "action": "update_metrics",
  "userId": "user123",
  "data": { "supportHoursRemaining": 5.5, "websiteTraffic": 1250 }
}
```

#### 3. `update_company_info`
Updates company information in the user document.

**Required:** At least one company field

**Example:**
```json
{
  "action": "update_company_info",
  "userId": "user123",
  "data": { "legalName": "Acme Corp", "city": "San Francisco" }
}
```

#### 4. `update_site`
Updates an existing site in the sites subcollection.

**Required:** `siteId` + at least one field to update

**Example:**
```json
{
  "action": "update_site",
  "userId": "user123",
  "data": { "siteId": "site456", "status": "online" }
}
```

#### 5. `update_ticket`
Updates an existing ticket in the tickets subcollection.

**Required:** `ticketId` + at least one field to update

**Example:**
```json
{
  "action": "update_ticket",
  "userId": "user123",
  "data": { "ticketId": "ticket789", "status": "resolved" }
}
```

### Add Actions (Not Idempotent - Creates New Documents)

#### 6. `add_site`
Creates a new site in the sites subcollection.

**Required:** `name`, `url`

**Example:**
```json
{
  "action": "add_site",
  "userId": "user123",
  "data": { "name": "Main Site", "url": "https://example.com", "status": "online" }
}
```

**Response includes:** `siteId` (auto-generated)

#### 7. `add_report`
Creates a new report in the reports subcollection.

**Required:** `title`, `type`

**Example:**
```json
{
  "action": "add_report",
  "userId": "user123",
  "data": { "title": "Q1 Report", "type": "quarterly", "summary": "Strong growth" }
}
```

**Response includes:** `reportId` (auto-generated)

#### 8. `create_ticket`
Creates a new ticket in the tickets subcollection.

**Required:** `subject`, `priority`

**Example:**
```json
{
  "action": "create_ticket",
  "userId": "user123",
  "data": { "subject": "Login broken", "priority": "P1", "description": "Users can't sign in" }
}
```

**Response includes:** `ticketId` (auto-generated)

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Action completed successfully",
  // Additional fields depending on action (e.g., ticketId, meetingId)
}
```

### Error Responses

**Authentication Failed (401):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Invalid Request (400):**
```json
{
  "success": false,
  "error": "Missing or invalid \"userId\" field"
}
```

**Server Error (500):**
```json
{
  "success": false,
  "error": "An unexpected error occurred"
}
```

## Edge Cases Handled

### 1. Missing `userId`
**Request:**
```json
{
  "action": "create_ticket",
  "data": { "subject": "Test" }
}
```
**Response:** 400 with `"Missing or invalid \"userId\" field"`

### 2. Invalid Action
**Request:**
```json
{
  "action": "invalid_action",
  "userId": "user123",
  "data": {}
}
```
**Response:** 400 with list of valid actions

### 3. Malformed JSON
**Request:** (Invalid JSON body)
**Response:** 400 with `"Invalid JSON in request body"`

### 4. Missing Required Fields
**Request:**
```json
{
  "action": "create_ticket",
  "userId": "user123",
  "data": { "description": "Test" }
}
```
**Response:** 500 with `"subject and priority are required fields"`

### 5. Document Not Found
**Request:**
```json
{
  "action": "update_site",
  "userId": "user123",
  "data": { "siteId": "nonexistent", "status": "online" }
}
```
**Response:** 500 with `"Site with ID nonexistent not found"`

### 6. Invalid Value
**Request:**
```json
{
  "action": "update_metrics",
  "userId": "user123",
  "data": { "supportHoursRemaining": -5 }
}
```
**Response:** 500 with `"supportHoursRemaining must be a non-negative number"`

### 7. Missing Authorization Header
**Request:** (No Authorization header)
**Response:** 401 with `"Unauthorized"`

### 8. Wrong HTTP Method
**Request:** `GET /api/delivery-scout`
**Response:** 405 with `"Method not allowed"`

### 9. Firebase Admin Not Initialized
**Scenario:** Missing Firebase Admin credentials
**Response:** 500 with `"Server configuration error"`

## Testing

### Test Commands

#### 1. Test Authentication (Should Fail)
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Content-Type: application/json" \
  -d '{"action":"create_ticket","userId":"test123","data":{"subject":"Test"}}'
```
**Expected:** 401 Unauthorized

#### 2. Test Update Metrics (Idempotent)
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test-user-123",
    "data": {
      "supportHoursRemaining": 5.5,
      "websiteTraffic": 1250
    }
  }'
```
**Expected:** 200 with success response

#### 3. Test Create Ticket (Not Idempotent)
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "test-user-123",
    "data": {
      "subject": "Site down",
      "priority": "P1",
      "description": "Users cannot access the site"
    }
  }'
```
**Expected:** 200 with success response including `ticketId`

#### 4. Test Add Site (Creates New Document)
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_site",
    "userId": "test-user-123",
    "data": {
      "name": "Main Website",
      "url": "https://example.com",
      "status": "online"
    }
  }'
```
**Expected:** 200 with success response including auto-generated `siteId`

#### 5. Test Update Company Info
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_company_info",
    "userId": "test-user-123",
    "data": {
      "legalName": "Acme Corporation",
      "city": "San Francisco",
      "state": "CA"
    }
  }'
```
**Expected:** 200 with success response

#### 6. Test Invalid JSON
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```
**Expected:** 400 with "Invalid JSON in request body"

#### 7. Test Missing userId
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "data": {"subject": "Test"}
  }'
```
**Expected:** 400 with "Missing or invalid \"userId\" field"

#### 8. Test Invalid Action
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "invalid_action",
    "userId": "test123",
    "data": {}
  }'
```
**Expected:** 400 with "Invalid action" message

#### 9. Test Missing Required Fields
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_site",
    "userId": "test123",
    "data": {"url": "https://example.com"}
  }'
```
**Expected:** 500 with "name and url are required fields"

#### 10. Test Wrong HTTP Method
```bash
curl -X GET http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```
**Expected:** 405 Method not allowed

### Testing in Production

Replace `http://localhost:3000` with your production URL:
```bash
curl -X POST https://your-domain.com/api/delivery-scout \
  -H "Authorization: Bearer YOUR_PRODUCTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Security Features

1. **API Key Authentication:** Prevents unauthorized access
2. **Request Validation:** Validates all inputs before processing
3. **Error Masking:** Doesn't expose internal errors in production
4. **Fail Secure:** Denies access if API key not configured
5. **Rate Limiting:** (Recommended to add in future iteration)

## Implementation Status

✅ **Complete:** All 8 handler functions fully implemented with:
- Input validation for required fields
- Firebase Admin SDK integration
- Server-side timestamps using `admin.firestore.FieldValue.serverTimestamp()`
- Proper error handling
- Merge updates (never overwrite existing data)
- Auto-generated IDs for subcollection documents

See [Handler Functions Documentation](./delivery-scout-handlers.md) for complete details.

## File Structure

```
/app/api/delivery-scout/
  └── route.ts              # Main API endpoint

/types/
  └── delivery-scout.ts      # Type definitions

/docs/
  └── delivery-scout-api.md  # This file
```

## Firebase Pattern Note

⚠️ **Important:** This API route uses **Firebase Admin SDK**, NOT the browser-only client SDK.

- ✅ API routes (server-side): Use `@/lib/firebase/admin`
- ❌ API routes (server-side): DO NOT use `@/lib/firebase` (client SDK)
- ✅ Client components: Use `@/lib/firebase` with browser-only pattern
- ❌ Client components: DO NOT use Admin SDK

The browser-only pattern (`typeof window !== 'undefined'`) is ONLY for client-side code. API routes always run on the server and should use Firebase Admin SDK directly.
