# Delivery Scout Test Suite - Quick Reference

## Run Tests

```bash
# All tests (27 total)
npm run test:scout

# Single test group
npm run test:scout -- --test=create_ticket
npm run test:scout -- --test=update_metrics
npm run test:scout -- --test=auth
```

---

## Prerequisites

### 1. API Key in .env.local
```bash
DELIVERY_SCOUT_API_KEY=your-key-here
```

### 2. Test User in Firestore
- **User ID:** `test-user-delivery-scout`
- Must have `meeting`, `metrics`, `company` fields

### 3. Dev Server Running
```bash
npm run dev
```

---

## Test Groups

| Group | Tests | Coverage |
|-------|-------|----------|
| `update_meeting` | 2 | Success, validation |
| `update_metrics` | 3 | Success, validation (negative, no fields) |
| `update_company_info` | 3 | Success, email/URL validation |
| `add_site` | 3 | Success, missing required, invalid URL |
| `update_site` | 3 | Success, missing ID, not found |
| `add_report` | 3 | Success, missing/invalid type |
| `create_ticket` | 4 | Success, validation, Low priority |
| `update_ticket` | 3 | Success, missing ID, not found |
| `auth` | 2 | Missing/invalid API key |

**Total:** 27 tests

---

## Expected Output

### All Tests Pass
```
✓ Update Meeting: Success (234ms)
✓ Update Meeting: Validation (123ms)
✓ Update Metrics: Success (156ms)
...
✓ Authentication: Invalid API Key (91ms)

Total: 27 tests in 3842ms
Passed: 27

All tests passed! 🎉
```

### Test Failure
```
✓ Update Meeting: Success (234ms)
✗ Update Metrics: Success (156ms)
  Error: Expected success but got status 500

Total: 27 tests in 3842ms
Passed: 26
Failed: 1

Failed tests:
  ✗ Update Metrics: Success
    Expected success but got status 500
```

---

## Exit Codes

- **0** = All tests passed ✅
- **1** = One or more tests failed ❌

---

## Cleanup

**Manual cleanup required** for created resources:
- Sites in `sites` collection (top-level, filter by userId)
- Reports in `users/test-user-delivery-scout/reports`
- Tickets in `supportTickets` collection (top-level, filter by userId)

Script outputs IDs of created resources.

---

## Troubleshooting

### "API key not set"
```bash
echo "DELIVERY_SCOUT_API_KEY=$(openssl rand -hex 32)" >> .env.local
```

### "Connection refused"
```bash
# Start dev server first
npm run dev
```

### "Test user not found"
Create user `test-user-delivery-scout` in Firebase Console with:
```json
{
  "meeting": {},
  "metrics": { "websiteTraffic": 0 },
  "company": {}
}
```

---

## Quick Commands

```bash
# Setup
echo "DELIVERY_SCOUT_API_KEY=$(openssl rand -hex 32)" >> .env.local
npm run dev

# Test everything
npm run test:scout

# Test tickets only
npm run test:scout -- --test=create_ticket

# Test auth only  
npm run test:scout -- --test=auth
```

---

## Documentation

- **Full Guide:** `/docs/TESTING-DELIVERY-SCOUT.md`
- **Summary:** `/docs/TEST-SUITE-SUMMARY.md`
- **Test Script:** `/scripts/test-delivery-scout.ts`
