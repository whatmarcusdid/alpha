# Delivery Scout API Key Setup Guide

## 1. Generate Secure API Keys

### For Development (Local)

```bash
# Generate a cryptographically secure 64-character hex string
openssl rand -hex 32
```

**Example output:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

Add this to your `.env.local`:
```bash
DELIVERY_SCOUT_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### For Production (Vercel)

```bash
# Generate a DIFFERENT key for production
openssl rand -hex 32
```

**Example output:** `f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1`

---

## 2. Add to .env.local (Development)

Update your `.env.local` file:

```bash
# ==============================================================================
# DELIVERY SCOUT API (Lindy AI Integration)
# ==============================================================================
# API key for authenticating requests from Lindy AI to the delivery-scout endpoint
# Generated using: openssl rand -hex 32
# This is a server-only secret - NEVER expose to the browser
DELIVERY_SCOUT_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## 3. Add to Vercel (Production)

### Via Vercel Dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **tradesitegenie-dashboard**
3. Navigate to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Key:** `DELIVERY_SCOUT_API_KEY`
   - **Value:** `f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1`
   - **Environments:** Select **Production** and **Preview** (optional)
6. Click **Save**
7. **Redeploy** your application for changes to take effect

### Via Vercel CLI:

```bash
# Set production environment variable
vercel env add DELIVERY_SCOUT_API_KEY production

# When prompted, paste the generated key:
f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1

# Redeploy
vercel --prod
```

---

## 4. Configure Lindy AI

Once you have your API keys, configure Lindy AI to use them:

### Development (Testing)
```
Endpoint: http://localhost:3000/api/delivery-scout
Method: POST
Headers:
  Authorization: Bearer a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
  Content-Type: application/json
```

### Production
```
Endpoint: https://my.tradesitegenie.com/api/delivery-scout
Method: POST
Headers:
  Authorization: Bearer f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
  Content-Type: application/json
```

---

## 5. Security Best Practices

### ✅ DO
- ✅ Use different keys for development and production
- ✅ Generate keys with at least 256 bits of entropy (32 bytes hex = 256 bits)
- ✅ Rotate keys periodically (every 90 days recommended)
- ✅ Store keys in environment variables only
- ✅ Never commit keys to version control

### ❌ DON'T
- ❌ Don't use simple passwords or predictable strings
- ❌ Don't reuse keys across environments
- ❌ Don't log API keys in error messages
- ❌ Don't expose keys in client-side code
- ❌ Don't share keys via email or chat (use secure secret management)

---

## 6. Key Rotation

When you need to rotate the API key:

1. Generate a new key:
   ```bash
   openssl rand -hex 32
   ```

2. Update the environment variable in Vercel

3. Update Lindy AI configuration with new key

4. **Grace Period:** Keep the old key active for 24 hours to allow for migration

5. After 24 hours, remove the old key

---

## 7. Testing the API Key

### Test Authentication Works:
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {"websiteTraffic": 100}
  }'
```

**Expected:** 200 with success response

### Test Invalid Key:
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer invalid-key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {"websiteTraffic": 100}
  }'
```

**Expected:** 401 with `"Unauthorized"` error

### Test Missing Key:
```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metrics",
    "userId": "test123",
    "data": {"websiteTraffic": 100}
  }'
```

**Expected:** 401 with `"Unauthorized"` error

---

## 8. Troubleshooting

### "Unauthorized" Error
- ✅ Check API key is set in environment variables
- ✅ Verify key matches exactly (no extra spaces)
- ✅ Confirm Authorization header format: `Bearer <key>`
- ✅ Restart dev server after changing .env.local

### Rate Limit Exceeded
- ✅ Wait for the retry period (shown in error message)
- ✅ Check if you're making too many requests
- ✅ Verify rate limit configuration (100/hour)

### "Server configuration error"
- ✅ Check DELIVERY_SCOUT_API_KEY is set
- ✅ Check Firebase Admin is initialized
- ✅ Check Upstash Redis is configured

---

## 9. Monitoring

To monitor API key usage:

1. Check Vercel logs for authentication failures
2. Monitor rate limit hits in Upstash Redis dashboard
3. Set up alerts for suspicious activity (many failed auth attempts)

```bash
# View recent logs
vercel logs --follow

# Search for auth failures
vercel logs | grep "Unauthorized"

# Search for rate limit hits
vercel logs | grep "Rate limit exceeded"
```

---

## Quick Reference

| Environment | API Key Location | Key Format | Rate Limit |
|-------------|-----------------|------------|------------|
| Development | .env.local | 64-char hex | 100/hour |
| Production | Vercel Dashboard | 64-char hex | 100/hour |

**Generation Command:** `openssl rand -hex 32`

**Header Format:** `Authorization: Bearer <64-char-hex-key>`

**Rate Limit:** 100 requests per hour per client (IP-based)
