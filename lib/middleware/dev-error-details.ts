/**
 * Expose error.message in `details` only when NODE_ENV === 'development'.
 * Matches the apiHandler wrapper catch blocks.
 */
export function devOnlyErrorDetails(error: unknown): { details?: string } {
  if (process.env.NODE_ENV !== 'development') {
    return {};
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : undefined;

  return message !== undefined ? { details: message } : {};
}
