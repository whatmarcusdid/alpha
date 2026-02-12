# Delivery Scout API Testing Guide

## Overview

Comprehensive test suite that validates all 8 Delivery Scout API operations with both success and failure cases.

**Tests:** 27 total tests covering all operations
**Coverage:** Success cases, validation errors, authentication, edge cases

---

## Prerequisites

### 1. API Key

Ensure `DELIVERY_SCOUT_API_KEY` is set in your `.env.local`:

```bash
# Generate if you don't have one
openssl rand -hex 32

# Add to .env.local
DELIVERY_SCOUT_API_KEY=your-generated-key-here
```

### 2. Test User in Firestore

The tests use a dedicated test user ID: `test-user-delivery-scout`

**Create the test user:**

```typescript
// Run this in Firebase Console or via script
{
  email: "test@delivery-scout.test",
  fullName: "Test User",
  meeting: {},
  metrics: {
    websiteTraffic: 0,
    siteSpeedSeconds: 0,
    supportHoursRemaining: 10,
    maintenanceHoursRemaining: 20,
  },
  company: {},
  createdAt: <timestamp>
}
```

### 3. Dev Server Running

```bash
npm run dev
```

The tests will connect to `http://localhost:3000/api/delivery-scout`

---

## Running Tests

### Run All Tests

```bash
npm run test:scout
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║         Delivery Scout API Test Suite                      ║
╚════════════════════════════════════════════════════════════╝

Checking prerequisites...
✓ API Key found
✓ Test User ID: test-user-delivery-scout
✓ API URL: http://localhost:3000/api/delivery-scout

✓ Update Meeting: Success (234ms)
✓ Update Meeting: Validation (no fields) (123ms)
✓ Update Metrics: Success (156ms)
✓ Update Metrics: Validation (negative) (89ms)
✓ Update Metrics: Validation (no fields) (92ms)
✓ Update Company Info: Success (178ms)
✓ Update Company Info: Validation (email) (98ms)
✓ Update Company Info: Validation (URL) (102ms)
✓ Add Site: Success (201ms)
✓ Add Site: Validation (missing required) (87ms)
✓ Add Site: Validation (invalid URL) (94ms)
✓ Update Site: Success (312ms)
✓ Update Site: Validation (missing siteId) (91ms)
✓ Update Site: Not Found (145ms)
✓ Add Report: Success (189ms)
✓ Add Report: Validation (missing type) (88ms)
✓ Add Report: Validation (invalid type) (95ms)
✓ Create Ticket: Success (198ms)
✓ Create Ticket: Validation (empty subject) (90ms)
✓ Create Ticket: Validation (invalid priority) (93ms)
✓ Create Ticket: P4 Priority (176ms)
✓ Update Ticket: Success (298ms)
✓ Update Ticket: Validation (missing ticketId) (89ms)
✓ Update Ticket: Not Found (142ms)
✓ Authentication: Missing API Key (87ms)
✓ Authentication: Invalid API Key (91ms)

Cleaning up test data...
⚠ Created resources that need manual cleanup:
  Sites: 2
  Reports: 1
  Tickets: 4

  Ticket IDs:
    - abc123xyz
    - def456uvw
    - ghi789rst
    - jkl012mno

╔════════════════════════════════════════════════════════════╗
║                      Test Summary                           ║
╚════════════════════════════════════════════════════════════╝

Total: 27 tests in 3842ms
Passed: 27

All tests passed! 🎉
```

---

### Run Single Test Group

Run only tests for a specific operation:

```bash
# Test only create_ticket operation
npm run test:scout -- --test=create_ticket

# Test only update_metrics operation
npm run test:scout -- --test=update_metrics

# Test only authentication
npm run test:scout -- --test=auth
```

**Available test groups:**
- `update_meeting`
- `update_metrics`
- `update_company_info`
- `add_site`
- `update_site`
- `add_report`
- `create_ticket`
- `update_ticket`
- `auth`

**Example output (single group):**
```
Running tests for: create_ticket

✓ Create Ticket: Success (198ms)
✓ Create Ticket: Validation (empty subject) (90ms)
✓ Create Ticket: Validation (invalid priority) (93ms)
✓ Create Ticket: P4 Priority (176ms)

Total: 4 tests in 557ms
Passed: 4

All tests passed! 🎉
```

---

## Test Coverage

### Update Operations (Idempotent)

| Operation | Tests | What's Validated |
|-----------|-------|-----------------|
| **update_meeting** | 2 | Success, validation (no fields) |
| **update_metrics** | 3 | Success, negative numbers, no fields |
| **update_company_info** | 3 | Success, email validation, URL validation |
| **update_site** | 3 | Success, missing siteId, not found |
| **update_ticket** | 3 | Success, missing ticketId, not found |

### Add Operations (Not Idempotent)

| Operation | Tests | What's Validated |
|-----------|-------|-----------------|
| **add_site** | 3 | Success, missing required, invalid URL |
| **add_report** | 3 | Success, missing type, invalid type |
| **create_ticket** | 4 | Success, empty subject, invalid priority, P4 support |

### Authentication

| Test | What's Validated |
|------|-----------------|
| Missing API Key | Returns 401 |
| Invalid API Key | Returns 401 |

---

## What Each Test Does

### Success Tests

These tests verify that valid data is accepted and processed:

```typescript
// Example: Create Ticket Success
POST /api/delivery-scout
{
  "action": "create_ticket",
  "userId": "test-user-delivery-scout",
  "data": {
    "title": "Test ticket",
    "description": "Test description",
    "priority": "High",
    "category": "Technical"
  }
}

// Expected: 200 OK
{
  "success": true,
  "message": "Ticket created successfully",
  "ticketId": "abc123xyz"
}
```

### Validation Tests

