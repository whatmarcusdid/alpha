# Delivery Scout Validation - Test Cases

## Quick Test Suite

### Test 1: Valid Payload (Update Metrics)
```bash
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
```
**Expected:** ✅ `{ "success": true, "message": "Metrics updated successfully" }`

---

### Test 2: Invalid - Negative Number
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {
      "websiteTraffic": -100
    }
  }'
```
**Expected:** ❌ 
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

### Test 3: Valid - Create Ticket with P4
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "test123",
    "data": {
      "subject": "Update docs",
      "priority": "P4",
      "assignedTo": "marcus"
    }
  }'
```
**Expected:** ✅ `{ "success": true, "ticketId": "auto-generated-id" }`

---

### Test 4: Invalid - Wrong Priority
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "test123",
    "data": {
      "subject": "Site down",
      "priority": "HIGH"
    }
  }'
```
**Expected:** ❌
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "priority: Must be one of: P1, P2, P3, P4"
  ]
}
```

---

### Test 5: Invalid - Empty Subject
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "test123",
    "data": {
      "subject": "",
      "priority": "P1"
    }
  }'
```
**Expected:** ❌
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "subject: Cannot be empty"
  ]
}
```

---

### Test 6: Invalid - Bad Email
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_company_info",
    "userId": "test123",
    "data": {
      "email": "not-an-email"
    }
  }'
```
**Expected:** ❌
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

### Test 7: Invalid - Bad URL
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_site",
    "userId": "test123",
    "data": {
      "name": "Test Site",
      "url": "not-a-url"
    }
  }'
```
**Expected:** ❌
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

### Test 8: Valid - Update Ticket Status
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_ticket",
    "userId": "test123",
    "data": {
      "ticketId": "existing-ticket-id",
      "status": "in-progress"
    }
  }'
```
**Expected:** ✅ `{ "success": true, "ticketId": "existing-ticket-id" }` (if ticket exists)

---

### Test 9: Invalid - Missing Required Field
```bash
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
```
**Expected:** ❌
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

### Test 10: Invalid - No Update Fields
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_meeting",
    "userId": "test123",
    "data": {}
  }'
```
**Expected:** ❌
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

## Summary

| Test | Action | Valid | Error Type |
|------|--------|-------|------------|
| 1 | update_metrics | ✅ | - |
| 2 | update_metrics | ❌ | Negative number |
| 3 | create_ticket | ✅ | - |
| 4 | create_ticket | ❌ | Invalid enum (priority) |
| 5 | create_ticket | ❌ | Empty string |
| 6 | update_company_info | ❌ | Invalid email |
| 7 | add_site | ❌ | Invalid URL |
| 8 | update_ticket | ✅ | - |
| 9 | add_site | ❌ | Missing required field |
| 10 | update_meeting | ❌ | No fields provided |

**Pass Rate Expected:** 3/10 valid, 7/10 invalid (validation errors)
