"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = authorizeRoles;
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }
        const userRole = req.user.role;
        // Check if user's role satisfies any of allowedRoles:
        const isAllowed = allowedRoles.some((allowed) => {
            if (allowed === userRole)
                return true;
            // ADMIN / ADMIN_STAFF has superuser access to anything marked for ADMIN, STAFF, or ADMIN_STAFF
            if ((userRole === 'ADMIN' || userRole === 'ADMIN_STAFF') && (allowed === 'STAFF' || allowed === 'ADMIN_STAFF' || allowed === 'ADMIN')) {
                return true;
            }
            // STAFF has access if ADMIN_STAFF was permitted (operational routes)
            if (userRole === 'STAFF' && allowed === 'ADMIN_STAFF') {
                return true;
            }
            return false;
        });
        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                error: `Access denied. ${userRole} role does not have permission for this action.`
            });
        }
        next();
    };
}
