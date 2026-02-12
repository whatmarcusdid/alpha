# Delivery Scout API - Validation Guide

## Overview

All Delivery Scout API operations use **Zod** for runtime validation to ensure data integrity before writing to Firestore. This prevents malformed data from entering the database and provides clear error messages to API consumers.

---

## Required vs Optional Fields

### Update Meeting (`update_meeting`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `month` | string | ⚠️ At least one | Non-empty string |
| `day` | string | ⚠️ At least one | Non-empty string |
| `title` | string | ⚠️ At least one | Non-empty string |

### Update Metrics (`update_metrics`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `websiteTraffic` | number | ⚠️ At least one | ≥ 0 |
| `siteSpeedSeconds` | number | ⚠️ At least one | ≥ 0 |
| `supportHoursRemaining` | number | ⚠️ At least one | ≥ 0 |
| `maintenanceHoursRemaining` | number | ⚠️ At least one | ≥ 0 |

### Update Company Info (`update_company_info`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `legalName` | string | ⚠️ At least one | Non-empty string |
| `websiteUrl` | string | ⚠️ At least one | Valid URL format |
| `address` | string | ⚠️ At least one | Non-empty string |
| `city` | string | ⚠️ At least one | Non-empty string |
| `state` | string | ⚠️ At least one | Non-empty string |
| `zipCode` | string | ⚠️ At least one | Non-empty string |
| `businessService` | string | ⚠️ At least one | Non-empty string |
| `serviceArea` | string | ⚠️ At least one | Non-empty string |
| `email` | string | ⚠️ At least one | Valid email format |
| `phone` | string | ⚠️ At least one | Non-empty string |

### Add Site (`add_site`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ Yes | Non-empty string |
| `url` | string | ✅ Yes | Valid URL format |
| `status` | enum | ❌ No | `online`, `offline`, or `maintenance` |
| `description` | string | ❌ No | Any string (can be empty) |

### Update Site (`update_site`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `siteId` | string | ✅ Yes | Non-empty string |
| `name` | string | ⚠️ At least one | Non-empty string |
| `url` | string | ⚠️ At least one | Valid URL format |
| `status` | enum | ⚠️ At least one | `online`, `offline`, or `maintenance` |
| `description` | string | ⚠️ At least one | Any string (can be empty) |

### Add Report (`add_report`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | ✅ Yes | Non-empty string |
| `type` | enum | ✅ Yes | `monthly`, `quarterly`, `annual`, or `custom` |
| `content` | string | ❌ No | Any string (can be empty) |
| `summary` | string | ❌ No | Non-empty string if provided |
| `metrics` | object | ❌ No | Any key-value pairs |

### Create Ticket (`create_ticket`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | ✅ Yes | Non-empty string |
| `description` | string | ✅ Yes | Non-empty string |
| `category` | enum | ❌ No | `General`, `Billing`, `Technical`, `Sales`, `Maintenance`, `Emergency` |
| `status` | enum | ❌ No | `Open`, `In Progress`, `Awaiting Customer`, `Resolved`, `Closed`, `Cancelled` |
| `priority` | enum | ❌ No | `Critical`, `High`, `Medium`, `Low` |
| `channel` | enum | ❌ No | `Support Hub`, `Email`, `Phone`, `Chat` |
| `assignedAgentId` | string | ❌ No | Non-empty string if provided |
| `assignedAgentName` | string | ❌ No | Non-empty string if provided |
| `customerEmail` | string | ❌ No | Valid email format |
| `customerName` | string | ❌ No | Non-empty string if provided |
| `internalNotes` | string | ❌ No | Any string |

### Update Ticket (`update_ticket`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `ticketId` | string | ✅ Yes | Non-empty string |
| `title` | string | ⚠️ At least one | Non-empty string if provided |
| `description` | string | ⚠️ At least one | Any string (can be empty) |
| `category` | enum | ⚠️ At least one | `General`, `Billing`, `Technical`, `Sales`, `Maintenance`, `Emergency` |
| `status` | enum | ⚠️ At least one | `Open`, `In Progress`, `Awaiting Customer`, `Resolved`, `Closed`, `Cancelled` |
| `priority` | enum | ⚠️ At least one | `Critical`, `High`, `Medium`, `Low` |
| `assignedAgentId` | string | ⚠️ At least one | Non-empty string if provided |
| `assignedAgentName` | string | ⚠️ At least one | Non-empty string if provided |
| `internalNotes` | string | ⚠️ At least one | Any string |
| `resolvedAt` | string | ⚠️ At least one | ISO date string |
| `closedAt` | string | ⚠️ At least one | ISO date string |

---

## Validation Error Responses

When validation fails, the API returns a **400 Bad Request** with detailed error messages:

```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "field: Detailed error message"
  ]
}
```

---

## Example Validations

### ✅ Valid: Update Metrics

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "user123",
    "data": {
      "websiteTraffic": 1250,
      "supportHoursRemaining": 5.5
    }
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Metrics updated successfully"
}
```

---

### ❌ Invalid: Negative Number

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "user123",
    "data": {
      "websiteTraffic": -100
    }
  }'
```

**Response (200 with error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "websiteTraffic: Must be a non-negative number (0 or greater)"
  ]
}
```

---

### ❌ Invalid: Empty Title

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "user123",
    "data": {
      "title": "",
      "description": "Test description",
      "priority": "High"
    }
  }'
```

