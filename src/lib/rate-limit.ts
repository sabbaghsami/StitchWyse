// Simple in-memory rate limiter
// For production, use Redis or Upstash

interface RateLimitEntry {
    count: number
    resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up old entries every hour
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
        if (entry.resetAt < now) {
            rateLimitMap.delete(key)
        }
    }
}, 60 * 60 * 1000)

export interface RateLimitConfig {
    requests: number // Max requests
    window: number // Time window in milliseconds
}

export function rateLimit(
    identifier: string,
    config: RateLimitConfig = { requests: 5, window: 60000 }
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const entry = rateLimitMap.get(identifier)

    // No entry or expired window - create new
    if (!entry || entry.resetAt < now) {
        const newEntry: RateLimitEntry = {
            count: 1,
            resetAt: now + config.window,
        }
        rateLimitMap.set(identifier, newEntry)
        return {
            allowed: true,
            remaining: config.requests - 1,
            resetAt: newEntry.resetAt,
        }
    }

    // Increment count
    entry.count++

    // Check if over limit
    if (entry.count > config.requests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.resetAt,
        }
    }

    return {
        allowed: true,
        remaining: config.requests - entry.count,
        resetAt: entry.resetAt,
    }
}
