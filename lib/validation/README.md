# Validation Schema Library

Zod validation schemas for all TradeSiteGenie API routes.

## Usage

Import schemas and use with the validation utility:

```typescript
import { validateRequestBody, checkoutSchema } from '@/lib/validation';

export async function POST(request: Request) {
  // Validate request body
  const validation = await validateRequestBody(request, checkoutSchema);
  
  if (!validation.success) {
    return validation.error; // Returns 400 with field errors
  }
  
  const { tier, billingCycle, couponCode } = validation.data;
  
  // Continue with validated data...
}
```

## Schema Organization

- **common.ts** - Shared schemas (email, tier, IDs, etc.)
- **stripe.ts** - Stripe/payment route schemas
- **webhooks.ts** - Webhook validation schemas
- **utils.ts** - Validation helper functions

## Available Schemas

### Common Schemas
- `emailSchema` - Email validation
- `tierSchema` - Pricing tier enum
- `billingCycleSchema` - Billing cycle enum
- `couponCodeSchema` - Coupon code format
- `stripeSubscriptionIdSchema` - Stripe subscription ID
- `stripePaymentIntentIdSchema` - Payment intent ID
- `stripeSessionIdSchema` - Checkout session ID
- `cancellationReasonSchema` - Cancellation reason text
- `urlSchema` - URL validation

### Route Schemas (stripe.ts)
- `checkoutSchema`
- `createSubscriptionSchema`
- `upgradeSubscriptionSchema`
- `downgradeSubscriptionSchema`
- `cancelSubscriptionSchema`
- `reactivateSubscriptionSchema`
- `switchToSafetyNetSchema`
- `validateCouponSchema`
- `getSubscriptionDetailsSchema`
- `getSessionDetailsSchema`
- `createSetupIntentSchema`

### Webhook Schemas (webhooks.ts)
- `getOgImageSchema`

## Validation Features

### Type Safety
All schemas provide full TypeScript type inference:

```typescript
import { checkoutSchema, InferSchema } from '@/lib/validation';

type CheckoutData = InferSchema<typeof checkoutSchema>;
// { tier: string; billingCycle: string; couponCode?: string }
```

### Data Transformation
Schemas automatically transform input:
- Emails are lowercased and trimmed
- Coupon codes are uppercased and trimmed
- All strings are trimmed

### Error Messages
User-friendly error messages for all validation failures:

```json
{
  "error": "Validation failed",
  "fields": {
    "tier": ["Invalid tier. Must be: essential, advanced, premium, or safety-net"],
    "email": ["Invalid email format"]
  }
}
```

## Examples

### Basic Validation
```typescript
import { validateRequestBody, upgradeSubscriptionSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const validation = await validateRequestBody(request, upgradeSubscriptionSchema);
  
  if (!validation.success) {
    return validation.error;
  }
  
  const { newTier } = validation.data;
  // newTier is guaranteed to be a valid tier
}
```

### Optional Fields
```typescript
import { validateRequestBody, cancelSubscriptionSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const validation = await validateRequestBody(request, cancelSubscriptionSchema);
  
  if (!validation.success) {
    return validation.error;
  }
  
  const { reason } = validation.data;
  // reason is optional and validated if provided
}
```

### ID Format Validation
```typescript
import { validateRequestBody, getSessionDetailsSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const validation = await validateRequestBody(request, getSessionDetailsSchema);
  
  if (!validation.success) {
    return validation.error;
  }
  
  const { sessionId } = validation.data;
  // sessionId is guaranteed to start with "cs_"
}
```

## Testing Validation

```typescript
import { checkoutSchema } from '@/lib/validation';

// Valid data
const valid = checkoutSchema.safeParse({
  tier: 'essential',
  billingCycle: 'annual',
  couponCode: 'SAVE20'
});
// valid.success === true
// valid.data.couponCode === 'SAVE20' (uppercased)

// Invalid data
const invalid = checkoutSchema.safeParse({
  tier: 'invalid-tier',
  billingCycle: 'monthly'
});
// invalid.success === false
// invalid.error contains validation errors
```

## Benefits

1. **Type Safety** - Full TypeScript inference for validated data
2. **Consistent Errors** - Standardized error format across all routes
3. **Data Transformation** - Automatic normalization (trim, uppercase, etc.)
4. **Single Source of Truth** - One schema per route, reusable primitives
5. **Easy to Maintain** - Add new schemas in one place, use everywhere
6. **Self-Documenting** - Schemas define the API contract

## Adding New Schemas

1. Add primitive schemas to `common.ts` if reusable
2. Add route-specific schemas to appropriate domain file
3. Export from `index.ts` (already done with `export *`)
4. Use with `validateRequestBody()` utility
