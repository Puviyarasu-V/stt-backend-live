"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const crypto_1 = require("crypto");
const db_1 = require("../db");
const inventoryService_1 = require("../services/inventoryService");
class OrderController {
    static async placeOrder(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'Authentication required to place order.' });
            }
            const { items, delivery_address, payment_method, delivery_fee, payment_status, razorpay_payment_id } = req.body;
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, error: 'Cart items cannot be empty.' });
            }
            if (!delivery_address) {
                return res.status(400).json({ success: false, error: 'Delivery address is required.' });
            }
            const orderId = (0, crypto_1.randomUUID)();
            const orderNumber = `STT-ORD-${Date.now().toString().slice(-6)}`;
            // Server-side delivery fee calculation
            // Standard local delivery is ₹0; only ADMIN can authorize a delivery fee override
            const SERVER_DEFAULT_DELIVERY_FEE = 0;
            const fee = (req.user.role === 'ADMIN' && delivery_fee !== undefined)
                ? Math.max(0, Number(delivery_fee))
                : SERVER_DEFAULT_DELIVERY_FEE;
            // Validate products and calculate totals using verified current selling prices
            let calculatedSubtotal = 0;
            const orderItemsToInsert = [];
            for (const item of items) {
                if (!item.productId || !item.quantity || Number(item.quantity) <= 0) {
                    return res.status(400).json({ success: false, error: 'Invalid product or quantity specified in cart.' });
                }
                let product = await (0, db_1.queryOne)(`SELECT id, name, selling_price, current_stock FROM products WHERE id = $1 AND is_active = 1`, [item.productId]);
                if (!product && (item.productName || item.name)) {
                    product = await (0, db_1.queryOne)(`SELECT id, name, selling_price, current_stock FROM products WHERE name = $1 AND is_active = 1`, [item.productName || item.name]);
                }
                if (!product) {
                    return res.status(400).json({ success: false, error: `Product with ID ${item.productId} is unavailable.` });
                }
                // Server-side price calculation and enforcement:
                // Calculate product prices strictly on the server.
                // Client-supplied price overrides from customers are rejected in favor of authoritative product.selling_price.
                // Only an authorized ADMIN can supply a custom price.
                let unitPrice = product.selling_price;
                if (req.user.role === 'ADMIN' && item.customPrice !== undefined && Number(item.customPrice) > 0) {
                    unitPrice = Number(item.customPrice);
                }
                const quantity = Number(item.quantity);
                const itemTotal = unitPrice * quantity;
                calculatedSubtotal += itemTotal;
                orderItemsToInsert.push({
                    productId: product.id,
                    productName: item.selectedUnit ? `${product.name} (${item.selectedUnit})` : product.name,
                    unitPrice,
                    quantity,
                    totalPrice: itemTotal
                });
            }
            const totalAmount = calculatedSubtotal + fee;
            // Payment Status Verification:
            // 1. Cash on Delivery (COD) cannot be pre-paid; it is strictly initialized as 'PENDING'.
            // 2. Online payments marked as 'PAID' require verified payment-provider confirmation
            //    (e.g., valid razorpay_payment_id starting with 'pay_') or admin authorization.
            // 3. Any unverified client claim of 'PAID' without provider confirmation is untrusted and defaults to 'PENDING'.
            const hasValidProviderConfirmation = Boolean(razorpay_payment_id &&
                typeof razorpay_payment_id === 'string' &&
                razorpay_payment_id.trim().startsWith('pay_') &&
                razorpay_payment_id.trim().length >= 10);
            const isCod = typeof payment_method === 'string' && payment_method.toUpperCase().includes('COD');
            let initialPaymentStatus = 'PENDING';
            if (!isCod && payment_status === 'PAID') {
                if (hasValidProviderConfirmation || req.user.role === 'ADMIN') {
                    initialPaymentStatus = 'PAID';
                }
                else {
                    initialPaymentStatus = 'PENDING';
                }
            }
            // Atomic Transaction: Stock check & deduction, inventory audit logging, and order insertion
            await (0, db_1.runTransaction)(async (trx) => {
                // 1. Atomically deduct inventory inside this transaction
                await inventoryService_1.InventoryService.deductStockWithTrx(trx, orderItemsToInsert.map((i) => ({ productId: i.productId, quantity: i.quantity })), 'ONLINE_ORDER', orderId);
                // 2. Insert Order Header
                await trx.query(`INSERT INTO orders (id, order_number, customer_id, status, subtotal, delivery_fee, total_amount, payment_status, payment_method, delivery_address)
           VALUES ($1, $2, $3, 'PLACED', $4, $5, $6, $7, $8, $9)`, [
                    orderId,
                    orderNumber,
                    req.user.id,
                    calculatedSubtotal,
                    fee,
                    totalAmount,
                    initialPaymentStatus,
                    payment_method || 'COD',
                    typeof delivery_address === 'object' ? JSON.stringify(delivery_address) : delivery_address
                ]);
                // 3. Insert Order Items (Preserving exact selling price snapshot)
                for (const item of orderItemsToInsert) {
                    await trx.query(`INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, total_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [(0, crypto_1.randomUUID)(), orderId, item.productId, item.productName, item.unitPrice, item.quantity, item.totalPrice]);
                }
            });
            const placedOrder = await OrderController.getOrderDetailsById(orderId);
            return res.status(201).json({
                success: true,
                message: 'Order placed successfully.',
                data: placedOrder
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getCustomerOrders(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ success: false, error: 'Unauthenticated.' });
            const ordersRes = await (0, db_1.query)(`SELECT o.*, dp.name as delivery_partner_name, dp.contact_number as delivery_partner_phone
         FROM orders o
         LEFT JOIN users dp ON o.assigned_delivery_partner_id = dp.id
         WHERE o.customer_id = $1
         ORDER BY o.created_at DESC`, [req.user.id]);
            const orders = [];
            for (const ord of ordersRes.rows) {
                const itemsRes = await (0, db_1.query)(`SELECT * FROM order_items WHERE order_id = $1`, [ord.id]);
                orders.push({ ...ord, items: itemsRes.rows });
            }
            return res.json({ success: true, data: orders });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getOrderById(req, res) {
        try {
            const id = req.params.id;
            const order = await OrderController.getOrderDetailsById(id);
            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found.' });
            }
            // Customer authorization check (IDOR Protection)
            if (req.user?.role === 'CUSTOMER' && order.customer_id !== req.user.id) {
                return res.status(403).json({ success: false, error: 'Forbidden. Cannot access another customer\'s order.' });
            }
            // Delivery Partner authorization check (IDOR Protection)
            if (req.user?.role === 'DELIVERY_PARTNER' && order.assigned_delivery_partner_id !== req.user.id) {
                return res.status(403).json({ success: false, error: 'Forbidden. Cannot access an unassigned order.' });
            }
            return res.json({ success: true, data: order });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async listAllOrdersAdmin(req, res) {
        try {
            const { status } = req.query;
            let sql = `
        SELECT o.*, c.name as customer_name, c.contact_number as customer_phone,
               dp.name as delivery_partner_name
        FROM orders o
        JOIN users c ON o.customer_id = c.id
        LEFT JOIN users dp ON o.assigned_delivery_partner_id = dp.id
        WHERE 1=1
      `;
            const params = [];
            if (status) {
                sql += ` AND o.status = $1`;
                params.push(status);
            }
            sql += ` ORDER BY o.created_at DESC`;
            const resOrders = await (0, db_1.query)(sql, params);
            const fullOrders = [];
            for (const ord of resOrders.rows) {
                const items = await (0, db_1.query)(`SELECT * FROM order_items WHERE order_id = $1`, [ord.id]);
                fullOrders.push({ ...ord, items: items.rows });
            }
            return res.json({ success: true, data: fullOrders });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async updateOrderStatusAdmin(req, res) {
        try {
            const id = req.params.id;
            const { status, assigned_delivery_partner_id, payment_status } = req.body;
            const validStatuses = ['PLACED', 'ACCEPTED', 'PREPARING', 'ASSIGNED_TO_DELIVERY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ success: false, error: `Invalid order status: ${status}` });
            }
            const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
            if (payment_status && !validPaymentStatuses.includes(payment_status)) {
                return res.status(400).json({ success: false, error: `Invalid payment status: ${payment_status}` });
            }
            const existing = await (0, db_1.queryOne)(`SELECT id, status FROM orders WHERE id = $1`, [id]);
            if (!existing) {
                return res.status(404).json({ success: false, error: 'Order not found.' });
            }
            let sql = `UPDATE orders SET updated_at = CURRENT_TIMESTAMP`;
            const params = [];
            let idx = 1;
            if (status) {
                sql += `, status = $${idx}`;
                params.push(status);
                idx++;
            }
            if (assigned_delivery_partner_id !== undefined) {
                sql += `, assigned_delivery_partner_id = $${idx}`;
                params.push(assigned_delivery_partner_id);
                idx++;
            }
            if (payment_status) {
                sql += `, payment_status = $${idx}`;
                params.push(payment_status);
                idx++;
            }
            sql += ` WHERE id = $${idx}`;
            params.push(id);
            await (0, db_1.query)(sql, params);
            const updated = await OrderController.getOrderDetailsById(id);
            return res.json({ success: true, message: 'Order updated successfully.', data: updated });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getOrderDetailsById(orderId) {
        const ord = await (0, db_1.queryOne)(`SELECT o.*, c.name as customer_name, c.contact_number as customer_phone,
              dp.name as delivery_partner_name, dp.contact_number as delivery_partner_phone
       FROM orders o
       JOIN users c ON o.customer_id = c.id
       LEFT JOIN users dp ON o.assigned_delivery_partner_id = dp.id
       WHERE o.id = $1`, [orderId]);
        if (!ord)
            return null;
        const itemsRes = await (0, db_1.query)(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
        return { ...ord, items: itemsRes.rows };
    }
}
exports.OrderController = OrderController;
