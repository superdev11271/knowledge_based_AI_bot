interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function rateLimit(config: RateLimitConfig) {
  return function checkRateLimit(identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Clean up expired entries
    Object.keys(store).forEach(key => {
      if (store[key].resetTime < now) {
        delete store[key]
      }
    })

    // Get or create rate limit entry
    if (!store[identifier]) {
      store[identifier] = {
        count: 0,
        resetTime: now + config.windowMs
      }
    }

    // Check if within window
    if (store[identifier].resetTime < now) {
      store[identifier] = {
        count: 0,
        resetTime: now + config.windowMs
      }
    }

    // Check rate limit
    if (store[identifier].count >= config.maxRequests) {
      return false
    }

    // Increment count
    store[identifier].count++
    return true
  }
}

// Default rate limit: 10 requests per minute
export const defaultRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10
})
