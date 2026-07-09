import { z } from 'zod';

export const HostingContextSchema = z.object({
  uid: z.string().min(1),
  host: z.string().min(1).max(100),
  hostLabel: z.string().max(100).optional(),
  cms: z.string().min(1).max(100),
  cmsVersion: z.string().max(20).optional(),
  plugins: z.array(z.string().min(1).max(100)).max(50),
});
