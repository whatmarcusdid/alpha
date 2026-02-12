# Delivery Scout API - Quick Reference

## 8 Handler Functions Summary

### Update Handlers (Idempotent ✅)

| Action | Required Fields | Updates | Returns |
|--------|----------------|---------|---------|
| `update_meeting` | ≥1 of: month, day, title | `users/{userId}/meeting` | success |
| `update_metrics` | ≥1 of: websiteTraffic, siteSpeedSeconds, supportHoursRemaining, maintenanceHoursRemaining | `users/{userId}/metrics` | success |
| `update_company_info` | ≥1 of: legalName, websiteUrl, address, city, state, zipCode, businessService, serviceArea | `users/{userId}/company` | success |
| `update_site` | siteId + ≥1 update field | `users/{userId}/sites/{siteId}` | siteId |
| `update_ticket` | ticketId + ≥1 update field | `supportTickets/{ticketId}` (top-level) | ticketId |

### Add Handlers (Not Idempotent ❌)

| Action | Required Fields | Creates | Returns |
|--------|----------------|---------|---------|
| `add_site` | name, url | `sites/{auto-id}` (top-level) | siteId (new) |
| `add_report` | title, type | `users/{userId}/reports/{auto-id}` | reportId (new) |
| `create_ticket` | title, description | `supportTickets/{auto-id}` (top-level) | ticketId (new) |

## Quick Examples

### Update Metrics
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_metrics","userId":"user123","data":{"supportHoursRemaining":5.5}}'
```

### Create Ticket
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"create_ticket","userId":"user123","data":{"title":"Issue","description":"Description of the issue","priority":"High"}}'
```

### Add Site
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"add_site","userId":"user123","data":{"name":"Site","url":"https://example.com"}}'
```

## Validation Rules

### Metrics
- All numbers must be ≥ 0

### Priorities (Tickets)
- Must be: `Critical`, `High`, `Medium`, or `Low`

### Report Types
- Must be: `monthly`, `quarterly`, `annual`, or `custom`

### Site/Ticket Updates
- Document must exist (throws error if not found)

## Timestamps

All handlers use **server-side timestamps**:
```javascript
admin.firestore.FieldValue.serverTimestamp()
```

Fields automatically set:
- `lastUpdatedAt` (all updates)
- `createdAt` (all creates)

## Integrations (Tickets)

**create_ticket** and **update_ticket** integrate with:
- **Slack:** Sends notifications to `SLACK_SUPPORT_WEBHOOK_URL` channel
- **HelpScout:** Creates conversation on create; adds note on update (requires `HELPSCOUT_APP_ID`, `HELPSCOUT_APP_SECRET`, `HELPSCOUT_MAILBOX_ID`)

## Error Responses

| Status | Error | Reason |
|--------|-------|--------|
| 401 | Unauthorized | Invalid/missing API key |
| 400 | Invalid JSON | Malformed request body |
| 400 | Missing/invalid field | Required field not provided |
| 400 | Invalid action | Action not in valid list |
| 500 | Failed to... | Firestore operation failed |
| 500 | Document not found | Site/ticket doesn't exist |
| 500 | Server configuration error | Firebase Admin not initialized |

## Idempotency

**Safe to retry (same result):**
- ✅ All `update_*` actions

**Creates duplicates if retried:**
- ❌ All `add_*` and `create_*` actions

## Files

```
/app/api/delivery-scout/
  └── route.ts                    # Main API endpoint (530+ lines)

/types/
  └── delivery-scout.ts           # Type definitions

/docs/
  ├── delivery-scout-api.md       # API documentation
  ├── delivery-scout-handlers.md  # Handler details
  └── delivery-scout-quick-reference.md  # This file
```

## Setup Checklist

- [ ] Add `DELIVERY_SCOUT_API_KEY` to `.env.local`
- [ ] Configure Firebase Admin credentials
- [ ] Test authentication (should get 401 without key)
- [ ] Test one update action (idempotent)
- [ ] Test one add action (returns new ID)
- [ ] Verify timestamps in Firestore Console
- [ ] Test validation errors (missing required fields)
- [ ] Configure Lindy AI with API key and endpoint URL

## Next Steps for Production

1. **Rate Limiting:** Add rate limiting middleware (Upstash Redis)
2. **Deduplication:** Add idempotency keys for `add_*` actions
3. **Webhooks:** Add notifications when tickets/reports created
4. **Logging:** Add audit trail for all operations
5. **Monitoring:** Add alerts for high error rates

---

**Full Documentation:** See `delivery-scout-api.md` and `delivery-scout-handlers.md`
