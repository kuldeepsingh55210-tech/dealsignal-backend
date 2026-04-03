const successResponse = (res, data, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json({ success: true, message, data });
};

const errorResponse = (res, message = "Error", statusCode = 400) => {
    return res.status(statusCode).json({ success: false, message, data: null });
};

module.exports = { successResponse, errorResponse };
