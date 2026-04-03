const tenantMiddleware = (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ success: false, message: 'Tenant ID is missing from user context' });
    }

    // Inject tenant into req
    req.tenant = req.user.tenantId;
    next();
};

module.exports = { tenantMiddleware };
