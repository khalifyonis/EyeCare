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

const mailOptions = {
    from: `"EyeCare Test" <${process.env.EMAIL_USER}>`,
    to: 'khalifyonis@gmail.com', // user's gmail
    subject: 'Nodemailer Test External Email',
    text: 'If you see this, email sending works to external addresses as well.',
};

async function test() {
    try {
        console.log('Sending test email to khalifyonis@gmail.com...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Success! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
}

test();
