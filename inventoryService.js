"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const crypto_1 = require("crypto");
const db_1 = require("../db");
class InventoryService {
    /**
     * Deduct stock within an existing database transaction for guaranteed atomicity
     */
    static async deductStockWithTrx(trx, items, changeType, referenceId) {
        for (const item of items) {
            const product = await trx.queryOne('SELECT id, name, current_stock FROM products WHERE id = $1', [item.productId]);
            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found.`);
            }
            if (product.current_stock < item.quantity) {
                throw new Error(`Insufficient stock for "${product.name}". Available: ${product.current_stock}, Requested: ${item.quantity}`);
            }
            // Atomic conditional update to prevent race conditions and overselling
            const updateRes = await trx.query('UPDATE products SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND current_stock >= $1', [item.quantity, item.productId]);
            if (updateRes.count === 0) {
                throw new Error(`Concurrent conflict: Insufficient stock for "${product.name}".`);
            }
            const newStock = product.current_stock - item.quantity;
            await trx.query(`INSERT INTO inventory_logs (id, product_id, change_type, reference_id, quantity_changed, stock_after_change)
         VALUES ($1, $2, $3, $4, $5, $6)`, [(0, crypto_1.randomUUID)(), item.productId, changeType, referenceId, -item.quantity, newStock]);
        }
    }
    /**
     * Deduct stock for an Online Order or In-Store Sale atomically
     */
    static async deductStock(items, changeType, referenceId) {
        await (0, db_1.runTransaction)(async (trx) => {
            await InventoryService.deductStockWithTrx(trx, items, changeType, referenceId);
        });
    }
    /**
     * Increase stock from a Supplier Purchase within an existing database transaction
     */
    static async addStockFromSupplierWithTrx(trx, items, referenceId) {
        for (const item of items) {
            const product = await trx.queryOne('SELECT id, current_stock FROM products WHERE id = $1', [item.productId]);
            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found.`);
            }
            const newStock = product.current_stock + item.quantity;
            await trx.query('UPDATE products SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [item.quantity, item.productId]);
            await trx.query(`INSERT INTO inventory_logs (id, product_id, change_type, reference_id, quantity_changed, stock_after_change)
         VALUES ($1, $2, 'SUPPLIER_PURCHASE', $3, $4, $5)`, [(0, crypto_1.randomUUID)(), item.productId, referenceId, item.quantity, newStock]);
        }
    }
    /**
     * Increase stock from a Supplier Purchase
     */
    static async addStockFromSupplier(items, referenceId) {
        await (0, db_1.runTransaction)(async (trx) => {
            await InventoryService.addStockFromSupplierWithTrx(trx, items, referenceId);
        });
    }
    /**
     * Get Low Stock Alerts based on configured min_stock_alert threshold
     */
    static async getLowStockProducts() {
        const res = await (0, db_1.query)(`SELECT p.id, p.name, p.sku_barcode, p.current_stock, p.min_stock_alert, p.unit, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.current_stock <= p.min_stock_alert AND p.is_active = 1
       ORDER BY p.current_stock ASC`);
        return res.rows;
    }
}
exports.InventoryService = InventoryService;