These tests verify that invalid data is rejected with clear errors:

```typescript
// Example: Invalid Priority
POST /api/delivery-scout
{
  "action": "create_ticket",
  "userId": "test-user-delivery-scout",
  "data": {
    "title": "Test",
    "description": "Test description",
    "priority": "P1"  // Invalid - should be Critical, High, Medium, Low
  }
}

// Expected: 200 OK with validation error
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    "priority: Must be one of: Critical, High, Medium, Low"
  ]
}
```

### Authentication Tests

These tests verify API key authentication:

```typescript
// Missing API Key
POST /api/delivery-scout
// No Authorization header

// Expected: 401 Unauthorized
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Exit Codes

The test script uses standard exit codes:

- **0** - All tests passed
- **1** - One or more tests failed or error occurred

This makes it easy to use in CI/CD pipelines:

```bash
npm run test:scout
if [ $? -eq 0 ]; then
  echo "✅ Tests passed, deploying..."
else
  echo "❌ Tests failed, stopping deployment"
  exit 1
fi
```

---

## Cleanup

The test script tracks created resources (sites, reports, tickets) but **cannot automatically delete them** since the API doesn't expose delete operations.

**Manual cleanup options:**

### Option 1: Firebase Console

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Find user: `test-user-delivery-scout`
4. Delete subcollections: `sites`, `reports`, `tickets`

### Option 2: Firebase Admin Script

Create a cleanup script using Firebase Admin SDK:

```typescript
import { adminDb } from '@/lib/firebase/admin';

async function cleanup() {
  const userId = 'test-user-delivery-scout';
  
  // Delete all tickets
  const tickets = await adminDb.collection('users').doc(userId).collection('tickets').get();
  for (const doc of tickets.docs) {
    await doc.ref.delete();
  }
  
  // Delete all sites
  const sites = await adminDb.collection('users').doc(userId).collection('sites').get();
  for (const doc of sites.docs) {
    await doc.ref.delete();
  }
  
  // Delete all reports
  const reports = await adminDb.collection('users').doc(userId).collection('reports').get();
  for (const doc of reports.docs) {
    await doc.ref.delete();
  }
}
```

### Option 3: Periodic Test Reset

Run tests against a fresh test user periodically:

```bash
# Delete old test user
# Create new test user
# Run tests
npm run test:scout
```

---

## Troubleshooting

### Tests Fail: "DELIVERY_SCOUT_API_KEY not set"

**Fix:**
```bash
# Check if .env.local exists
ls -la .env.local

# Add API key
echo "DELIVERY_SCOUT_API_KEY=$(openssl rand -hex 32)" >> .env.local

# Verify
grep DELIVERY_SCOUT_API_KEY .env.local
```

### Tests Fail: "Connection refused"

**Fix:**
```bash
# Make sure dev server is running
npm run dev

# In another terminal, run tests
npm run test:scout
```

### Tests Fail: "Test user not found"

The test user might not exist in Firestore.

**Fix:**
1. Create user in Firebase Console with ID `test-user-delivery-scout`
2. Or change TEST_USER_ID in the script to an existing user

### All Tests Show "Not Found" Errors

The test user exists but collections are missing.

**Fix:**
```typescript
// Initialize test user with required fields
{
  email: "test@delivery-scout.test",
  meeting: {},
  metrics: {
    websiteTraffic: 0,
    supportHoursRemaining: 10,
  },
  company: {}
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Delivery Scout API

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start dev server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      
      - name: Run tests
        env:
          DELIVERY_SCOUT_API_KEY: ${{ secrets.DELIVERY_SCOUT_API_KEY }}
        run: npm run test:scout
```

### Vercel Preview Deployments

```bash
# .vercel/test-delivery-scout.sh
#!/bin/bash

# Get preview URL from Vercel
PREVIEW_URL=$(vercel inspect --url)

# Run tests against preview
API_URL="$PREVIEW_URL/api/delivery-scout" npm run test:scout
```

---

## Adding New Tests

To add a new test:

1. **Create test function:**
```typescript
async function testNewFeature() {
  const response = await makeRequest('your_action', {
    // test data
  });
  
  assertSuccess(response, 'Should do something');
  assert(response.data.someField, 'Should have someField');
}
```

2. **Add to test suite:**
```typescript
const allTests = [
  // ... existing tests
  { 
    name: 'New Feature: Success', 
    fn: testNewFeature, 
    group: 'new_feature' 
  },
];
```

3. **Run your test:**
```bash
npm run test:scout -- --test=new_feature
```

---

## Performance

**Typical test run:**
- **Total time:** 3-5 seconds
- **Per test:** 50-300ms
- **Network calls:** ~35 API requests

**Tips for faster tests:**
- Run single test group during development
- Use `--test=<group>` flag
- Tests run sequentially (can be parallelized if needed)

---

## Summary

| Aspect | Details |
|--------|---------|
| **Total Tests** | 27 tests |
| **Operations Covered** | All 8 API operations |
| **Test Types** | Success, validation, authentication, edge cases |
| **Run Command** | `npm run test:scout` |
| **Single Test** | `npm run test:scout -- --test=create_ticket` |
| **Exit Code** | 0 (pass) or 1 (fail) |
| **Prerequisites** | API key, test user, dev server |
| **Cleanup** | Manual (see Cleanup section) |

---

## Quick Start

```bash
# 1. Generate API key
openssl rand -hex 32

# 2. Add to .env.local
echo "DELIVERY_SCOUT_API_KEY=<your-key>" >> .env.local

# 3. Start dev server
npm run dev

# 4. Run tests (in another terminal)
npm run test:scout

# 5. Run specific test group
npm run test:scout -- --test=create_ticket
```

**Expected:** All 27 tests pass in 3-5 seconds ✅
