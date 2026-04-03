const otps = {};

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOTP = async (mobile, otp) => {
    otps[mobile] = {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000
    };
};

const sendOTP = async (mobile, otp) => {
    console.log(`\n🔐 OTP for ${mobile}: ${otp}\n`);
    return { success: true };
};

const verifyOTP = async (mobile, code) => {
    const record = otps[mobile];
    if (!record) return false;
    if (Date.now() > record.expiresAt) return false;
    if (record.otp !== code) return false;
    delete otps[mobile];
    return true;
};

module.exports = { generateOTP, saveOTP, sendOTP, verifyOTP };