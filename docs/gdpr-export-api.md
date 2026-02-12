# GDPR Data Export API

## Overview

The Data Export API allows authenticated users to download a complete JSON export of their account data for GDPR compliance (Right to Data Portability). The export includes user profile, company info, subscription, metrics, settings, sites, support tickets, and reports.

**Endpoint:** POST `/api/user/export-data`  
**Authentication:** Firebase ID token (Bearer)  
**Rate limiting:** generalLimiter (60 requests/minute per IP)

---

## Request

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Body:** None required

---

## Response

**Success (200 OK):**

Returns a JSON file with:
- `Content-Type: application/json`
- `Content-Disposition: attachment; filename="tradesitegenie-data-export-{userId}.json"`

**Export structure:**
```json
{
  "exportedAt": "2026-02-12T12:00:00.000Z",
  "user": {
    "email": "user@example.com",
    "fullName": "John Smith",
    "createdAt": "2025-01-15T10:30:00.000Z"
  },
  "company": { ... },
  "subscription": { ... },
  "metrics": { ... },
  "settings": { ... },
  "sites": [ { "id": "...", ... } ],
  "tickets": [ { "id": "...", ... } ],
  "reports": [ { "id": "...", ... } ]
}
```

All Firestore Timestamps are converted to ISO 8601 strings for JSON compatibility.

**Data sources:**
- **User document:** `users/{userId}` (profile, company, subscription, metrics, settings)
- **Sites:** Top-level `sites` collection (filtered by `userId`)
- **Tickets:** Top-level `supportTickets` collection (filtered by `userId`)
- **Reports:** `users/{userId}/reports` subcollection

---

## Audit Logging

Each export request is logged to the `dataExports` collection:

```typescript
{
  userId: string,
  userEmail: string,
  exportedAt: Timestamp,
  ipAddress: string  // From x-forwarded-for or 'unknown'
}
```

**Purpose:** Compliance audit trail for GDPR data portability requests.

---

## Error Responses

- `401` - Invalid or missing auth token
- `404` - User not found
- `500` - Server/database error

---

## Related

- [DATA_MODELS.md](./DATA_MODELS.md) - dataExports collection, user schema
- [API_INDEX.md](./API_INDEX.md) - Export Data (GDPR) in User APIs section
