"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const config_1 = require("../config");
function createRateLimiter(options) {
    const store = new Map();
    // Cleanup periodically
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of store.entries()) {
            if (now > record.resetTime) {
                store.delete(key);
            }
        }
    }, options.windowMs);
    if (timer.unref) {
        timer.unref();
    }
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket.remoteAddress ||
            'unknown';
        const now = Date.now();
        const record = store.get(ip);
        if (!record || now > record.resetTime) {
            store.set(ip, { count: 1, resetTime: now + options.windowMs });
            return next();
        }
        if (record.count >= options.max) {
            const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfterSec.toString());
            return res.status(429).json({
                success: false,
                error: options.message || `Too many login attempts. Please try again after ${Math.ceil(retryAfterSec / 60)} minute(s).`
            });
        }
        record.count++;
        next();
    };
}
exports.loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config_1.config.isProduction ? 30 : 300, // In production: 30 attempts; in test/dev: 300
    message: 'Too many login attempts from this network. Please try again after 15 minutes.'
});
