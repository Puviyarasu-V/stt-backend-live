"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const crypto_1 = require("crypto");
const db_1 = require("../db");
const inventoryService_1 = require("../services/inventoryService");
const tamilNames_1 = require("../db/tamilNames");
class ProductController {
    static async listProducts(req, res) {
        try {
            const { category, search, activeOnly } = req.query;
            let sql = `
        SELECT p.*, c.name as category_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
            const params = [];
            let paramIdx = 1;
            if (activeOnly === 'true') {
                sql += ` AND p.is_active = 1`;
            }
            if (category) {
                sql += ` AND (c.slug = $${paramIdx} OR c.id = $${paramIdx})`;
                params.push(category);
                paramIdx++;
            }
            if (search) {
                sql += ` AND (p.name LIKE $${paramIdx} OR p.name_ta LIKE $${paramIdx} OR p.sku_barcode LIKE $${paramIdx})`;
                params.push(`%${search}%`);
                paramIdx++;
            }
            sql += ` ORDER BY p.name ASC`;
            const result = await (0, db_1.query)(sql, params);
            return res.json({ success: true, data: result.rows });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getProductByBarcode(req, res) {
        try {
            const barcode = req.params.barcode;
            const product = await (0, db_1.queryOne)(`SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.sku_barcode = $1`, [barcode]);
            if (!product) {
                return res.status(404).json({ success: false, error: `Product with barcode/SKU "${barcode}" not found.` });
            }
            return res.json({ success: true, data: product });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getProductById(req, res) {
        try {
            const id = req.params.id;
            const product = await (0, db_1.queryOne)(`SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.id = $1`, [id]);
            if (!product) {
                return res.status(404).json({ success: false, error: 'Product not found.' });
            }
            return res.json({ success: true, data: product });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async createProduct(req, res) {
        try {
            const { category_id, name, name_ta, sku_barcode, unit, selling_price, current_stock, min_stock_alert, image_url } = req.body;
            if (!category_id || !name || !sku_barcode || selling_price === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing mandatory product fields: category_id, name, sku_barcode, and selling_price are required.'
                });
            }
            // Check if SKU exists
            const existing = await (0, db_1.queryOne)(`SELECT id FROM products WHERE sku_barcode = $1`, [sku_barcode]);
            if (existing) {
                return res.status(400).json({ success: false, error: `Product with SKU / Barcode "${sku_barcode}" already exists.` });
            }
            const id = (0, crypto_1.randomUUID)();
            const stock = Number(current_stock || 0);
            const minStock = Number(min_stock_alert || 5);
            const finalNameTa = name_ta || (0, tamilNames_1.getTamilName)(name);
            await (0, db_1.query)(`INSERT INTO products (id, category_id, name, name_ta, sku_barcode, unit, selling_price, current_stock, min_stock_alert, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [id, category_id, name, finalNameTa, sku_barcode, unit || '1 kg', selling_price, stock, minStock, image_url || null]);
            // Inventory log for initial stock creation
            if (stock > 0) {
                await (0, db_1.query)(`INSERT INTO inventory_logs (id, product_id, change_type, reference_id, quantity_changed, stock_after_change)
           VALUES ($1, $2, 'MANUAL_ADJUSTMENT', 'PRODUCT_CREATED', $3, $3)`, [(0, crypto_1.randomUUID)(), id, stock]);
            }
            const created = await (0, db_1.queryOne)(`SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = $1`, [id]);
            return res.status(201).json({ success: true, message: 'Product created successfully.', data: created });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async updateProductPriceAndStock(req, res) {
        try {
            const id = req.params.id;
            const { selling_price, current_stock, min_stock_alert, is_active, image_url } = req.body;
            const existing = await (0, db_1.queryOne)(`SELECT id, current_stock, selling_price, image_url FROM products WHERE id = $1`, [id]);
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Product not found.' });
            }
            const newPrice = selling_price !== undefined ? Number(selling_price) : existing.selling_price;
            const newStock = current_stock !== undefined ? Number(current_stock) : existing.current_stock;
            const newMinStock = min_stock_alert !== undefined ? Number(min_stock_alert) : 5;
            const activeState = is_active !== undefined ? (is_active ? 1 : 0) : 1;
            const newImageUrl = image_url !== undefined ? image_url : existing.image_url;
            await (0, db_1.query)(`UPDATE products
         SET selling_price = $1, current_stock = $2, min_stock_alert = $3, is_active = $4, image_url = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`, [newPrice, newStock, newMinStock, activeState, newImageUrl, id]);
            // Audit log if stock manually adjusted
            if (current_stock !== undefined && newStock !== existing.current_stock) {
                const diff = newStock - existing.current_stock;
                await (0, db_1.query)(`INSERT INTO inventory_logs (id, product_id, change_type, reference_id, quantity_changed, stock_after_change)
           VALUES ($1, $2, 'MANUAL_ADJUSTMENT', 'ADMIN_STOCK_EDIT', $3, $4)`, [(0, crypto_1.randomUUID)(), id, diff, newStock]);
            }
            const updated = await (0, db_1.queryOne)(`SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = $1`, [id]);
            return res.json({ success: true, message: 'Product updated successfully.', data: updated });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async listCategories(req, res) {
        try {
            const categories = await (0, db_1.query)(`SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC`);
            return res.json({ success: true, data: categories.rows });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async createCategory(req, res) {
        try {
            const { name, image_url } = req.body;
            if (!name) {
                return res.status(400).json({ success: false, error: 'Category name is required.' });
            }
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const existing = await (0, db_1.queryOne)(`SELECT id FROM categories WHERE name = $1 OR slug = $2`, [name, slug]);
            if (existing) {
                return res.status(400).json({ success: false, error: 'Category already exists.' });
            }
            const id = (0, crypto_1.randomUUID)();
            await (0, db_1.query)(`INSERT INTO categories (id, name, slug, image_url) VALUES ($1, $2, $3, $4)`, [id, name, slug, image_url || null]);
            const created = await (0, db_1.queryOne)(`SELECT * FROM categories WHERE id = $1`, [id]);
            return res.status(201).json({ success: true, message: 'Category created.', data: created });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getLowStockAlerts(req, res) {
        try {
            const lowStockProducts = await inventoryService_1.InventoryService.getLowStockProducts();
            return res.json({ success: true, data: lowStockProducts });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.ProductController = ProductController;
