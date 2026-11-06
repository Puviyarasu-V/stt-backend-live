"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const productController_1 = require("../controllers/productController");
const orderController_1 = require("../controllers/orderController");
const posController_1 = require("../controllers/posController");
const supplierController_1 = require("../controllers/supplierController");
const deliveryController_1 = require("../controllers/deliveryController");
const reportController_1 = require("../controllers/reportController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// -------------------------------------------------------------
// 1. Auth Routes
// -------------------------------------------------------------
router.post('/auth/login', rateLimiter_1.loginRateLimiter, authController_1.AuthController.login);
router.post('/auth/register', rateLimiter_1.loginRateLimiter, authController_1.AuthController.registerCustomer);
router.post('/auth/send-otp', rateLimiter_1.loginRateLimiter, authController_1.AuthController.sendOtp);
router.post('/auth/verify-otp', rateLimiter_1.loginRateLimiter, authController_1.AuthController.verifyOtp);
router.post('/auth/complete-profile', rateLimiter_1.loginRateLimiter, authController_1.AuthController.completeProfile);
router.post('/auth/logout', auth_1.authenticate, authController_1.AuthController.logout);
router.get('/auth/me', auth_1.authenticate, authController_1.AuthController.me);
router.get('/auth/users', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), authController_1.AuthController.listUsers);
router.get('/admin/customers', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), authController_1.AuthController.listUsers);
router.post('/admin/delivery-partners', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), authController_1.AuthController.createDeliveryPartner);
// -------------------------------------------------------------
// 2. Product & Category Routes
// -------------------------------------------------------------
router.get('/products', productController_1.ProductController.listProducts);
router.get('/products/barcode/:barcode', productController_1.ProductController.getProductByBarcode);
router.get('/products/low-stock', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN', 'STAFF'), productController_1.ProductController.getLowStockAlerts);
router.get('/products/:id', productController_1.ProductController.getProductById);
router.post('/products', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), productController_1.ProductController.createProduct);
router.put('/products/:id', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN', 'STAFF'), productController_1.ProductController.updateProductPriceAndStock);
router.get('/categories', productController_1.ProductController.listCategories);
router.post('/categories', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), productController_1.ProductController.createCategory);
// -------------------------------------------------------------
// 3. Online Orders Routes
// -------------------------------------------------------------
router.post('/orders', auth_1.authenticate, (0, rbac_1.authorizeRoles)('CUSTOMER'), orderController_1.OrderController.placeOrder);
router.get('/orders/my', auth_1.authenticate, (0, rbac_1.authorizeRoles)('CUSTOMER'), orderController_1.OrderController.getCustomerOrders);
router.get('/orders/admin', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN', 'STAFF'), orderController_1.OrderController.listAllOrdersAdmin);
router.get('/orders/:id', auth_1.authenticate, orderController_1.OrderController.getOrderById);
router.put('/orders/:id/status', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN', 'STAFF'), orderController_1.OrderController.updateOrderStatusAdmin);
// -------------------------------------------------------------
// 4. In-Store POS & Digital Bill Routes
// -------------------------------------------------------------
router.post('/pos/sales', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN', 'STAFF'), posController_1.POSController.createInStoreSale);
router.get('/pos/sales', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN', 'STAFF'), posController_1.POSController.listInStoreSales);
router.get('/pos/bills/:id', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN', 'STAFF'), posController_1.POSController.getDigitalInvoice);
// -------------------------------------------------------------
// 5. Supplier Purchases Routes (Admin Only)
// -------------------------------------------------------------
router.get('/suppliers', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), supplierController_1.SupplierController.listSuppliers);
router.post('/suppliers', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), supplierController_1.SupplierController.createSupplier);
router.get('/suppliers/purchases', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), supplierController_1.SupplierController.listPurchases);
router.post('/suppliers/purchases', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), supplierController_1.SupplierController.createSupplierPurchase);
// -------------------------------------------------------------
// 6. Delivery Partner Routes
// -------------------------------------------------------------
router.get('/delivery/orders', auth_1.authenticate, (0, rbac_1.authorizeRoles)('DELIVERY_PARTNER'), deliveryController_1.DeliveryController.getAssignedOrders);
router.put('/delivery/orders/:id/status', auth_1.authenticate, (0, rbac_1.authorizeRoles)('DELIVERY_PARTNER'), deliveryController_1.DeliveryController.updateDeliveryStatus);
// -------------------------------------------------------------
// 7. Executive Reports Routes (Admin Only)
// -------------------------------------------------------------
router.get('/reports/dashboard', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), reportController_1.ReportController.getDashboardSummary);
router.get('/reports/stock-movements', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN', 'STAFF'), reportController_1.ReportController.getStockMovementLogs);
router.get('/reports/sales', auth_1.authenticate, (0, rbac_1.authorizeRoles)('ADMIN'), reportController_1.ReportController.getSalesReport);
exports.default = router;
