"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importStar(require("crypto"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const config_1 = require("../config");
function hashOtpChallenge(phone, rawOtp) {
    return crypto_1.default.createHash('sha256').update(`${phone}:${rawOtp}`).digest('hex');
}
class AuthController {
    static async login(req, res) {
        try {
            const { contact_number_or_email, password } = req.body;
            if (!contact_number_or_email || !password) {
                return res.status(400).json({ success: false, error: 'Contact number / email and password are required.' });
            }
            const identifier = String(contact_number_or_email).trim();
            const user = await (0, db_1.queryOne)(`SELECT * FROM users WHERE contact_number = $1 OR email = $1`, [identifier]);
            if (!user) {
                return res.status(401).json({ success: false, error: 'Invalid credentials. User not found.' });
            }
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, error: 'Invalid credentials. Password incorrect.' });
            }
            const authUser = {
                id: user.id,
                name: user.name,
                contact_number: user.contact_number,
                email: user.email,
                role: user.role
            };
            const token = (0, auth_1.generateToken)(authUser);
            return res.json({
                success: true,
                message: 'Login successful.',
                data: {
                    user: authUser,
                    token
                }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: 'Server error during login.' });
        }
    }
    static async registerCustomer(req, res) {
        try {
            const { name, contact_number, email, password, address } = req.body;
            if (!name || !contact_number || !password) {
                return res.status(400).json({ success: false, error: 'Name, contact number, and password are required.' });
            }
            const cleanPhone = String(contact_number).trim();
            if (!/^\d{10}$/.test(cleanPhone)) {
                return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
            }
            const cleanEmail = email ? String(email).trim().toLowerCase() : null;
            const existing = await (0, db_1.queryOne)(`SELECT id FROM users WHERE contact_number = $1 OR (email IS NOT NULL AND email = $2)`, [cleanPhone, cleanEmail || '']);
            if (existing) {
                return res.status(400).json({ success: false, error: 'User with this contact number or email already exists.' });
            }
            const password_hash = await bcryptjs_1.default.hash(password, 10);
            const id = (0, crypto_1.randomUUID)();
            // Ensure role is strictly CUSTOMER to prevent privilege escalation
            await (0, db_1.query)(`INSERT INTO users (id, name, contact_number, email, password_hash, role, address)
         VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', $6)`, [id, String(name).trim(), cleanPhone, cleanEmail, password_hash, address ? String(address).trim() : '']);
            const authUser = {
                id,
                name: String(name).trim(),
                contact_number: cleanPhone,
                email: cleanEmail || undefined,
                role: 'CUSTOMER'
            };
            const token = (0, auth_1.generateToken)(authUser);
            return res.status(201).json({
                success: true,
                message: 'Customer registered successfully.',
                data: {
                    user: authUser,
                    token
                }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message || 'Server error during registration.' });
        }
    }
    static async me(req, res) {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthenticated.' });
        }
        const user = await (0, db_1.queryOne)(`SELECT id, name, contact_number, email, role, address, created_at FROM users WHERE id = $1`, [req.user.id]);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        return res.json({ success: true, data: user });
    }
    static async logout(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                if (token) {
                    await (0, auth_1.revokeToken)(token);
                }
            }
            return res.json({ success: true, message: 'Logged out successfully. Session invalidated.' });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: 'Server error during logout.' });
        }
    }
    static async listUsers(req, res) {
        const roleFilter = req.query.role || (req.path.includes('customers') ? 'CUSTOMER' : '');
        let sql = `
      SELECT 
        u.id, 
        u.name, 
        u.contact_number, 
        u.email, 
        u.role, 
        u.address, 
        u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM users u
      LEFT JOIN orders o ON u.id = o.customer_id
    `;
        const params = [];
        if (roleFilter) {
            sql += ` WHERE u.role = $1`;
            params.push(roleFilter);
        }
        sql += ` GROUP BY u.id, u.name, u.contact_number, u.email, u.role, u.address, u.created_at ORDER BY u.created_at DESC`;
        const resData = await (0, db_1.query)(sql, params);
        return res.json({ success: true, data: resData.rows });
    }
    static async createDeliveryPartner(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                return res.status(403).json({ success: false, error: 'Only administrators can create delivery partners.' });
            }
            const { name, contact_number, email, address } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ success: false, error: 'Delivery partner name is required.' });
            }
            const cleanPhone = (contact_number || '').replace(/\D/g, '');
            if (cleanPhone.length !== 10) {
                return res.status(400).json({ success: false, error: 'A valid 10-digit mobile number is required.' });
            }
            const existing = await (0, db_1.queryOne)(`SELECT id FROM users WHERE contact_number = $1`, [cleanPhone]);
            if (existing) {
                return res.status(409).json({ success: false, error: 'A user with this mobile number already exists.' });
            }
            const id = (0, crypto_1.randomUUID)();
            const defaultPassHash = await bcryptjs_1.default.hash('123456', 10);
            await (0, db_1.query)(`INSERT INTO users (id, name, contact_number, email, password_hash, role, address)
         VALUES ($1, $2, $3, $4, $5, 'DELIVERY_PARTNER', $6)`, [id, name.trim(), cleanPhone, email || null, defaultPassHash, address || 'Delivery Hub']);
            return res.status(201).json({
                success: true,
                message: 'Delivery partner created successfully.',
                data: { id, name: name.trim(), contact_number: cleanPhone, role: 'DELIVERY_PARTNER' }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    // -------------------------------------------------------------
    // PHASE 2: Cryptographically Secure OTP Implementation
    // -------------------------------------------------------------
    static async sendOtp(req, res) {
        try {
            const { contact_number } = req.body;
            const cleanPhone = (contact_number || '').toString().trim();
            if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
                return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number.' });
            }
            const now = Date.now();
            // 1. Resend Cooldown Check (60 seconds)
            const recentChallenge = await (0, db_1.queryOne)(`SELECT created_at FROM otp_challenges 
         WHERE contact_number = $1 AND verified = 0 AND created_at > $2
         ORDER BY created_at DESC LIMIT 1`, [cleanPhone, now - 60 * 1000]);
            if (recentChallenge) {
                const waitSeconds = Math.ceil((recentChallenge.created_at + 60 * 1000 - now) / 1000);
                return res.status(429).json({
                    success: false,
                    error: `Please wait ${waitSeconds} second(s) before requesting a new OTP.`
                });
            }
            // 2. Invalidate older pending challenges for this number
            await (0, db_1.query)(`DELETE FROM otp_challenges WHERE contact_number = $1 AND verified = 0`, [cleanPhone]);
            // 3. Cryptographically Secure 6-digit OTP Generation
            const secureOtp = (0, crypto_1.randomInt)(100000, 1000000).toString();
            const otpHash = hashOtpChallenge(cleanPhone, secureOtp);
            const challengeId = (0, crypto_1.randomUUID)();
            const expiresAt = now + 5 * 60 * 1000; // 5 minutes TTL
            // 4. Store Challenge Hash with Expiration
            await (0, db_1.query)(`INSERT INTO otp_challenges (id, contact_number, otp_hash, expires_at, attempts, max_attempts, verified, created_at)
         VALUES ($1, $2, $3, $4, 0, 5, 0, $5)`, [challengeId, cleanPhone, otpHash, expiresAt, now]);
            // In production: Never leak whether the user exists (prevents account enumeration),
            // and NEVER return the OTP value in the response body or logs!
            if (config_1.config.isProduction) {
                return res.json({
                    success: true,
                    message: `If the mobile number is registered or valid, a 6-digit OTP has been sent.`
                });
            }
            // In development mode only: Provide the OTP for local testing convenience
            const existingUser = await (0, db_1.queryOne)(`SELECT name FROM users WHERE contact_number = $1`, [cleanPhone]);
            return res.json({
                success: true,
                message: `OTP sent successfully to +91 ${cleanPhone}.`,
                isExistingUser: Boolean(existingUser),
                userName: existingUser ? existingUser.name : null,
                otp: secureOtp // Provided ONLY in development mode for developer testing
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: 'Error generating verification code.' });
        }
    }
    static async verifyOtp(req, res) {
        try {
            const { contact_number, otp } = req.body;
            const cleanPhone = (contact_number || '').toString().trim();
            const cleanOtp = (otp || '').toString().trim();
            if (!cleanPhone || !cleanOtp) {
                return res.status(400).json({ success: false, error: 'Mobile number and OTP are required.' });
            }
            if (!/^\d{6}$/.test(cleanOtp)) {
                return res.status(400).json({ success: false, error: 'OTP must be a 6-digit numeric code.' });
            }
            // Explicitly reject any old static test bypasses (123456 / 4321) unless that is the actual hash
            const now = Date.now();
            // Retrieve the latest unverified challenge for this contact number
            const challenge = await (0, db_1.queryOne)(`SELECT * FROM otp_challenges 
         WHERE contact_number = $1 AND verified = 0 
         ORDER BY created_at DESC LIMIT 1`, [cleanPhone]);
            if (!challenge) {
                return res.status(400).json({
                    success: false,
                    error: 'No active OTP request found. Please request a new OTP.'
                });
            }
            // Check Expiration
            if (now > challenge.expires_at) {
                await (0, db_1.query)(`DELETE FROM otp_challenges WHERE id = $1`, [challenge.id]);
                return res.status(400).json({
                    success: false,
                    error: 'OTP has expired. Please request a new verification code.'
                });
            }
            // Check Attempt Limit (Brute Force Protection - max 5 attempts)
            if (challenge.attempts >= challenge.max_attempts) {
                await (0, db_1.query)(`DELETE FROM otp_challenges WHERE id = $1`, [challenge.id]);
                return res.status(429).json({
                    success: false,
                    error: 'Maximum verification attempts exceeded. For security, this OTP is invalidated. Please request a new code.'
                });
            }
            // Increment Attempt Counter
            await (0, db_1.query)(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1`, [challenge.id]);
            // Verify OTP Hash
            const enteredHash = hashOtpChallenge(cleanPhone, cleanOtp);
            if (enteredHash !== challenge.otp_hash) {
                const remainingAttempts = challenge.max_attempts - (challenge.attempts + 1);
                return res.status(400).json({
                    success: false,
                    error: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Code invalidated.'}`
                });
            }
            // Invalidate Challenge immediately upon successful verification to prevent replay/reuse
            await (0, db_1.query)(`UPDATE otp_challenges SET verified = 1 WHERE id = $1`, [challenge.id]);
            // Check if user is an existing account
            const user = await (0, db_1.queryOne)(`SELECT id, name, contact_number, email, role, address FROM users WHERE contact_number = $1`, [cleanPhone]);
            if (user) {
                const authUser = {
                    id: user.id,
                    name: user.name,
                    contact_number: user.contact_number,
                    email: user.email,
                    role: user.role,
                    address: user.address
                };
                const token = (0, auth_1.generateToken)(authUser);
                return res.json({
                    success: true,
                    isNewUser: false,
                    message: `Welcome back, ${user.name}!`,
                    data: { user: authUser, token }
                });
            }
            // For New Users: Issue a short-lived cryptographically signed registration token
            // This cryptographically binds profile creation to this verified phone number
            const registrationToken = (0, auth_1.generateRegistrationToken)(cleanPhone);
            return res.json({
                success: true,
                isNewUser: true,
                message: 'Mobile number verified successfully. Please complete your profile.',
                contact_number: cleanPhone,
                registration_token: registrationToken
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: 'Error verifying verification code.' });
        }
    }
    static async completeProfile(req, res) {
        try {
            const { contact_number, name, email, location, registration_token } = req.body;
            const cleanPhone = (contact_number || '').toString().trim();
            const cleanName = (name || '').toString().trim();
            const cleanEmail = (email || '').toString().trim().toLowerCase();
            const cleanLocation = (location || '').toString().trim();
            if (!cleanName) {
                return res.status(400).json({ success: false, error: 'Name is required.' });
            }
            if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                return res.status(400).json({ success: false, error: 'A valid email address is required.' });
            }
            if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
                return res.status(400).json({ success: false, error: 'A valid 10-digit mobile number is required.' });
            }
            // Security Verification: Require proof that OTP was genuinely verified for this phone number
            let isVerified = false;
            // Check 1: Cryptographic Registration Token
            if (registration_token) {
                const verifiedPayload = (0, auth_1.verifyRegistrationToken)(registration_token);
                if (verifiedPayload && verifiedPayload.contact_number === cleanPhone) {
                    isVerified = true;
                }
            }
            // Check 2: Database verified OTP challenge within the last 15 minutes
            if (!isVerified) {
                const recentVerifiedChallenge = await (0, db_1.queryOne)(`SELECT id FROM otp_challenges 
           WHERE contact_number = $1 AND verified = 1 AND created_at > $2
           ORDER BY created_at DESC LIMIT 1`, [cleanPhone, Date.now() - 15 * 60 * 1000]);
                if (recentVerifiedChallenge) {
                    isVerified = true;
                    // Consume the verified challenge
                    await (0, db_1.query)(`DELETE FROM otp_challenges WHERE id = $1`, [recentVerifiedChallenge.id]);
                }
            }
            if (!isVerified) {
                return res.status(403).json({
                    success: false,
                    error: 'Verification required. Please complete OTP verification before registering.'
                });
            }
            // Check if user already exists
            const existing = await (0, db_1.queryOne)(`SELECT id FROM users WHERE contact_number = $1 OR (email IS NOT NULL AND email = $2)`, [cleanPhone, cleanEmail]);
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'An account with this phone number or email already exists. Please log in directly.'
                });
            }
            const id = (0, crypto_1.randomUUID)();
            const randomPass = (0, crypto_1.randomUUID)();
            const passHash = await bcryptjs_1.default.hash(randomPass, 10);
            // Force role = CUSTOMER to strictly prevent self-elevation
            await (0, db_1.query)(`INSERT INTO users (id, name, contact_number, email, password_hash, role, address)
         VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', $6)`, [id, cleanName, cleanPhone, cleanEmail, passHash, cleanLocation]);
            const authUser = {
                id,
                name: cleanName,
                contact_number: cleanPhone,
                email: cleanEmail,
                role: 'CUSTOMER',
                address: cleanLocation
            };
            const token = (0, auth_1.generateToken)(authUser);
            return res.status(201).json({
                success: true,
                message: 'Registration completed successfully!',
                data: { user: authUser, token }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: 'Server error completing profile.' });
        }
    }
}
exports.AuthController = AuthController;
