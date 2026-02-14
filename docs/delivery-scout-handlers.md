# Delivery Scout Handler Functions Documentation

This document provides detailed information about the Delivery Scout API handler functions, including lookup, update, and add operations.

## Table of Contents

1. [Overview](#overview)
2. [Lookup Handlers](#lookup-handlers)
3. [Update Handlers](#update-handlers)
4. [Add Handlers](#add-handlers)
4. [Idempotency](#idempotency)
5. [Validation Rules](#validation-rules)
6. [Testing Examples](#testing-examples)

---

## Overview

All handlers follow these patterns:
- ✅ Use `admin.firestore.FieldValue.serverTimestamp()` for all timestamps
- ✅ Use `updateDoc()` for updates (merge, don't overwrite)
- ✅ Use `addDoc()` for creating new documents in subcollections
- ✅ Validate required fields before writing
- ✅ Return auto-generated IDs for add operations
- ✅ Throw clear errors for validation failures

---

## Lookup Handlers

These handlers retrieve data (read-only, no Firestore writes).

### `handleLookupUser`

**Action:** `lookup_user`

**Purpose:** Retrieves a user's full Firestore document by email. Does not require `userId`.

**Idempotent:** ✅ Yes (read-only)

**Payload:**
```typescript
{
  email: string;  // Valid email required
}
```

**Required Fields:** `email`

**Example Request:**
```json
{
  "action": "lookup_user",
  "data": {
    "email": "mike@redmapleplumbing.com"
  }
}
```

**Example Success Response:**
```json
{
  "success": true,
  "action": "lookup_user",
  "data": {
    "userId": "abc123xyz",
    "email": "mike@redmapleplumbing.com",
    "displayName": "Mike Johnson",
    "subscription": { "tier": "essential", "status": "active" },
    "metrics": { "websiteTraffic": 1250 },
    "company": { "legalName": "Red Maple Plumbing LLC" }
  }
}
```

**Example Not Found Response:**
```json
{
  "success": false,
  "action": "lookup_user",
  "error": "No user found with email: customer@example.com"
}
```

**Firestore Operations:**
- Queries `users` collection: `where('email', '==', normalizedEmail).limit(1)`
- Email is normalized to lowercase before query
- Timestamp fields are serialized to ISO strings for JSON response

---

## Update Handlers

These handlers modify existing data in the user document or subcollections.

### 1. `handleUpdateMeeting`

**Action:** `update_meeting`

**Purpose:** Updates meeting information in the user document (`users/{userId}/meeting`)

**Idempotent:** ✅ Yes

**Payload:**
```typescript
{
  month?: string;
  day?: string;
  title?: string;
}
```

**Required Fields:** At least one field must be provided

**Example Request:**
```json
{
  "action": "update_meeting",
  "userId": "user123",
  "data": {
    "month": "March",
    "day": "15",
    "title": "Q1 Review Meeting"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Meeting updated successfully"
}
```

**Firestore Updates:**
- Merges into existing `meeting` object
- Sets `meeting.lastUpdated` to server timestamp
- Only updates provided fields

---

### 2. `handleUpdateMetrics`

**Action:** `update_metrics`

**Purpose:** Updates metrics in the user document (`users/{userId}/metrics`)

**Idempotent:** ✅ Yes

**Payload:**
```typescript
{
  websiteTraffic?: number;
  siteSpeedSeconds?: number;
  supportHoursRemaining?: number;
  maintenanceHoursRemaining?: number;
}
```

**Required Fields:** At least one metric field must be provided

**Validation:**
- All numeric fields must be non-negative numbers

**Example Request:**
```json
{
  "action": "update_metrics",
  "userId": "user123",
  "data": {
    "supportHoursRemaining": 5.5,
    "websiteTraffic": 1250
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Metrics updated successfully"
}
```

**Firestore Updates:**
- Merges into existing `metrics` object
- Sets `metrics.lastUpdated` to server timestamp
- Only updates provided fields
- Does NOT overwrite other metrics

---

### 3. `handleUpdateCompanyInfo`

**Action:** `update_company_info`

**Purpose:** Updates company information in the user document (`users/{userId}/company`)

**Idempotent:** ✅ Yes

**Payload:**
```typescript
{
  legalName?: string;
  websiteUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessService?: string;
  serviceArea?: string;
}
```

**Required Fields:** At least one company field must be provided

**Example Request:**
```json
{
  "action": "update_company_info",
  "userId": "user123",
  "data": {
    "legalName": "Acme Corporation",
    "city": "San Francisco",
    "state": "CA"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Company information updated successfully"
}
```

**Firestore Updates:**
- Merges into existing `company` object
- Sets `company.lastUpdated` to server timestamp
- Only updates provided fields

---

### 4. `handleUpdateSite`

**Action:** `update_site`

**Purpose:** Updates an existing site in the sites subcollection (`users/{userId}/sites/{siteId}`)

**Idempotent:** ✅ Yes

**Payload:**
```typescript
{
  siteId: string;         // REQUIRED
  name?: string;
  url?: string;
  status?: 'online' | 'offline' | 'maintenance';
  description?: string;
}
```

**Required Fields:** 
- `siteId` (to identify which site to update)
- At least one field to update

**Example Request:**
```json
{
  "action": "update_site",
  "userId": "user123",
  "data": {
    "siteId": "site456",
    "status": "online",
    "url": "https://newdomain.com"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Site updated successfully",
  "siteId": "site456"
}
```

**Error Handling:**
- Throws error if `siteId` not provided
- Throws error if site doesn't exist
- Sets `lastUpdated` to server timestamp

---

### 5. `handleUpdateTicket`

**Action:** `update_ticket`

**Purpose:** Updates an existing ticket in the top-level `supportTickets` collection (`supportTickets/{ticketId}`)

**Idempotent:** ✅ Yes

**Payload:**
```typescript
{
  ticketId: string;       // REQUIRED
  title?: string;
  description?: string;
  category?: 'General' | 'Billing' | 'Technical' | 'Sales' | 'Maintenance' | 'Emergency';
  status?: 'Open' | 'In Progress' | 'Awaiting Customer' | 'Resolved' | 'Closed' | 'Cancelled';
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  assignedAgentId?: string;
  assignedAgentName?: string;
  internalNotes?: string;
  resolvedAt?: string;    // ISO date string
  closedAt?: string;      // ISO date string
}
```

**Required Fields:**
- `ticketId` (to identify which ticket to update)
- At least one field to update

**Example Request:**
```json
{
  "action": "update_ticket",
  "userId": "user123",
  "data": {
    "ticketId": "ticket789",
    "status": "Resolved",
    "priority": "High",
    "internalNotes": "Fixed server configuration issue"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Ticket updated successfully",
  "ticketId": "ticket789"
}
```

**Error Handling:**
- Throws error if `ticketId` not provided
- Throws error if ticket doesn't exist
- Verifies ticket belongs to user (authorization check)
- Sets `lastUpdatedAt` to server timestamp
- Sets `resolvedAt`/`closedAt`/`cancelledAt` when status changes

**Integrations:** Sends Slack notification on changes; adds note to HelpScout conversation if linked

---

## Add Handlers

These handlers create new documents in subcollections with auto-generated IDs.

### 6. `handleAddSite`

**Action:** `add_site`

**Purpose:** Creates a new site in the sites subcollection (`users/{userId}/sites/{auto-id}`)

**Idempotent:** ❌ No - creates new document each time

**Payload:**
```typescript
{
  name: string;           // REQUIRED
  url: string;            // REQUIRED
  status?: 'online' | 'offline' | 'maintenance';
  description?: string;
}
```

**Required Fields:** `name`, `url`

**Example Request:**
```json
{
  "action": "add_site",
  "userId": "user123",
  "data": {
    "name": "Main Website",
    "url": "https://example.com",
    "status": "online",
    "description": "Primary customer-facing website"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Site added successfully",
  "siteId": "8xK3pQm9vLn2"
}
```

**Firestore Document Created:**
```javascript
{
  name: "Main Website",
  url: "https://example.com",
  status: "online",
  description: "Primary customer-facing website",
  createdAt: <server-timestamp>,
  lastUpdated: <server-timestamp>
}
```

**Default Values:**
- `status` defaults to `'online'` if not provided
- `description` defaults to empty string if not provided

---

### 7. `handleAddReport`

**Action:** `add_report`

**Purpose:** Creates a new report in the reports subcollection (`users/{userId}/reports/{auto-id}`)

**Idempotent:** ❌ No - creates new document each time

**Payload:**
```typescript
{
  title: string;          // REQUIRED
  type: 'monthly' | 'quarterly' | 'annual' | 'custom';  // REQUIRED
  content?: string;
  summary?: string;
  metrics?: Record<string, any>;
}
```

**Required Fields:** `title`, `type`

**Validation:**
- `type` must be one of: `monthly`, `quarterly`, `annual`, `custom`

**Example Request:**
```json
{
  "action": "add_report",
  "userId": "user123",
  "data": {
    "title": "Q1 2024 Performance Report",
    "type": "quarterly",
    "summary": "Strong growth across all metrics",
    "metrics": {
      "revenue": 125000,
      "newCustomers": 42
    }
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Report added successfully",
  "reportId": "7yJ2oNl8kMm1"
}
```

**Firestore Document Created:**
```javascript
{
  title: "Q1 2024 Performance Report",
  type: "quarterly",
  summary: "Strong growth across all metrics",
  content: "",
  metrics: { revenue: 125000, newCustomers: 42 },
  createdAt: <server-timestamp>,
  lastUpdated: <server-timestamp>
}
```

**Default Values:**
- `content` defaults to empty string if not provided
- `summary` defaults to empty string if not provided
- `metrics` defaults to empty object if not provided

---

### 8. `handleCreateTicket`

**Action:** `create_ticket`

**Purpose:** Creates a new ticket in the top-level `supportTickets` collection (`supportTickets/{auto-id}`)

**Idempotent:** ❌ No - creates new document each time

**Payload:**
```typescript
{
  title: string;          // REQUIRED
  description: string;     // REQUIRED
  category?: 'General' | 'Billing' | 'Technical' | 'Sales' | 'Maintenance' | 'Emergency';
  status?: 'Open' | 'In Progress' | 'Awaiting Customer' | 'Resolved' | 'Closed' | 'Cancelled';
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  channel?: 'Support Hub' | 'Email' | 'Phone' | 'Chat';
  assignedAgentId?: string;
  assignedAgentName?: string;
  customerEmail?: string;
  customerName?: string;
  internalNotes?: string;
}
```

**Required Fields:** `title`, `description`

**Validation:**
- `title` and `description` must be non-empty
- `priority` must be one of: `Critical`, `High`, `Medium`, `Low` (if provided)
- `status` must be one of: `Open`, `In Progress`, `Awaiting Customer`, `Resolved`, `Closed`, `Cancelled` (if provided)

**Example Request:**
```json
{
  "action": "create_ticket",
  "userId": "user123",
  "data": {
    "title": "Website login page not working",
    "description": "Users unable to sign in. Seeing 500 error.",
    "priority": "High",
    "category": "Technical"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "ticketId": "6wI1mKj7hLl0",
  "helpscoutConversationId": "12345678"
}
```

**Firestore Document Created:**
```javascript
{
  userId: "user123",
  createdByUserId: "user123",
  title: "Website login page not working",
  description: "Users unable to sign in. Seeing 500 error.",
  category: "Technical",
  status: "Open",
  priority: "High",
  channel: "Support Hub",
  customerEmail: "",  // Fetched from users/{userId} if not provided
  customerName: "",
  createdAt: <server-timestamp>,
  lastUpdatedAt: <server-timestamp>
}
```

**Default Values:**
- `category` defaults to `'General'` if not provided
- `status` defaults to `'Open'` if not provided
- `priority` defaults to `'Medium'` if not provided
- `channel` defaults to `'Support Hub'` if not provided

**Integrations:** Sends Slack notification; creates HelpScout conversation (if customer email available); stores `helpscoutConversationId` on ticket

---

## Idempotency

### Idempotent Operations (Safe to Retry)

These operations can be called multiple times with the same data and produce the same result:

✅ **Update Handlers:**
- `update_meeting`
- `update_metrics`
- `update_company_info`
- `update_site` (requires existing siteId)
- `update_ticket` (requires existing ticketId)

**Why:** They use `updateDoc()` which merges data. Calling twice with same data = same final state.

### Non-Idempotent Operations (Creates Duplicates)

These operations create new documents each time:

❌ **Add Handlers:**
- `add_site`
- `add_report`
- `create_ticket`

**Why:** They use `addDoc()` which auto-generates new IDs. Each call = new document.

**⚠️ Warning:** If Lindy AI retries a failed `add_*` operation, it may create duplicate entries. Consider implementing deduplication logic based on content/timestamps if this becomes an issue.

---

## Validation Rules

### Field Validation

| Handler | Required Fields | Validation Rules |
|---------|----------------|------------------|
| `update_meeting` | At least 1 field | - |
| `update_metrics` | At least 1 field | All numbers must be ≥ 0 |
| `update_company_info` | At least 1 field | - |
| `update_site` | `siteId` + at least 1 field | Site must exist |
| `update_ticket` | `ticketId` + at least 1 field | Ticket must exist |
| `add_site` | `name`, `url` | - |
| `add_report` | `title`, `type` | `type` must be valid enum value |
| `create_ticket` | `title`, `description` | `priority` must be Critical/High/Medium/Low |

### Error Messages

**Missing Required Field:**
```json
{
  "success": false,
  "error": "name and url are required fields"
}
```

**Invalid Value:**
```json
{
  "success": false,
  "error": "priority must be one of: Critical, High, Medium, Low"
}
```

**Document Not Found:**
```json
{
  "success": false,
  "error": "Site with ID site456 not found"
}
```

---

## Testing Examples

### Test Update Metrics (Idempotent)

```bash
# First call
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {
      "supportHoursRemaining": 5.5,
      "websiteTraffic": 1250
    }
  }'

# Second call (same data) - should be idempotent
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {
      "supportHoursRemaining": 5.5,
      "websiteTraffic": 1250
    }
  }'

# Result: Both calls succeed, final state is the same
```

### Test Create Ticket (Not Idempotent)

```bash
# First call
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "test123",
    "data": {
      "title": "Test ticket",
      "description": "Test description",
      "priority": "Medium"
    }
  }'
# Returns: { "success": true, "ticketId": "abc123" }

# Second call (same data)
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "test123",
    "data": {
      "title": "Test ticket",
      "description": "Test description",
      "priority": "Medium"
    }
  }'
# Returns: { "success": true, "ticketId": "xyz789" }

# Result: Two separate tickets created (NOT idempotent)
```

### Test Validation Errors

```bash
# Missing required field (name)
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_site",
    "userId": "test123",
    "data": {
      "url": "https://example.com"
    }
  }'
# Expected: 400 with "name and url are required fields"

# Invalid priority value
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "test123",
    "data": {
      "title": "Test",
      "description": "Test description",
      "priority": "P1"
    }
  }'
# Expected: 400 with "priority must be one of: Critical, High, Medium, Low"

# Negative number in metrics
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {
      "supportHoursRemaining": -5
    }
  }'
# Expected: 400 with "supportHoursRemaining must be a non-negative number"
```

---

## Timestamp Verification

All handlers use `admin.firestore.FieldValue.serverTimestamp()` which ensures:

✅ **Server-side timestamp** (not client-provided)
✅ **Consistent timezone** (UTC)
✅ **Accurate ordering** for queries

**Verify in Firestore Console:**
1. Create/update a document using the API
2. Check Firestore Console
3. Look for `lastUpdated` or `createdAt` fields
4. Should show actual server time, not client time

---

## Summary

| Handler | Idempotent | Creates ID | Updates Existing | Subcollection |
|---------|-----------|------------|------------------|---------------|
| `update_meeting` | ✅ | ❌ | ✅ | ❌ |
| `update_metrics` | ✅ | ❌ | ✅ | ❌ |
| `update_company_info` | ✅ | ❌ | ✅ | ❌ |
| `update_site` | ✅ | ❌ | ✅ | ✅ sites |
| `update_ticket` | ✅ | ❌ | ✅ | ✅ supportTickets (top-level) |
| `add_site` | ❌ | ✅ | ❌ | ✅ sites |
| `add_report` | ❌ | ✅ | ❌ | ✅ reports |
| `create_ticket` | ❌ | ✅ | ❌ | ✅ supportTickets (top-level) |

**Total:** 5 idempotent, 3 non-idempotent
