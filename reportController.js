"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const db_1 = require("../db");
class ReportController {
    static async getDashboardSummary(req, res) {
        try {
            // 1. Online Sales Totals
            const onlineStats = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as total_orders
         FROM orders WHERE status != 'CANCELLED'`);
            // 2. In-Store Sales Totals
            const inStoreStats = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as total_sales
         FROM in_store_sales`);
            // 3. Supplier Purchases Totals
            const purchaseStats = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(total_amount), 0) as total_spent, COUNT(id) as total_purchases
         FROM supplier_purchases`);
            // 4. Products Count & Low Stock Count
            const productStats = await (0, db_1.queryOne)(`SELECT COUNT(id) as total_products,
                SUM(CASE WHEN current_stock <= min_stock_alert THEN 1 ELSE 0 END) as low_stock_count
         FROM products WHERE is_active = 1`);
            // 5. Total Customers
            const customerStats = await (0, db_1.queryOne)(`SELECT COUNT(id) as total_customers FROM users WHERE role = 'CUSTOMER'`);
            const totalRevenue = (Number(onlineStats?.total_revenue) || 0) + (Number(inStoreStats?.total_revenue) || 0);
            return res.json({
                success: true,
                data: {
                    total_revenue: totalRevenue,
                    online_revenue: Number(onlineStats?.total_revenue || 0),
                    online_orders_count: Number(onlineStats?.total_orders || 0),
                    in_store_revenue: Number(inStoreStats?.total_revenue || 0),
                    in_store_sales_count: Number(inStoreStats?.total_sales || 0),
                    supplier_purchases_spent: Number(purchaseStats?.total_spent || 0),
                    supplier_purchases_count: Number(purchaseStats?.total_purchases || 0),
                    total_products: Number(productStats?.total_products || 0),
                    low_stock_products_count: Number(productStats?.low_stock_count || 0),
                    total_registered_customers: Number(customerStats?.total_customers || 0)
                }
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getStockMovementLogs(req, res) {
        try {
            const logs = await (0, db_1.query)(`SELECT l.*, p.name as product_name, p.sku_barcode
         FROM inventory_logs l
         JOIN products p ON l.product_id = p.id
         ORDER BY l.created_at DESC
         LIMIT 100`);
            return res.json({ success: true, data: logs.rows });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
    static async getSalesReport(req, res) {
        try {
            const onlineOrders = await (0, db_1.query)(`SELECT 'ONLINE' as sale_type, o.id, o.order_number as ref_number, o.created_at as sale_date, o.total_amount, o.payment_method, c.name as customer_or_staff
         FROM orders o
         JOIN users c ON o.customer_id = c.id
         WHERE o.status != 'CANCELLED'`);
            const inStoreSales = await (0, db_1.query)(`SELECT 'IN_STORE' as sale_type, s.id, s.invoice_number as ref_number, s.created_at as sale_date, s.total_amount, s.payment_method, u.name as customer_or_staff
         FROM in_store_sales s
         JOIN users u ON s.staff_id = u.id`);
            const combined = [...onlineOrders.rows, ...inStoreSales.rows].sort((a, b) => (a.sale_date > b.sale_date ? -1 : 1));
            return res.json({ success: true, data: combined });
        }
        catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.ReportController = ReportController;
