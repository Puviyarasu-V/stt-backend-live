"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryController = void 0;
const db_1 = require("../db");
class DeliveryController {
    static async getAssignedOrders(req, res) {
        try {
            if (!req.user || req.user.role !== 'DELIVERY_PARTNER') {
                return res.status(403).json({ success: false, error: 'Only assigned delivery partners can view delivery tasks.' });
            }
            const ordersRes = await (0, db_1.query)(`SELECT o.*, c.name as customer_name, c.contact_number as customer_phone
         FROM orders o
         JOIN users c ON o.customer_id = c.id
         WHERE o.assigned_delivery_partner_id = $1
         ORDER BY o.updated_at DESC`, [req.user.id]);
            const fullOrders = [];
            for (const ord of ordersRes.rows) {
                const items = await (0, db_1.query)(`SELECT * FROM order_items WHERE order_id = $1`, [ord.id]);
                fullOrders.push({ ...ord, items: items.rows });
            }
            return res.json({ success: true, data: fullOrders });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async updateDeliveryStatus(req, res) {
        try {
            if (!req.user || req.user.role !== 'DELIVERY_PARTNER') {
                return res.status(403).json({ success: false, error: 'Only delivery partners can update status.' });
            }
            const id = req.params.id;
            const { status, payment_collected } = req.body;
            const allowedStatuses = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
            if (!status || !allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid delivery status. Delivery partners can only update to: ${allowedStatuses.join(', ')}`
                });
            }
            const order = await (0, db_1.queryOne)(`SELECT * FROM orders WHERE id = $1 AND assigned_delivery_partner_id = $2`, [
                id,
                req.user.id
            ]);
            if (!order) {
                return res.status(404).json({ success: false, error: 'Assigned order not found.' });
            }
            let paymentStatus = order.payment_status;
            if (status === 'DELIVERED' && (payment_collected || order.payment_method === 'COD')) {
                paymentStatus = 'PAID';
            }
            await (0, db_1.query)(`UPDATE orders
         SET status = $1, payment_status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`, [status, paymentStatus, id]);
            const updated = await (0, db_1.queryOne)(`SELECT * FROM orders WHERE id = $1`, [id]);
            return res.json({ success: true, message: `Order status updated to ${status}.`, data: updated });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.DeliveryController = DeliveryController;
