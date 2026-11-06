"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierController = void 0;
const crypto_1 = require("crypto");
const db_1 = require("../db");
const inventoryService_1 = require("../services/inventoryService");
class SupplierController {
    static async listSuppliers(req, res) {
        try {
            const suppliers = await (0, db_1.query)(`SELECT * FROM suppliers ORDER BY name ASC`);
            return res.json({ success: true, data: suppliers.rows });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async createSupplier(req, res) {
        try {
            const { name, contact_person, phone, email, address } = req.body;
            if (!name || !contact_person || !phone) {
                return res.status(400).json({ success: false, error: 'Name, contact person, and phone number are required.' });
            }
            const id = (0, crypto_1.randomUUID)();
            await (0, db_1.query)(`INSERT INTO suppliers (id, name, contact_person, phone, email, address)
         VALUES ($1, $2, $3, $4, $5, $6)`, [id, name, contact_person, phone, email || null, address || null]);
            const created = await (0, db_1.queryOne)(`SELECT * FROM suppliers WHERE id = $1`, [id]);
            return res.status(201).json({ success: true, message: 'Supplier added successfully.', data: created });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async createSupplierPurchase(req, res) {
        try {
            const { supplier_id, items } = req.body;
            if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, error: 'Supplier and purchase items are required.' });
            }
            const supplier = await (0, db_1.queryOne)(`SELECT id FROM suppliers WHERE id = $1`, [supplier_id]);
            if (!supplier) {
                return res.status(404).json({ success: false, error: 'Supplier not found.' });
            }
            const purchaseId = (0, crypto_1.randomUUID)();
            const purchaseNumber = `STT-PUR-${Date.now().toString().slice(-6)}`;
            let totalAmount = 0;
            const purchaseItemsToInsert = [];
            for (const item of items) {
                const product = await (0, db_1.queryOne)(`SELECT id, name FROM products WHERE id = $1`, [item.productId]);
                if (!product) {
                    return res.status(400).json({ success: false, error: `Product with ID ${item.productId} not found.` });
                }
                const unitPrice = Number(item.purchaseUnitPrice);
                const qty = Number(item.quantity);
                const itemTotal = unitPrice * qty;
                totalAmount += itemTotal;
                purchaseItemsToInsert.push({
                    productId: product.id,
                    productName: product.name,
                    purchaseUnitPrice: unitPrice,
                    quantity: qty,
                    totalPrice: itemTotal
                });
            }
            // DB Transaction: Atomically insert purchase header, items, and increase stock in inventory
            await (0, db_1.runTransaction)(async (trx) => {
                // 1. Insert Purchase
                await trx.query(`INSERT INTO supplier_purchases (id, purchase_number, supplier_id, total_amount)
           VALUES ($1, $2, $3, $4)`, [purchaseId, purchaseNumber, supplier_id, totalAmount]);
                // 2. Insert Items
                for (const item of purchaseItemsToInsert) {
                    await trx.query(`INSERT INTO supplier_purchase_items (id, purchase_id, product_id, product_name, purchase_unit_price, quantity, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [(0, crypto_1.randomUUID)(), purchaseId, item.productId, item.productName, item.purchaseUnitPrice, item.quantity, item.totalPrice]);
                }
                // 3. Atomically increase stock and write inventory audit logs inside this transaction
                await inventoryService_1.InventoryService.addStockFromSupplierWithTrx(trx, purchaseItemsToInsert.map((i) => ({ productId: i.productId, quantity: i.quantity })), purchaseId);
            });
            const purchaseDetails = await SupplierController.getPurchaseById(purchaseId);
            return res.status(201).json({
                success: true,
                message: 'Supplier purchase recorded. Stock increased in central inventory.',
                data: purchaseDetails
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async listPurchases(req, res) {
        try {
            const purchasesRes = await (0, db_1.query)(`SELECT p.*, s.name as supplier_name, s.contact_person as supplier_contact
         FROM supplier_purchases p
         JOIN suppliers s ON p.supplier_id = s.id
         ORDER BY p.purchase_date DESC`);
            const fullPurchases = [];
            for (const pur of purchasesRes.rows) {
                const items = await (0, db_1.query)(`SELECT * FROM supplier_purchase_items WHERE purchase_id = $1`, [pur.id]);
                fullPurchases.push({ ...pur, items: items.rows });
            }
            return res.json({ success: true, data: fullPurchases });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getPurchaseById(purchaseId) {
        const pur = await (0, db_1.queryOne)(`SELECT p.*, s.name as supplier_name
       FROM supplier_purchases p
       JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1`, [purchaseId]);
        if (!pur)
            return null;
        const items = await (0, db_1.query)(`SELECT * FROM supplier_purchase_items WHERE purchase_id = $1`, [purchaseId]);
        return { ...pur, items: items.rows };
    }
}
exports.SupplierController = SupplierController;
