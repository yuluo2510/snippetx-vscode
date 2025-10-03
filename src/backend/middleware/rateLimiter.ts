import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// Simple in-memory rate limiter
interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const cleanUpExpired = () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now >= entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
};

// Run cleanup every 5 minutes
setInterval(cleanUpExpired, 5 * 60 * 1000);

export const rateLimiter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const now = Date.now();
    const windowStart = now - config.rateLimit.windowMs;

    // Get client identifier (prioritize IP, fallback to API key)
    let clientId: string;

    // Try to get from various sources
    if (req.ip) {
        clientId = req.ip;
    } else if (req.headers['x-forwarded-for']) {
        clientId = String(req.headers['x-forwarded-for']).split(',')[0].trim();
    } else if (req.connection?.remoteAddress) {
        clientId = req.connection.remoteAddress;
    } else {
        // Fallback to API key or user agent
        clientId = String(req.query.apiKey || req.headers['user-agent'] || 'unknown');
    }

    // Sanitize client ID (remove colons for IPv6 compatibility)
    clientId = clientId.replace(/:/g, '_');

    const entry = rateLimitStore.get(clientId);

    if (!entry) {
        // First time this client is seen
        rateLimitStore.set(clientId, {
            count: 1,
            resetTime: now + config.rateLimit.windowMs
        });
        return next();
    }

    // Check if this entry has expired
    if (now >= entry.resetTime) {
        // Reset the counter
        entry.count = 1;
        entry.resetTime = now + config.rateLimit.windowMs;
    } else {
        // Increment counter
        entry.count++;
    }

    // Check if limit is exceeded
    if (entry.count > config.rateLimit.maxRequests) {
        const headers = {
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000),
            'X-RateLimit-Limit': String(config.rateLimit.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000))
        };

        res.set(headers);

        return res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds`,
            retryAfter: Math.ceil((entry.resetTime - now) / 1000),
            limit: config.rateLimit.maxRequests,
            remaining: 0,
            reset: entry.resetTime
        });
    }

    // Include rate limit headers in response
    res.set({
        'X-RateLimit-Limit': String(config.rateLimit.maxRequests),
        'X-RateLimit-Remaining': String(Math.max(0, config.rateLimit.maxRequests - entry.count)),
        'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000))
    });

    return next();
};

// Stricter rate limiter for write operations
export const strictRateLimiter = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const now = Date.now();
    const windowStart = now - (5 * 60 * 1000); // 5 minutes
    const maxRequests = 20; // More restrictive for write operations

    let clientId: string;

    if (req.ip) {
        clientId = req.ip;
    } else if (req.headers['x-forwarded-for']) {
        clientId = String(req.headers['x-forwarded-for']).split(',')[0].trim();
    } else if (req.connection?.remoteAddress) {
        clientId = req.connection.remoteAddress;
    } else {
        clientId = String(req.query.apiKey || req.headers['user-agent'] || 'unknown');
    }

    clientId = clientId.replace(/:/g, '_');

    const maxKey = `max_${clientId}`;
    const entry = rateLimitStore.get(maxKey);

    if (!entry) {
        rateLimitStore.set(maxKey, {
            count: 1,
            resetTime: now + (5 * 60 * 1000)
        });
        return next();
    }

    if (now >= entry.resetTime) {
        entry.count = 1;
        entry.resetTime = now + (5 * 60 * 1000);
    } else {
        entry.count++;
    }

    if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

        return res.status(429).json({
            success: false,
            error: 'Too many write requests',
            message: `Write rate limit exceeded. Try again in ${retryAfter} seconds`,
            retryAfter,
            limit: maxRequests,
            remaining: 0
        });
    }

    res.set({
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': String(Math.max(0, maxRequests - entry.count)),
        'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000))
    });

    return next();
};