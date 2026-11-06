"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSController = void 0;
const crypto_1 = require("crypto");
const db_1 = require("../db");
const inventoryService_1 = require("../services/inventoryService");
class POSController {
    static async createInStoreSale(req, res) {
        try {
            const authorizedRoles = ['ADMIN', 'STAFF', 'ADMIN_STAFF'];
            if (!req.user || !authorizedRoles.includes(req.user.role)) {
                return res.status(403).json({ success: false, error: 'Only authorized shop staff or admin can create in-store sales.' });
            }
            const { items, discount_amount, payment_method } = req.body;
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, error: 'Sale items list cannot be empty.' });
            }
            const saleId = (0, crypto_1.randomUUID)();
            const invoiceNumber = `STT-POS-${Date.now().toString().slice(-6)}`;
            const discount = Number(discount_amount || 0);
            let subtotal = 0;
            const saleItemsToInsert = [];
            for (const item of items) {
                if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
                    return res.status(400).json({ success: false, error: 'Invalid product or quantity in sale items.' });
                }
                const product = await (0, db_1.queryOne)(`SELECT id, name, selling_price, current_stock FROM products WHERE id = $1 AND is_active = 1`, [item.productId]);
                if (!product) {
                    return res.status(400).json({ success: false, error: `Product with ID ${item.productId} not found or inactive.` });
                }
                const quantity = Number(item.quantity);
                const itemTotal = product.selling_price * quantity;
                subtotal += itemTotal;
                saleItemsToInsert.push({
                    productId: product.id,
                    productName: product.name,
                    unitPrice: product.selling_price,
                    quantity,
                    totalPrice: itemTotal
                });
            }
            const totalAmount = Math.max(0, subtotal - discount);
            // Atomic DB Transaction: Stock deduction, inventory audit logging, sale header, and sale items
            await (0, db_1.runTransaction)(async (trx) => {
                // 1. Atomically deduct inventory inside this transaction
                await inventoryService_1.InventoryService.deductStockWithTrx(trx, saleItemsToInsert.map((i) => ({ productId: i.productId, quantity: i.quantity })), 'IN_STORE_SALE', saleId);
                // 2. Insert In-Store Sale Header
                await trx.query(`INSERT INTO in_store_sales (id, invoice_number, staff_id, subtotal, discount_amount, total_amount, payment_method)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [saleId, invoiceNumber, req.user.id, subtotal, discount, totalAmount, payment_method || 'CASH']);
                // 3. Insert Sale Items
                for (const item of saleItemsToInsert) {
                    await trx.query(`INSERT INTO in_store_sale_items (id, sale_id, product_id, product_name, unit_price, quantity, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [(0, crypto_1.randomUUID)(), saleId, item.productId, item.productName, item.unitPrice, item.quantity, item.totalPrice]);
                }
            });
            const digitalBill = await POSController.getDigitalInvoiceById(saleId);
            return res.status(201).json({
                success: true,
                message: 'In-store sale completed successfully. Digital bill generated.',
                data: digitalBill
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async listInStoreSales(req, res) {
        try {
            const salesRes = await (0, db_1.query)(`SELECT s.*, u.name as staff_name
         FROM in_store_sales s
         JOIN users u ON s.staff_id = u.id
         ORDER BY s.created_at DESC`);
            const fullSales = [];
            for (const sale of salesRes.rows) {
                const items = await (0, db_1.query)(`SELECT * FROM in_store_sale_items WHERE sale_id = $1`, [sale.id]);
                fullSales.push({ ...sale, items: items.rows });
            }
            return res.json({ success: true, data: fullSales });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getDigitalInvoice(req, res) {
        try {
            const id = req.params.id;
            const invoice = await POSController.getDigitalInvoiceById(id);
            if (!invoice) {
                return res.status(404).json({ success: false, error: 'Digital invoice not found.' });
            }
            return res.json({ success: true, data: invoice });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getDigitalInvoiceById(saleId) {
        const sale = await (0, db_1.queryOne)(`SELECT s.*, u.name as staff_name
       FROM in_store_sales s
       JOIN users u ON s.staff_id = u.id
       WHERE s.id = $1`, [saleId]);
        if (!sale)
            return null;
        const itemsRes = await (0, db_1.query)(`SELECT * FROM in_store_sale_items WHERE sale_id = $1`, [saleId]);
        return {
            shop_name: 'Sri Thirumurugan Traders',
            invoice_number: sale.invoice_number,
            sale_date: sale.created_at,
            staff_name: sale.staff_name,
            payment_method: sale.payment_method,
            subtotal: sale.subtotal,
            discount_amount: sale.discount_amount,
            total_amount: sale.total_amount,
            items: itemsRes.rows
        };
    }
}
exports.POSController = POSController;
