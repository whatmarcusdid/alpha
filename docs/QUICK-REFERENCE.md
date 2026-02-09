# Delivery Scout API - Quick Reference

## 🔑 Generate API Key

```bash
openssl rand -hex 32
```

**Output format:** 64-character hex string
**Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

---

## 📝 Add to .env.local (Development)

```bash
DELIVERY_SCOUT_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## ☁️ Add to Vercel (Production)

### Via Dashboard:
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Key: `DELIVERY_SCOUT_API_KEY`
3. Value: `<different-64-char-hex-key>`
4. Environments: Production
5. Save → Redeploy

### Via CLI:
```bash
vercel env add DELIVERY_SCOUT_API_KEY production
# Paste key when prompted
vercel --prod
```

---

## 🧪 Test Authentication

### Should Succeed (200):
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}'
```

### Should Fail (401):
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer invalid-key" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}'
```

---

## 🚦 Test Rate Limiting

### Automated Test Script:

Save as `test-rate-limit.sh`:

```bash
#!/bin/bash
API_KEY="YOUR_API_KEY_HERE"

for i in {1..101}; do
  echo -n "Request $i: "
  response=$(curl -s -w "\n%{http_code}" \
    -X POST http://localhost:3000/api/delivery-scout \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":'$i'}}')
  
  status=$(echo "$response" | tail -n1)
  
  if [ "$status" = "429" ]; then
    echo "❌ RATE LIMITED (correct!)"
    break
  else
    echo "✅ OK"
  fi
done
```

**Run:**
```bash
chmod +x test-rate-limit.sh
./test-rate-limit.sh
```

**Expected:** First 100 succeed, 101st gets 429.

---

## 📊 Rate Limit Info

| Setting | Value |
|---------|-------|
| **Limit** | 100 requests per hour |
| **Scope** | Per IP address |
| **Window** | Sliding (not fixed) |
| **Storage** | Upstash Redis |
| **Persistence** | Survives restarts |

### Response Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1738371600000
```

### When Exceeded (429):
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 minutes.",
  "retryAfter": 3600
}
```

---

## 🔒 Security Features

✅ **Constant-Time Comparison** - Prevents timing attacks
✅ **Fail-Secure** - Denies access if key not configured
✅ **Never Logs Keys** - API keys never in logs
✅ **Separate Keys** - Different for dev/prod
✅ **Rate Limit First** - Prevents brute force
✅ **Redis Storage** - Persists across restarts

---

## ⚠️ Troubleshooting

### "Unauthorized" Error
```bash
# Check API key is set
grep DELIVERY_SCOUT_API_KEY .env.local

# Restart dev server
npm run dev
```

### Rate Limit Not Working
```bash
# Check Redis is configured
grep UPSTASH .env.local

# Check server logs for:
# ✅ Upstash Redis initialized for rate limiting
```

### Missing Rate Limit Headers
```bash
# Use -i flag to see headers
curl -i -X POST http://localhost:3000/api/delivery-scout ...
```

---

## 📚 Full Documentation

- **Setup:** `/docs/API-KEY-SETUP.md`
- **Testing:** `/docs/RATE-LIMITING-TEST.md`
- **Summary:** `/docs/SECURITY-SETUP-COMPLETE.md`

---

## 🎯 Quick Commands

```bash
# Generate API key
openssl rand -hex 32

# Add to .env.local
echo "DELIVERY_SCOUT_API_KEY=$(openssl rand -hex 32)" >> .env.local

# Test authentication
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer $(grep DELIVERY_SCOUT_API_KEY .env.local | cut -d'=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}'

# View rate limit status
curl -i -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer $(grep DELIVERY_SCOUT_API_KEY .env.local | cut -d'=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"action":"update_metrics","userId":"test","data":{"websiteTraffic":1}}' \
  | grep "X-RateLimit"
```
