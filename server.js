"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const seed_1 = require("./db/seed");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Security Headers Middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (config_1.config.isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});
// Production-Grade CORS Configuration
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser requests (e.g. mobile apps, curl, server-to-server) or matching origins
        if (!origin || !config_1.config.isProduction) {
            return callback(null, true);
        }
        if (config_1.config.allowedCorsOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for untrusted origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Health Liveness Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ONLINE',
        shop: 'Sri Thirumurugan Traders',
        timestamp: new Date().toISOString()
    });
});
// Database Readiness Check
app.get('/api/ready', async (req, res) => {
    try {
        const dbInfo = await (0, db_1.checkDbHealth)();
        res.json({
            status: 'READY',
            shop: 'Sri Thirumurugan Traders',
            database: dbInfo,
            timestamp: new Date().toISOString()
        });
    }
    catch (err) {
        res.status(503).json({
            status: 'NOT_READY',
            error: err.message || 'Database connection unavailable',
            timestamp: new Date().toISOString()
        });
    }
});
// API Routes
app.use('/api', routes_1.default);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'An unexpected internal error occurred on the server.'
    });
});
function backupDatabaseBeforeMigration() {
    try {
        if (config_1.config.sqliteDbPath && fs_1.default.existsSync(config_1.config.sqliteDbPath)) {
            const backupDir = path_1.default.join(path_1.default.dirname(config_1.config.sqliteDbPath), 'backups');
            if (!fs_1.default.existsSync(backupDir)) {
                fs_1.default.mkdirSync(backupDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path_1.default.join(backupDir, `db_pre_migration_${timestamp}.db`);
            fs_1.default.copyFileSync(config_1.config.sqliteDbPath, backupFile);
            console.log(`[Database Safety] Automated pre-migration database backup saved.`);
        }
    }
    catch (backupErr) {
        console.warn('[Database Safety] Backup warning:', backupErr);
    }
}
let serverInstance = null;
async function startServer() {
    try {
        backupDatabaseBeforeMigration();
        await (0, db_1.initDbConnection)();
        await (0, schema_1.runMigrations)();
        await (0, seed_1.seedInitialData)();
        serverInstance = app.listen(config_1.config.port, '0.0.0.0', () => {
            console.log(`=======================================================`);
            console.log(` Sri Thirumurugan Traders Backend API Server Running`);
            console.log(` Port: ${config_1.config.port}`);
            console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`=======================================================`);
        });
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}
async function gracefulShutdown(signal) {
    console.log(`\n[Process] Received ${signal}. Starting graceful shutdown...`);
    if (serverInstance) {
        serverInstance.close(async () => {
            console.log('[Server] HTTP listener closed.');
            await (0, db_1.closeDbConnection)();
            console.log('[Server] Graceful shutdown complete.');
            process.exit(0);
        });
        // Force shutdown after 10s timeout
        setTimeout(() => {
            console.error('[Server] Graceful shutdown timed out after 10s. Forcing exit.');
            process.exit(1);
        }, 10000).unref();
    }
    else {
        await (0, db_1.closeDbConnection)();
        process.exit(0);
    }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
startServer();
