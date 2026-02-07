// lib/validation/utils.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Validates request body against a Zod schema
 * Returns validated data or error response
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            fields: fieldErrors,
          },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Type helper to extract TypeScript type from Zod schema
 */
export type InferSchema<T extends z.ZodType<any, any, any>> = z.infer<T>;
