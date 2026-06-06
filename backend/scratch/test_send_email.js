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

async function main() {
    const recipientEmail = 'yoniskhaliif74@gmail.com';
    const mailOptions = {
        from: `"EyeCare System Test" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: '🎉 Test Onboarding Email',
        html: `<p>This is a test email sent from the EyeCare server.</p>`
    };

    try {
        console.log('Sending email...');
        const info = await transporter.sendMail(mailOptions);
        console.log('Success!', info);
    } catch (e) {
        console.error('Failed!', e);
    } finally {
        process.exit(0);
    }
}

main();
