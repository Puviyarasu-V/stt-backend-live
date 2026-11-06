"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashToken = hashToken;
exports.generateToken = generateToken;
exports.generateRegistrationToken = generateRegistrationToken;
exports.verifyRegistrationToken = verifyRegistrationToken;
exports.revokeToken = revokeToken;
exports.isTokenRevoked = isTokenRevoked;
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const db_1 = require("../db");
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function generateToken(user) {
    return jsonwebtoken_1.default.sign({
        jti: crypto_1.default.randomUUID(),
        id: user.id,
        name: user.name,
        contact_number: user.contact_number,
        email: user.email,
        role: user.role
    }, config_1.config.jwtSecret, { algorithm: 'HS256', expiresIn: '24h' });
}
function generateRegistrationToken(contactNumber) {
    return jsonwebtoken_1.default.sign({
        purpose: 'REGISTRATION_VERIFIED',
        contact_number: contactNumber
    }, config_1.config.jwtSecret, { algorithm: 'HS256', expiresIn: '15m' });
}
function verifyRegistrationToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret, { algorithms: ['HS256'] });
        if (decoded && decoded.purpose === 'REGISTRATION_VERIFIED' && decoded.contact_number) {
            return { contact_number: decoded.contact_number };
        }
        return null;
    }
    catch {
        return null;
    }
}
async function revokeToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        const tokenH = hashToken(token);
        const expiresAt = decoded && decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
        await (0, db_1.query)(`INSERT OR REPLACE INTO token_blocklist (token_hash, expires_at, created_at) VALUES ($1, $2, $3)`, [tokenH, expiresAt, Date.now()]);
        return true;
    }
    catch (err) {
        console.error('Error revoking token:', err);
        return false;
    }
}
async function isTokenRevoked(token) {
    try {
        const tokenH = hashToken(token);
        const row = await (0, db_1.queryOne)(`SELECT token_hash FROM token_blocklist WHERE token_hash = $1`, [tokenH]);
        return Boolean(row);
    }
    catch {
        return false;
    }
}
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication token required.' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: 'Malformed authorization header.' });
    }
    try {
        // Check if token has been revoked
        const revoked = await isTokenRevoked(token);
        if (revoked) {
            return res.status(401).json({ success: false, error: 'Authentication token has been revoked. Please log in again.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret, { algorithms: ['HS256'] });
        // Validate essential required claims
        if (!decoded || !decoded.id || !decoded.role) {
            return res.status(401).json({ success: false, error: 'Invalid token claims. Required identity claims missing.' });
        }
        const validRoles = ['CUSTOMER', 'ADMIN', 'STAFF', 'ADMIN_STAFF', 'DELIVERY_PARTNER'];
        if (!validRoles.includes(decoded.role)) {
            return res.status(401).json({ success: false, error: 'Invalid token claims. Unknown role.' });
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'Authentication token has expired. Please log in again.' });
        }
        return res.status(401).json({ success: false, error: 'Invalid or expired authentication token.' });
    }
}
