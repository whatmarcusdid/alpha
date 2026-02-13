/**
 * Type definitions and Zod validation schemas for Delivery Scout API
 * 
 * This file provides both TypeScript types and Zod runtime validation
 * to ensure data integrity before writing to Firestore.
 * 
 * All actions require a userId to identify which customer's data to modify.
 */

import { z } from 'zod';

// ============================================================================
// SHARED VALIDATION SCHEMAS
// ============================================================================

/**
 * Priority levels for tickets
 * P1 = Critical, P2 = High, P3 = Medium, P4 = Low
 */
const PrioritySchema = z.enum(['P1', 'P2', 'P3', 'P4']);

/**
 * Ticket status workflow
 */
const TicketStatusSchema = z.enum(['open', 'in-progress', 'resolved', 'closed']);

/**
 * Site status
 */
const SiteStatusSchema = z.enum(['active', 'provisioning', 'error']);

/**
 * Report type
 */
const ReportTypeSchema = z.enum(['monthly', 'quarterly', 'annual', 'custom']);

/**
 * Subscription tier
 */
const SubscriptionTierSchema = z.enum(['essential', 'advanced', 'premium']);

/**
 * Positive number validation helper
 */
const PositiveNumber = z.number().positive('Must be a positive number');

/**
 * Non-negative number validation helper (allows 0)
 */
const NonNegativeNumber = z.number().nonnegative('Must be a non-negative number (0 or greater)');

/**
 * Non-empty string validation helper
 */
const NonEmptyString = z.string().min(1, 'Cannot be empty');

/**
 * Optional non-empty string (allows undefined, but if provided must not be empty)
 */
const OptionalNonEmptyString = z.string().min(1, 'Cannot be empty').optional();

/**
 * Email validation
 */
const EmailSchema = z.string().email('Must be a valid email address');

/**
 * URL validation
 */
const UrlSchema = z.string().url('Must be a valid URL (e.g., https://example.com)');

// ============================================================================
// ACTION PAYLOAD SCHEMAS
// ============================================================================

/**
 * Schema for update_meeting action
 * At least one field must be provided
 */
export const UpdateMeetingSchema = z.object({
  month: OptionalNonEmptyString,
  day: OptionalNonEmptyString,
  title: OptionalNonEmptyString,
}).refine(
  (data) => data.month || data.day || data.title,
  { message: 'At least one field (month, day, or title) must be provided' }
);

export type UpdateMeetingPayload = z.infer<typeof UpdateMeetingSchema>;

/**
 * Schema for update_metrics action
 * All numeric fields must be non-negative
 * At least one field must be provided
 */
