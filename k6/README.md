# Section 4 — k6 Load/Burst Testing

Local dev only (`http://localhost:3000`). Requires dev server + Firebase emulators.

## Prerequisites

```bash
brew install k6
npm run dev   # port 3000
# firebase emulators:start --only auth,firestore
```

## Admin token (for admin script)

```bash
eval "$(node k6/scripts/bootstrap-k6-env.mjs)"
```

## Run scripts

```bash
# 1) order-status burst — 15 VUs × 2m (expect 404 then 429 at 60/min)
k6 run k6/order-status.js

# 2) audit — 1 VU × 2 iterations, 90s apart (real external API cost)
k6 run k6/audit.js

# 3) admin fix-jobs list — 10 VUs × 90s
eval "$(node k6/scripts/bootstrap-k6-env.mjs)"
k6 run k6/admin-fix-jobs-list.js
```

## Thresholds (adjusted from doc sample)

| Script | Target | Rationale |
|--------|--------|-----------|
| order-status | `p(95)<500ms` | Yesterday: ~100–165ms with live Upstash |
| audit | `p(95)<60000ms` | §4.4 / route `maxDuration` 60s ceiling |
| admin list | `p(95)<500ms` | Firestore read-only, no external APIs |

**Note:** k6 v2 treats HTTP 429 as `http_req_failed`. During order-status burst, high 429 rate is expected — use custom `status_429` counter, not `http_req_failed`, to judge rate-limit behavior.
