import { z } from 'zod';

export const StageTransitionSchema = z.object({
  uid: z.string().min(1),
  toStage: z.enum([
    'awaiting_access',
    'ready',
    'in_progress',
    'qa',
    'report_ready',
    'delivered',
  ]),
});

export const SignalProgressActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set_steps'),
    completedStepIds: z.array(z.string()),
  }),
  z.object({
    type: z.literal('set_status'),
    status: z.enum(['pending', 'in_progress', 'done', 'not_applicable']),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('set_note'),
    note: z.string().min(1),
  }),
  z.object({
    type: z.literal('set_phase0'),
    complete: z.boolean(),
  }),
]);

export const SignalProgressPatchSchema = z
  .object({
    uid: z.string().min(1),
    signalKey: z.string().min(1).optional(),
    action: SignalProgressActionSchema,
  })
  .superRefine((data, ctx) => {
    if (data.action.type !== 'set_phase0' && !data.signalKey?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'signalKey is required for this action',
        path: ['signalKey'],
      });
    }
  });

export const QAPatchSchema = z.object({
  uid: z.string().min(1),
  pillar: z.enum(['speed', 'security', 'seo_ai_visibility']),
  status: z.enum(['not_started', 'in_progress', 'passed', 'failed']),
  note: z.string().optional(),
});

const FIX_JOB_STAGES = [
  'awaiting_access',
  'ready',
  'in_progress',
  'qa',
  'report_ready',
  'delivered',
] as const;

export const FixJobsListQuerySchema = z.object({
  stage: z.enum([...FIX_JOB_STAGES, 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
