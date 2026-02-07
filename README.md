# TradeSiteGenie Customer Dashboard

A modern, secure customer dashboard built with Next.js 16, Firebase, and Stripe for managing TradeSiteGenie services, subscriptions, and support tickets.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the environment template and fill in your credentials:

```bash
cp .env.example .env.local
```

**📖 Detailed Setup Guide:** See [docs/SETUP.md](./docs/SETUP.md) for complete instructions on getting all required API keys and credentials.

**Required services:**
- Firebase (Authentication & Database)
- Stripe (Payments)
- Upstash Redis (Rate Limiting)
- Zapier (Support Tickets - optional)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🏗️ Tech Stack

- **Framework:** Next.js 16 with TypeScript
- **Authentication:** Firebase Authentication
- **Database:** Cloud Firestore
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Rate Limiting:** Upstash Redis
- **Support Integration:** Zapier + Notion

## 📁 Project Structure

```
tradesitegenie-dashboard/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Protected dashboard pages
│   ├── (auth)/           # Authentication pages
│   └── checkout/         # Checkout flow
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard-specific components
│   └── ui/              # Reusable UI components
├── lib/                 # Core utilities
│   ├── middleware/      # API middleware (auth, rate limiting)
│   ├── firebase/        # Firebase configuration
│   └── stripe/          # Stripe utilities
├── contexts/           # React context providers
└── docs/              # Documentation
```

## 🔐 Security Features

**Phase 1 Implementation Complete:**
- ✅ Firebase Admin authentication on protected routes
- ✅ IP-based rate limiting on all API endpoints
- ✅ Stripe webhook signature verification
- ✅ Input validation and sanitization
- ✅ Composable middleware system

See [SECURITY_FIXES_APPLIED.md](./SECURITY_FIXES_APPLIED.md) for details.

## 📚 Documentation

- **[Setup Guide](./docs/SETUP.md)** - Environment variables and service configuration
- **[Middleware Usage](./lib/middleware/USAGE.md)** - How to use auth and rate limiting
- **[Implementation Status](./lib/middleware/IMPLEMENTATION_STATUS.md)** - Current progress and next steps
- **[Security Fixes](./SECURITY_FIXES_APPLIED.md)** - Recent security improvements

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### API Routes

Key API endpoints:
- `/api/stripe/*` - Stripe operations (subscriptions, payments)
- `/api/webhooks/stripe` - Stripe webhook handler
- `/api/zapier-webhook` - Support ticket forwarding

All API routes use middleware for authentication and rate limiting. See [lib/middleware/USAGE.md](./lib/middleware/USAGE.md) for implementation details.

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables (see [docs/SETUP.md](./docs/SETUP.md))
4. Deploy

### Environment Variables in Production

Set all variables from `.env.example` in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set (required for rate limiting)

## 🧪 Testing

### Test Rate Limiting

```bash
# Test coupon validation rate limit (5/min)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/stripe/validate-coupon \
    -H "Content-Type: application/json" \
    -d '{"couponCode":"TEST"}' && echo
done
```

Expected: 6th request returns 429 Too Many Requests

### Test Authentication

```bash
# Try protected route without auth
curl -X POST http://localhost:3000/api/stripe/upgrade-subscription \
  -H "Content-Type: application/json" \
  -d '{"newTier":"premium"}'
```

Expected: 401 Unauthorized

## 📖 Learn More

**Next.js Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js GitHub](https://github.com/vercel/next.js)

**Project-Specific:**
- [TSG Color System](./.cursorrules) - Design system and coding standards
- [Stripe Setup Guides](./STRIPE_SUBSCRIPTION_MIGRATION.md) - Subscription management
- [Firebase Setup](./docs/SETUP.md#2-firebase-authentication--database) - Authentication configuration

## 🤝 Contributing

This is a private project for TradeSiteGenie. For questions or issues:
1. Check documentation in `/docs`
2. Review security implementation in `/lib/middleware`
3. See implementation status in `IMPLEMENTATION_STATUS.md`

## 📝 License

Private - TradeSiteGenie Internal Project
