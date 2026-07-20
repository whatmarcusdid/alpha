# Account Deletion Request API

## Overview

The Account Deletion Request API allows users to submit a request to permanently delete their TradeSiteGenie account. The request is logged to Firestore and the team is notified via Loops (email to Help Scout inbox) and Slack. The actual deletion is processed manually by the team within 48 hours.

**Endpoint:** POST `/api/user/request-deletion`  
**Authentication:** Firebase ID token (Bearer)  
**Rate limiting:** generalLimiter (60 requests/minute per IP)

---

## Request

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Body:**
```json
{
  "reason": "No longer need the service"
}
```

The `reason` field is optional. If omitted, the request is still processed and "No reason provided" is used in notifications.

---

## Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Your account deletion request has been submitted. We've sent a confirmation email to user@example.com. We'll process your request within 48 hours."
}
```

---

## Backend Flow

1. **Fetch user** - Get email and fullName from Firestore user document
2. **Log to Firestore** - Add document to `deletionRequests` collection (always, even if notifications fail)
3. **Send internal Loops email** - Transactional email to support@bookservice.tech with deletion request details
4. **Send customer confirmation email** - Transactional email to the user's address via `LOOPS_ACCOUNT_DELETION_CONFIRMATION_TEMPLATE_ID`
5. **Send Slack notification** - Message to SLACK_SUPPORT_WEBHOOK_URL channel
6. **Return success** - User receives confirmation regardless of Loops/Slack success

**Important:** If Loops or Slack fails, the request is still logged and the user receives a success response. The success message only mentions a confirmation email when the customer-facing Loops send succeeds. The Firestore record ensures no request is lost.

---

## Firestore Logging

Each request is logged to `deletionRequests`:

```typescript
{
  userId: string,
  userEmail: string,
  userName: string,
  reason: string | null,
  requestedAt: Timestamp,
  status: 'pending'
}
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `LOOPS_API_KEY` | Loops transactional email API key |
| `LOOPS_SUPPORT_TICKET_TEMPLATE_ID` | Template ID for internal support ticket emails (default: `support-ticket-to-helpscout`) |
| `LOOPS_ACCOUNT_DELETION_CONFIRMATION_TEMPLATE_ID` | Template ID for customer-facing deletion request confirmation email |
| `SLACK_SUPPORT_WEBHOOK_URL` | Slack webhook for support channel notifications |

---

## Error Responses

- `401` - Invalid or missing auth token
- `404` - User not found
- `500` - Server/database error

---

## Related

- [API_INDEX.md](./API_INDEX.md) - Request Account Deletion in User APIs section
- [DATA_MODELS.md](./DATA_MODELS.md) - deletionRequests collection, Data Retention and Deletion
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Loops configuration