**Response (200 with error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "title: Cannot be empty"
  ]
}
```

---

### ❌ Invalid: Wrong Priority

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "user123",
    "data": {
      "title": "Site down",
      "description": "Site is unavailable",
      "priority": "P1"
    }
  }'
```

**Response (200 with error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "priority: Must be one of: Critical, High, Medium, Low"
  ]
}
```

---

### ❌ Invalid: Wrong Data Type

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "user123",
    "data": {
      "websiteTraffic": "1250"
    }
  }'
```

**Response (200 with error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "websiteTraffic: Expected number, received string"
  ]
}
```

---

### ❌ Invalid: Bad Email Format

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_company_info",
    "userId": "user123",
    "data": {
      "email": "not-an-email"
    }
  }'
```

**Response (200 with error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "email: Email must be valid"
  ]
}
```

---

### ❌ Invalid: Bad URL Format

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_site",
    "userId": "user123",
    "data": {
      "name": "Main Site",
      "url": "not-a-url"
    }
  }'
```

**Response (200 with error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "url: Must be a valid URL (e.g., https://example.com)"
  ]
}
```

---

### ❌ Invalid: Missing Required Fields

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_site",
    "userId": "user123",
    "data": {
      "url": "https://example.com"
    }
  }'
```

**Response (200 with error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "name: Cannot be empty"
  ]
}
```

---

### ❌ Invalid: No Update Fields

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_meeting",
    "userId": "user123",
    "data": {}
  }'
```

**Response (200 with error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "At least one field (month, day, or title) must be provided"
  ]
}
```

---

### ✅ Valid: Create Ticket with Low Priority

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "user123",
    "data": {
      "title": "Update documentation",
      "description": "Add examples to README",
      "priority": "Low",
      "assignedAgentName": "marcus"
    }
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "ticketId": "8xK3pQm9vLn2"
}
```

---

### ✅ Valid: Update Ticket Status to In Progress

**Request:**
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_ticket",
    "userId": "user123",
    "data": {
      "ticketId": "ticket789",
      "status": "In Progress",
      "assignedAgentName": "marcus"
    }
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket updated successfully",
  "ticketId": "ticket789"
}
```

---

## Validation Rules Summary

### String Validations
- **Non-empty:** Must have at least 1 character
- **Email:** Must match standard email format (e.g., `user@example.com`)
- **URL:** Must be valid URL with protocol (e.g., `https://example.com`)

### Number Validations
- **Non-negative:** Must be ≥ 0
- **Positive:** Must be > 0 (currently not used)
- **Type:** Must be actual number, not string

### Enum Validations
- **Priority:** Must be exactly `Critical`, `High`, `Medium`, or `Low`
- **Ticket Status:** Must be exactly `Open`, `In Progress`, `Awaiting Customer`, `Resolved`, `Closed`, or `Cancelled`
- **Site Status:** Must be exactly `online`, `offline`, or `maintenance`
- **Report Type:** Must be exactly `monthly`, `quarterly`, `annual`, or `custom`

### Object Validations
- **At least one field:** For update operations, at least one field must be provided
- **Required fields:** For create operations, specific fields must be present

---

## Testing Validation

### Test Invalid Priority Values

```bash
# Test each invalid priority
for priority in "HIGH" "URGENT" "P1" "P2" "1" "low"; do
  echo "Testing priority: $priority"
  curl -X POST http://localhost:3000/api/delivery-scout \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"create_ticket\",
      \"userId\": \"test123\",
      \"data\": {
        \"title\": \"Test\",
        \"description\": \"Test description\",
        \"priority\": \"$priority\"
      }
    }"
  echo ""
done
```

**Expected:** All should return validation error with "Must be one of: Critical, High, Medium, Low"

### Test Numeric Validation

```bash
# Test negative numbers
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {
      "websiteTraffic": -100,
      "supportHoursRemaining": -5.5
    }
  }'
```

**Expected:** Validation errors for both fields

### Test Email Validation

```bash
# Test invalid email formats
for email in "notanemail" "user@" "@domain.com" "user @domain.com"; do
  echo "Testing email: $email"
  curl -X POST http://localhost:3000/api/delivery-scout \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"update_company_info\",
      \"userId\": \"test123\",
      \"data\": {
        \"email\": \"$email\"
      }
    }"
  echo ""
done
```

**Expected:** All should return "Email must be valid" error

---

## Benefits of Validation

✅ **Prevents bad data:** Invalid data never reaches Firestore
✅ **Clear error messages:** Developers know exactly what's wrong
✅ **Type safety:** Runtime checks match TypeScript types
✅ **Early failure:** Catches errors before expensive database operations
✅ **Self-documenting:** Schema definitions serve as API documentation
✅ **Reduced debugging:** Less time spent tracking down data issues

---

## Implementation Details

### Zod Schemas Location
All validation schemas are defined in `/types/delivery-scout.ts`

### Validation Function
The `validatePayload()` helper function:
- Takes a Zod schema and data
- Returns parsed data if valid
- Returns user-friendly error array if invalid

### Integration
Each handler function:
1. Validates input using Zod schema
2. Returns validation errors immediately if invalid
3. Proceeds with Firestore operations if valid

### Error Format
Validation errors always include:
- `success: false`
- `error: "Validation failed"`
- `validationErrors: string[]` - Array of specific errors

---

## Next Steps

Consider adding:
1. **Rate limiting** - Prevent validation abuse
2. **Request logging** - Track validation failures
3. **Metric tracking** - Monitor which validations fail most often
4. **Custom error codes** - Machine-readable error identifiers