export const UpdateMetricsSchema = z.object({
  // Website performance
  websiteTraffic: NonNegativeNumber.optional(),
  siteSpeedSeconds: NonNegativeNumber.optional(),
  performanceScore: z.number().min(0).max(100).optional(),
  leadsGenerated: NonNegativeNumber.optional(),
  
  // Hours tracking
  supportHoursRemaining: NonNegativeNumber.optional(),
  supportHoursUsed: NonNegativeNumber.optional(),
  maintenanceHoursRemaining: NonNegativeNumber.optional(),
  maintenanceHoursUsed: NonNegativeNumber.optional(),
  
  // Maintenance dates (YYYY-MM-DD format)
  lastBackupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
  lastSecurityScan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
  
  // Support tickets
  ticketsOpen: NonNegativeNumber.optional(),
  ticketsInProgress: NonNegativeNumber.optional(),
  ticketsResolved: NonNegativeNumber.optional(),
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one metric field must be provided' }
);

export type UpdateMetricsPayload = z.infer<typeof UpdateMetricsSchema>;

/**
 * Schema for update_company_info action
 * Validates email and URL formats
 * At least one field must be provided
 */
export const UpdateCompanyInfoSchema = z.object({
  legalName: OptionalNonEmptyString,
  websiteUrl: z.string().url('Website URL must be valid (e.g., https://example.com)').optional().or(z.literal('')),
  yearFounded: OptionalNonEmptyString,
  numEmployees: OptionalNonEmptyString,
  address: OptionalNonEmptyString,
  address2: z.string().optional(), // Can be empty for clearing
  city: OptionalNonEmptyString,
  state: OptionalNonEmptyString,
  zipCode: OptionalNonEmptyString,
  businessService: OptionalNonEmptyString,
  serviceArea: OptionalNonEmptyString,
  email: z.string().email('Email must be valid').optional(),
  phone: OptionalNonEmptyString,
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one company field must be provided' }
);

export type UpdateCompanyInfoPayload = z.infer<typeof UpdateCompanyInfoSchema>;

/**
 * Schema for add_site action
 * Required: name, url
 */
export const AddSiteSchema = z.object({
  name: NonEmptyString,
  url: UrlSchema,
  type: z.enum(['wordpress', 'static', 'ecommerce', 'other']).optional(),
  status: SiteStatusSchema.optional(),
  thumbnailUrl: z.string().url('Thumbnail URL must be valid').optional().or(z.literal('')),
  description: z.string().optional(),
});

export type AddSitePayload = z.infer<typeof AddSiteSchema>;

/**
 * Schema for update_site action
 * Required: siteId
 * At least one update field must be provided
 */
export const UpdateSiteSchema = z.object({
  siteId: NonEmptyString,
  name: OptionalNonEmptyString,
  url: z.string().url('URL must be valid (e.g., https://example.com)').optional(),
  type: z.enum(['wordpress', 'static', 'ecommerce', 'other']).optional(),
  status: SiteStatusSchema.optional(),
  thumbnailUrl: z.string().url('Thumbnail URL must be valid').optional().or(z.literal('')),
  description: z.string().optional(), // Can be empty for clearing description
}).refine(
  (data) => data.name || data.url || data.type || data.status || data.thumbnailUrl !== undefined || data.description !== undefined,
  { message: 'At least one field (name, url, type, status, thumbnailUrl, or description) must be provided for update' }
);

export type UpdateSitePayload = z.infer<typeof UpdateSiteSchema>;

/**
 * Schema for add_report action
 * Required: title, type
 */
export const AddReportSchema = z.object({
  title: NonEmptyString,
  type: ReportTypeSchema,
  content: z.string().optional(),
  summary: OptionalNonEmptyString,
  metrics: z.record(z.string(), z.any()).optional(),
});

export type AddReportPayload = z.infer<typeof AddReportSchema>;

/**
 * Schema for create_ticket action
 * Required: title
 * Creates ticket in top-level supportTickets collection
 */
export const CreateTicketSchema = z.object({
  title: NonEmptyString,
  description: NonEmptyString,
  category: z.enum(['General', 'Billing', 'Technical', 'Sales', 'Maintenance', 'Emergency']).optional(),
  status: z.enum(['Open', 'In Progress', 'Awaiting Customer', 'Resolved', 'Closed', 'Cancelled']).optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  channel: z.enum(['Support Hub', 'Email', 'Phone', 'Chat']).optional(),
  assignedAgentId: OptionalNonEmptyString,
  assignedAgentName: OptionalNonEmptyString,
  customerEmail: z.string().email().optional(),
  customerName: OptionalNonEmptyString,
  internalNotes: z.string().optional(),
});

export type CreateTicketPayload = z.infer<typeof CreateTicketSchema>;

/**
 * Schema for create_user action
 * Required: email, displayName, tier
 * Optional company fields will be added to company object
 */
export const CreateUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  displayName: NonEmptyString,
  tier: SubscriptionTierSchema,
  // Optional company fields
  companyName: OptionalNonEmptyString,
  websiteUrl: z.string().url('Website URL must be valid (e.g., https://example.com)').optional(),
  businessService: OptionalNonEmptyString,
  serviceArea: OptionalNonEmptyString,
  yearFounded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  numEmployees: z.number().int().positive('Number of employees must be positive').optional(),
  address: OptionalNonEmptyString,
  city: OptionalNonEmptyString,
  state: OptionalNonEmptyString,
  zipCode: OptionalNonEmptyString,
});

export type CreateUserPayload = z.infer<typeof CreateUserSchema>;

