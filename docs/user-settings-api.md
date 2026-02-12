# User Settings API

## Overview

The User Settings API provides GET and PATCH endpoints for managing user preferences: timezone, timezone label, and email notification frequency. Used by the Settings page (`/app/dashboard/settings`).

**Base path:** `/api/user/settings`  
**Authentication:** Firebase ID token (Bearer)  
**Rate limiting:** generalLimiter (60 requests/minute per IP)

---

## GET - Retrieve User Settings

**Request:** No body required. User ID extracted from auth token.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response (200 OK):**
```json
{
  "timezone": "America/New_York",
  "timezoneLabel": "Eastern Standard Time (EST)",
  "emailFrequency": "real-time",
  "wordpressDashboardUrl": "https://example.com/wp-admin"
}
```

**Defaults when not set:**
- `timezone`: `"America/New_York"`
- `timezoneLabel`: `"Eastern Standard Time (EST)"`
- `emailFrequency`: `"real-time"`
- `wordpressDashboardUrl`: `null`

**Error responses:**
- `401` - Invalid or missing auth token
- `500` - Server/database error

---

## PATCH - Update User Settings

**Request body:**
```json
{
  "timezoneLabel": "Pacific Standard Time (PST)",
  "emailFrequency": "daily"
}
```

Both fields are optional; include only the fields you want to update.

**Allowed timezoneLabel values:**
| Label | IANA Timezone |
|-------|---------------|
| Eastern Standard Time (EST) | America/New_York |
| Central Standard Time (CST) | America/Chicago |
| Mountain Standard Time (MST) | America/Denver |
| Pacific Standard Time (PST) | America/Los_Angeles |
| Alaska Standard Time (AKST) | America/Anchorage |
| Hawaii-Aleutian Standard Time (HAST) | Pacific/Honolulu |

**Allowed emailFrequency values:** `"real-time"` | `"daily"` | `"weekly"` | `"critical"`

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error responses:**
- `400` - Invalid timezoneLabel or emailFrequency
- `401` - Invalid or missing auth token
- `500` - Server/database error

---

## Firestore Structure

Settings are stored at `users/{userId}.settings`:

```typescript
{
  timezone: string,
  timezoneLabel: string,
  emailFrequency: string,
  lastUpdated: Timestamp  // Set automatically on PATCH
}
```

---

## Related

- [API_INDEX.md](./API_INDEX.md) - User Settings in User APIs section
- [DATA_MODELS.md](./DATA_MODELS.md) - User document schema (settings object)
- [lib/firestore/settings.ts](../lib/firestore/settings.ts) - Client-side helpers (browser-only)
