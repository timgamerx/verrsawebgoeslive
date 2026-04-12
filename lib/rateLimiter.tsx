/**
 * Rate Limiter Service
 * Prevents API abuse by limiting request frequency
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Configure rate limit for a specific action
   */
  configure(action: string, config: RateLimitConfig): void {
    this.configs.set(action, config);
  }

  /**
   * Check if action is allowed
   */
  async checkLimit(
    action: string,
    userId: string
  ): Promise<{ allowed: boolean; retryAfter?: number; message?: string }> {
    const config = this.configs.get(action);
    if (!config) {
      // No limit configured, allow by default
      return { allowed: true };
    }

    const key = `${action}:${userId}`;
    const now = Date.now();
    const entry = this.limits.get(key);

    // Check if user is blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      };
    }

    // Reset counter if window expired
    if (!entry || entry.resetTime < now) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { allowed: true };
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      // Block user if configured
      if (config.blockDurationMs) {
        entry.blockedUntil = now + config.blockDurationMs;
      }

      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Reset rate limit for a user
   */
  reset(action: string, userId: string): void {
    const key = `${action}:${userId}`;
    this.limits.delete(key);
  }

  /**
   * Get remaining requests
   */
  getRemaining(action: string, userId: string): number | null {
    const config = this.configs.get(action);
    if (!config) return null;

    const key = `${action}:${userId}`;
    const entry = this.limits.get(key);

    if (!entry || entry.resetTime < Date.now()) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (
        entry.resetTime < now &&
        (!entry.blockedUntil || entry.blockedUntil < now)
      ) {
        this.limits.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Configure default rate limits
rateLimiter.configure("login", {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
});

rateLimiter.configure("password_reset", {
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours block
});

rateLimiter.configure("post_create", {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

rateLimiter.configure("comment", {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
});

rateLimiter.configure("like", {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
});

rateLimiter.configure("message", {
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
});

rateLimiter.configure("upload", {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});

rateLimiter.configure("report", {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
});

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

export default rateLimiter;
