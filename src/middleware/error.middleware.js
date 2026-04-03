const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

const errorMiddleware = (err, req, res, next) => {
    logger.error(err.message || err);
    return errorResponse(res, err.message || "Internal Server Error", err.statusCode || 500);
};

module.exports = errorMiddleware;
