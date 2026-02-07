// lib/validation/webhooks.ts
import { z } from 'zod';
import { urlSchema } from './common';

// POST /api/get-og-image
export const getOgImageSchema = z.object({
  url: urlSchema,
});

// Stripe webhook validation handled by Stripe SDK signature verification
// No additional Zod schema needed
