import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Type definitions for rate limit response
type RateLimitResponse = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

// Initialize Redis and Ratelimit only on server-side
let ratelimit: Ratelimit | null = null;

if (typeof window === "undefined") {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn(
      "⚠️ Upstash Redis credentials missing. Rate limiting will be disabled. " +
      "Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local"
    );
  } else {
    // Initialize Redis client
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // Create Ratelimit instance with sliding window
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      analytics: true,
      prefix: "@upstash/ratelimit",
    });
  }
}

/**
 * Check rate limit for a given identifier (e.g., user ID, IP address, email)
 * 
 * @param identifier - Unique identifier to rate limit (user ID, IP, email, etc.)
 * @returns Promise with rate limit status including success, limit, remaining, and reset timestamp
 * 
 * @example
 * const { success, remaining } = await checkRateLimit(userId);
 * if (!success) {
 *   return res.status(429).json({ error: "Too many requests" });
 * }
 */
export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResponse> {
  // If rate limiting is not configured, allow the request through
  if (!ratelimit) {
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now(),
    };
  }

  try {
    const result = await ratelimit.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // Log error but don't block the request if rate limiting fails
    console.error("Rate limit check failed:", error);
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now(),
    };
  }
}

// Export the ratelimit instance for advanced use cases
export { ratelimit };
