"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const index_1 = require("./index");
async function runMigrations() {
    console.log('Running database schema migrations...');
    // Users Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_number TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('CUSTOMER', 'ADMIN_STAFF', 'ADMIN', 'STAFF', 'DELIVERY_PARTNER')),
      address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Categories Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Products Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      name_ta TEXT,
      sku_barcode TEXT UNIQUE NOT NULL,
      unit TEXT NOT NULL DEFAULT '1 kg',
      selling_price REAL NOT NULL,
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock_alert REAL NOT NULL DEFAULT 5,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    try {
        await (0, index_1.query)(`ALTER TABLE products ADD COLUMN name_ta TEXT;`);
    }
    catch (e) {
        // Column already exists
    }
    // Orders Table (Online Customer Orders)
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL CHECK (status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'ASSIGNED_TO_DELIVERY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
      payment_method TEXT NOT NULL DEFAULT 'COD',
      delivery_address TEXT NOT NULL,
      assigned_delivery_partner_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Order Items Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity REAL NOT NULL,
      total_price REAL NOT NULL
    );
  `);
    // In-Store Sales Table (POS Counter Sales)
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS in_store_sales (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      staff_id TEXT NOT NULL REFERENCES users(id),
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // In-Store Sale Items Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS in_store_sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES in_store_sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity REAL NOT NULL,
      total_price REAL NOT NULL
    );
  `);
    // Suppliers Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Supplier Purchases Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS supplier_purchases (
      id TEXT PRIMARY KEY,
      purchase_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      total_amount REAL NOT NULL,
      purchase_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Supplier Purchase Items Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS supplier_purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES supplier_purchases(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      purchase_unit_price REAL NOT NULL,
      quantity REAL NOT NULL,
      total_price REAL NOT NULL
    );
  `);
    // Inventory Logs Audit Trail Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      change_type TEXT NOT NULL CHECK (change_type IN ('ONLINE_ORDER', 'IN_STORE_SALE', 'SUPPLIER_PURCHASE', 'MANUAL_ADJUSTMENT')),
      reference_id TEXT NOT NULL,
      quantity_changed REAL NOT NULL,
      stock_after_change REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Reviews Table
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      customer_id TEXT NOT NULL REFERENCES users(id),
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // OTP Challenges Table (Cryptographically Secure OTP Storage)
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS otp_challenges (
      id TEXT PRIMARY KEY,
      contact_number TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
    try {
        await (0, index_1.query)(`CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_challenges (contact_number);`);
    }
    catch (e) {
        // Ignore index creation errors if already present
    }
    // Token Blocklist Table (Session Invalidation & Logout Revocation)
    await (0, index_1.query)(`
    CREATE TABLE IF NOT EXISTS token_blocklist (
      token_hash TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
    try {
        await (0, index_1.query)(`CREATE INDEX IF NOT EXISTS idx_token_exp ON token_blocklist (expires_at);`);
    }
    catch (e) {
        // Ignore index creation errors if already present
    }
    console.log('Database schema migrations completed successfully.');
}
