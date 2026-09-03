const nodemailer = require("nodemailer");
const { nodeEnv } = require("../config/env");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "SevaSetu AI <no-reply@sevasetu.ai>";

const isSmtpConfigured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

let transporter = null;
if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[EMAIL] SMTP is not configured (SMTP_HOST/PORT/USER/PASS missing from .env). " +
    "OTP emails will be printed to this console instead of actually sent. " +
    "This is a deliberate dev-mode fallback, not a fake success — set real SMTP " +
    "credentials in .env before deploying."
  );
}

async function sendOtpEmail(toEmail, otp) {
  const subject = "Your SevaSetu AI verification code";
  const text = `Your verification code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`;
  const html = `<p>Your verification code is <strong style="font-size:20px">${otp}</strong>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`;

  if (!transporter) {
    // Dev-mode fallback — no real email provider configured.
    // eslint-disable-next-line no-console
    console.log(`\n[EMAIL - DEV MODE] Would send to ${toEmail}: OTP = ${otp}\n`);
    return { devMode: true };
  }

  const info = await transporter.sendMail({ from: EMAIL_FROM, to: toEmail, subject, text, html });
  if (nodeEnv !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[EMAIL] Sent OTP to ${toEmail} (messageId: ${info.messageId})`);
  }
  return { devMode: false, messageId: info.messageId };
}

async function sendSubscriptionWelcomeEmail(toEmail) {
  const subject = "Welcome to SevaSetu AI — You're Subscribed! 🎉";
  const text = `Thank you for subscribing to SevaSetu AI updates!\n\nYou will now receive:\n- New service announcements\n- Exclusive offers & discounts\n- Platform updates & improvements\n\nStay tuned for exciting updates!\n\nTeam SevaSetu AI\nHar Hunar Ko Kaam, Har Kaam Ko Vishwas`;
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #002045 0%, #5E35B1 100%); padding: 40px 30px; text-align: center; border-radius: 0 0 20px 20px;">
        <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0;">SevaSetu AI</h1>
        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0;">Har Hunar Ko Kaam, Har Kaam Ko Vishwas</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #002045; font-size: 22px; margin: 0 0 16px 0;">Welcome! You're Subscribed 🎉</h2>
        <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Thank you for subscribing to SevaSetu AI updates! We're excited to keep you in the loop.
        </p>
        <div style="background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
          <h3 style="color: #5E35B1; font-size: 16px; margin: 0 0 16px 0;">What you'll receive:</h3>
          <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
            <span style="color: #5E35B1; font-size: 18px; margin-right: 10px;">✦</span>
            <div>
              <strong style="color: #002045;">New Services</strong>
              <p style="color: #718096; font-size: 13px; margin: 4px 0 0 0;">Be the first to know when we launch new service categories</p>
            </div>
          </div>
          <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
            <span style="color: #5E35B1; font-size: 18px; margin-right: 10px;">✦</span>
            <div>
              <strong style="color: #002045;">Exclusive Offers</strong>
              <p style="color: #718096; font-size: 13px; margin: 4px 0 0 0;">Special discounts and deals only for subscribers</p>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start;">
            <span style="color: #5E35B1; font-size: 18px; margin-right: 10px;">✦</span>
            <div>
              <strong style="color: #002045;">Platform Updates</strong>
              <p style="color: #718096; font-size: 13px; margin: 4px 0 0 0;">Feature improvements and new tools to make your experience better</p>
            </div>
          </div>
        </div>
        <p style="color: #718096; font-size: 13px; line-height: 1.5; margin: 0;">
          You can unsubscribe at any time. We respect your inbox and will only send you relevant updates.
        </p>
      </div>
      <div style="text-align: center; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
        <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} SevaSetu AI. All rights reserved.</p>
        <p style="color: #a0aec0; font-size: 11px; margin: 4px 0 0 0;">Made with ❤️ in India 🇮🇳</p>
      </div>
    </div>
  `;

  if (!transporter) {
    // eslint-disable-next-line no-console
    console.log(`\n[EMAIL - DEV MODE] Would send subscription welcome to ${toEmail}\n`);
    return { devMode: true };
  }

  const info = await transporter.sendMail({ from: EMAIL_FROM, to: toEmail, subject, text, html });
  if (nodeEnv !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[EMAIL] Sent subscription welcome to ${toEmail} (messageId: ${info.messageId})`);
  }
  return { devMode: false, messageId: info.messageId };
}

module.exports = { sendOtpEmail, sendSubscriptionWelcomeEmail, isSmtpConfigured };
