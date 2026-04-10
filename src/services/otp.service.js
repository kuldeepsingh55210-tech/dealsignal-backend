const nodemailer = require('nodemailer');

const otps = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOTP = async (mobile, otp) => {
  otps[mobile] = {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
};

const sendOTP = async (mobile, otp, email) => {
  console.log(`\n🔐 OTP for ${mobile}: ${otp}\n`);

  if (!email) return { success: true };

  try {
    await transporter.sendMail({
      from: `"DealSignal CRM" <${process.env.EMAIL}>`,
      to: email,
      subject: '🔐 Your DealSignal Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                    background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 12px;">
          <h2 style="color: #38bdf8; margin-bottom: 8px;">DealSignal CRM</h2>
          <p style="color: #94a3b8; margin-bottom: 32px;">Real Estate Lead Management</p>
          <p style="font-size: 16px; margin-bottom: 16px;">Your login OTP is:</p>
          <div style="background: #1e293b; border: 2px solid #38bdf8; border-radius: 8px;
                      padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px;
                         color: #38bdf8;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">⏰ Valid for <strong style="color: #f1f5f9;">10 minutes</strong> only.</p>
          <p style="color: #94a3b8; font-size: 14px;">🚫 Kisi ke saath share mat karo.</p>
          <hr style="border: 1px solid #1e293b; margin: 24px 0;" />
          <p style="color: #475569; font-size: 12px;">DealSignal — narrowtech.in</p>
        </div>
      `,
    });
    console.log(`✅ OTP email sent to ${email}`);
    return { success: true };
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    return { success: true };
  }
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