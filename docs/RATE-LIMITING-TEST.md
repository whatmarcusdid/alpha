# Rate Limiting Testing Guide

## Overview

The Delivery Scout API is rate-limited to **100 requests per hour per IP address** using Upstash Redis. This prevents abuse while allowing reasonable automation from Lindy AI.

---

## Prerequisites

1. ✅ Generate API key: `openssl rand -hex 32`
2. ✅ Add to `.env.local`: `DELIVERY_SCOUT_API_KEY=<your-key>`
3. ✅ Verify Upstash Redis is configured in `.env.local`
4. ✅ Start dev server: `npm run dev`

---

## Test 1: Verify Rate Limiting is Active

### Single Request (Should Succeed)

```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {"websiteTraffic": 100}
  }' \
  -i
```

**Expected Response:**
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1738368000000

{
  "success": true,
  "message": "Metrics updated successfully"
}
```

**Look for these headers:**
- `X-RateLimit-Limit: 100` - Total requests allowed per hour
- `X-RateLimit-Remaining: 99` - Requests remaining
- `X-RateLimit-Reset: <timestamp>` - When limit resets (Unix ms)

---

## Test 2: Trigger Rate Limit (101 Requests)

### Option A: Bash Script (Automated)

Create a test script:

```bash
#!/bin/bash
# File: test-rate-limit.sh

API_KEY="YOUR_API_KEY_HERE"
ENDPOINT="http://localhost:3000/api/delivery-scout"

echo "Testing rate limit (100 requests per hour)"
echo "This will make 101 requests..."
echo ""

for i in {1..101}; do
  echo -n "Request $i: "
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "action": "update_metrics",
      "userId": "test123",
      "data": {"websiteTraffic": '$i'}
    }')
  
  # Extract HTTP status code (last line)
  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$status" = "429" ]; then
    echo "❌ RATE LIMITED"
    echo "Response: $body"
    echo ""
    echo "✅ Rate limit working correctly! Hit limit at request #$i"
    break
  elif [ "$status" = "200" ]; then
    echo "✅ Success"
  else
    echo "⚠️ Status $status"
    echo "Response: $body"
  fi
  
  # Small delay to avoid overwhelming the server
  sleep 0.1
done
```

**Run it:**
```bash
chmod +x test-rate-limit.sh
./test-rate-limit.sh
```

**Expected Output:**
```
Testing rate limit (100 requests per hour)
This will make 101 requests...

Request 1: ✅ Success
Request 2: ✅ Success
Request 3: ✅ Success
...
Request 100: ✅ Success
Request 101: ❌ RATE LIMITED
Response: {"success":false,"error":"Rate limit exceeded. Try again in 60 minutes.","retryAfter":3600}

✅ Rate limit working correctly! Hit limit at request #101
```

---

### Option B: Manual Testing with curl

Make 101 requests manually (tedious but thorough):

```bash
# Set your API key
export API_KEY="YOUR_API_KEY_HERE"

# Make requests 1-100 (should all succeed)
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/api/delivery-scout \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"update_metrics\",\"userId\":\"test123\",\"data\":{\"websiteTraffic\":$i}}" \
    | jq -r '.success'
done

# Request 101 (should fail with 429)
curl -i -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_metrics","userId":"test123","data":{"websiteTraffic":101}}'
```

**Expected 101st Response:**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1738371600000
Retry-After: 3600

{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 minutes.",
  "retryAfter": 3600
}
```

---

## Test 3: Verify Redis Persistence

Rate limits should persist across server restarts (stored in Upstash Redis).

### Steps:

1. **Make 50 requests:**
   ```bash
   for i in {1..50}; do
     curl -s -X POST http://localhost:3000/api/delivery-scout \
       -H "Authorization: Bearer YOUR_API_KEY" \
       -H "Content-Type: application/json" \
       -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}' \
       | jq -r '.success'
   done
   ```

2. **Check remaining requests:**
   ```bash
   curl -i -X POST http://localhost:3000/api/delivery-scout \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}'
   ```
   
   **Look for:** `X-RateLimit-Remaining: 49`

3. **Restart dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Start again
   npm run dev
   ```

4. **Make another request:**
   ```bash
   curl -i -X POST http://localhost:3000/api/delivery-scout \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}'
   ```
   
   **Expected:** `X-RateLimit-Remaining: 48` (not reset to 99)

✅ **Result:** Rate limit persists across restarts (stored in Redis, not memory)

---

## Test 4: Multiple IP Addresses

Rate limits are per-IP address. Different IPs get separate limits.

**Note:** This is hard to test locally since requests come from localhost. In production, Vercel handles `x-forwarded-for` headers correctly.

To simulate:
```bash
# Request from "IP 1" (simulated)
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Forwarded-For: 192.168.1.1" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}'