/**
 * Schema for update_ticket action
 * Required: ticketId
 * At least one update field must be provided
 * Updates ticket in top-level supportTickets collection
 */
export const UpdateTicketSchema = z.object({
  ticketId: NonEmptyString,
  title: OptionalNonEmptyString,
  description: z.string().optional(), // Can be empty for clearing
  category: z.enum(['General', 'Billing', 'Technical', 'Sales', 'Maintenance', 'Emergency']).optional(),
  status: z.enum(['Open', 'In Progress', 'Awaiting Customer', 'Resolved', 'Closed', 'Cancelled']).optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  assignedAgentId: OptionalNonEmptyString,
  assignedAgentName: OptionalNonEmptyString,
  internalNotes: z.string().optional(),
  resolvedAt: z.string().optional(), // ISO date string
  closedAt: z.string().optional(), // ISO date string
}).refine(
  (data) => 
    data.title ||
    data.description !== undefined ||
    data.category ||
    data.status ||
    data.priority ||
    data.assignedAgentId ||
    data.assignedAgentName ||
    data.internalNotes !== undefined ||
    data.resolvedAt ||
    data.closedAt,
  { message: 'At least one field must be provided for update' }
);

export type UpdateTicketPayload = z.infer<typeof UpdateTicketSchema>;

/**
 * Schema for lookup_user action
 * Required: email
 * Retrieves user document by email (read-only)
 */
export const LookupUserSchema = z.object({
  email: z.string().email('Valid email required'),
});

export type LookupUserPayload = z.infer<typeof LookupUserSchema>;

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Available actions that Lindy AI can trigger
 */
export type DeliveryScoutAction =
  | 'create_user'
  | 'lookup_user'
  | 'update_meeting'
  | 'update_metrics'
  | 'update_company_info'
  | 'add_site'
  | 'update_site'
  | 'add_report'
  | 'create_ticket'
  | 'update_ticket';

/**
 * Base request structure that all actions must follow
 */
export interface DeliveryScoutRequest {
  action: DeliveryScoutAction;
  userId: string;
  data: Record<string, any>;
}

/**
 * Standard success response
 */
export interface DeliveryScoutSuccessResponse {
  success: true;
  message?: string;
  action?: string; // Optional - e.g. "lookup_user" for action-specific responses
  [key: string]: any; // Allow additional fields like ticketId, siteId, data, etc.
}

/**
 * Standard error response
 */
export interface DeliveryScoutErrorResponse {
  success: false;
  error: string;
  action?: string; // Optional - e.g. "lookup_user" for action-specific errors
  validationErrors?: string[]; // Array of specific validation error messages
}

/**
 * Union type of all possible responses
 */
export type DeliveryScoutResponse =
  | DeliveryScoutSuccessResponse
  | DeliveryScoutErrorResponse;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates a payload against a Zod schema and returns user-friendly errors
 * 
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Object with success flag and either parsed data or error messages
 */
export function validatePayload<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Extract user-friendly error messages from Zod errors
  const errors = result.error.issues.map((err: any) => {
    const path = err.path.join('.');
    const field = path || 'data';
    
    // Provide user-friendly messages for common error types
    let message = err.message;
    
    // Custom messages for enums
    if (err.code === 'invalid_enum_value') {
      const options = err.options || [];
      if (options.length > 0) {
        message = `Must be one of: ${options.join(', ')}`;
      }
    }
    
    return field ? `${field}: ${message}` : message;
  });
  
  return { success: false, errors };
}

/**
 * Map of actions to their validation schemas
 * Used by the API route to validate incoming payloads
 */
export const ValidationSchemas = {
  create_user: CreateUserSchema,
  lookup_user: LookupUserSchema,
  update_meeting: UpdateMeetingSchema,
  update_metrics: UpdateMetricsSchema,
  update_company_info: UpdateCompanyInfoSchema,
  add_site: AddSiteSchema,
  update_site: UpdateSiteSchema,
  add_report: AddReportSchema,
  create_ticket: CreateTicketSchema,
  update_ticket: UpdateTicketSchema,
} as const;
