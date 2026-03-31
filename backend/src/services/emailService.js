import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Sends onboarding credentials to a newly created user.
 * @param {string} recipientEmail - The new user's Gmail address.
 * @param {string} fullName - The new user's full name.
 * @param {string} username - The assigned username.
 * @param {string} temporaryPassword - The auto-generated temporary password.
 * @param {string} roleName - The assigned role.
 */
export const sendOnboardingEmail = async (recipientEmail, fullName, username, temporaryPassword, roleName) => {
    const mailOptions = {
        from: `"EyeCare System" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: '🎉 Welcome to EyeCare – Your Account Credentials',
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Welcome to EyeCare</h1>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Your professional account is ready</p>
                </div>
                <div style="padding: 32px 24px;">
                    <p style="color: #334155; font-size: 16px; margin: 0 0 20px;">Hello <strong>${fullName}</strong>,</p>
                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                        Your account has been created with the role <strong style="color: #0f172a;">${roleName}</strong>. 
                        Please use the credentials below to log in.
                    </p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Username</td>
                                <td style="padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; font-family: monospace; text-align: right;">${username}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-top: 1px solid #e2e8f0;">Password</td>
                                <td style="padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: 600; font-family: monospace; text-align: right; border-top: 1px solid #e2e8f0;">${temporaryPassword}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                        <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
                            ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
                        </p>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                        This is an automated message from EyeCare Management System.
                    </p>
                </div>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Onboarding email sent to ${recipientEmail}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Failed to send onboarding email to ${recipientEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};