# Request from "IP 2" (simulated)  
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Forwarded-For: 192.168.1.2" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}'
```

**Expected:** Each IP has its own rate limit counter

---

## Test 5: Rate Limit Before Authentication

Rate limiting happens BEFORE authentication to prevent brute force attacks on the API key.

```bash
# Make 101 requests with INVALID API key
for i in {1..101}; do
  response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/delivery-scout \
    -H "Authorization: Bearer invalid-key-$i" \
    -H "Content-Type: application/json" \
    -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}')
  
  status=$(echo "$response" | tail -n1)
  
  if [ "$status" = "429" ]; then
    echo "Request $i: Rate limited (correct!)"
    break
  else
    echo "Request $i: Status $status"
  fi
done
```

**Expected:** After 100 requests, get 429 even with invalid API key

✅ **This prevents brute force attacks on the API key**

---

## Test 6: Missing API Key Handling

What happens if `DELIVERY_SCOUT_API_KEY` is not set?

### Steps:

1. **Remove API key from .env.local:**
   ```bash
   # Comment out or remove this line:
   # DELIVERY_SCOUT_API_KEY=...
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Make a request:**
   ```bash
   curl -i -X POST http://localhost:3000/api/delivery-scout \
     -H "Authorization: Bearer any-key" \
     -H "Content-Type: application/json" \
     -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}'
   ```

**Expected Response:**
```
HTTP/1.1 401 Unauthorized

{
  "success": false,
  "error": "Unauthorized"
}
```

**Server logs should show:**
```
⚠️ Server misconfiguration: DELIVERY_SCOUT_API_KEY not set in environment variables
❌ Authentication failed: Invalid API key
```

✅ **Fails gracefully** - Returns 401, never crashes, logs warning

---

## Test 7: Rate Limit Reset

Rate limits reset after 1 hour (sliding window).

### Quick Test (Simulated):

Since waiting 1 hour is impractical, you can:

1. **Flush Redis (dev only):**
   ```bash
   # Install Upstash Redis CLI
   npm install -g @upstash/redis

   # Clear rate limit data (BE CAREFUL - dev only!)
   # This will reset ALL rate limits
   ```

2. **Or modify the rate limiter temporarily:**
   
   Edit `/lib/middleware/rateLimiting.ts`:
   ```typescript
   // Change from 1 hour to 10 seconds for testing
   limiter: Ratelimit.slidingWindow(100, '10 s'),
   ```
   
   Then test that limits reset after 10 seconds.

---

## Expected Behaviors

### ✅ Success Case
```json
{
  "success": true,
  "message": "Metrics updated successfully"
}
```

### ❌ Rate Limit Exceeded (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 minutes.",
  "retryAfter": 3600
}
```

**Headers:**
- `X-RateLimit-Limit: 100`
- `X-RateLimit-Remaining: 0`
- `Retry-After: 3600` (seconds)

### ❌ Invalid API Key (401)
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Headers:** None (fails before rate limit tracking)

---

## Monitoring Rate Limits

### Check Upstash Redis Dashboard

1. Go to [Upstash Console](https://console.upstash.com)
2. Select your Redis database
3. View **Data Browser**
4. Look for keys: `ratelimit:delivery-scout:*`

You should see entries like:
```
ratelimit:delivery-scout:192.168.1.1
```

### Check Vercel Logs (Production)

```bash
# View logs
vercel logs --follow

# Filter rate limit events
vercel logs | grep "Rate limit"

# Filter authentication failures
vercel logs | grep "Authentication failed"
```

---

## Troubleshooting

### Rate Limiting Not Working

**Symptoms:** Can make more than 100 requests

**Checks:**
1. ✅ Verify Upstash Redis is configured in `.env.local`
2. ✅ Check Redis connection in server logs: `✅ Upstash Redis initialized`
3. ✅ Verify `deliveryScoutLimiter` is not null
4. ✅ Check response headers for `X-RateLimit-*`

### Rate Limit Too Strict

**Symptoms:** Getting rate limited too quickly

**Fix:** Adjust the limit in `/lib/middleware/rateLimiting.ts`:
```typescript
// Increase from 100 to 200 requests per hour
limiter: Ratelimit.slidingWindow(200, '1 h'),
```

### Rate Limit Not Resetting

**Symptoms:** Still rate limited after 1 hour

**Check:**
1. ✅ Verify time on server (may be clock skew)
2. ✅ Check Redis is not full (may be evicting keys)
3. ✅ Look for errors in Upstash dashboard

---

## Summary

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| Single Request | Verify endpoint works | 200 with rate limit headers |
| 101 Requests | Verify rate limit enforced | 429 on 101st request |
| Redis Persistence | Verify state survives restarts | Remaining count persists |
| Multiple IPs | Verify per-IP limits | Each IP has own counter |
| Before Auth | Verify rate limit order | Rate limited before auth check |
| Missing API Key | Verify graceful failure | 401 with no crash |
| Reset | Verify limits reset | Can make requests after 1 hour |

**Rate Limit:** 100 requests per hour per IP
**Storage:** Upstash Redis (persists across restarts)
**Window:** Sliding (not fixed)
**Scope:** Per IP address (via x-forwarded-for header)
