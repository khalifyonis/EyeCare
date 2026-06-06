import { sendOnboardingEmail } from '../src/services/emailService.js';
import 'dotenv/config';

async function runTest() {
    console.log('Sending onboarding email via emailService...');
    const res = await sendOnboardingEmail(
        'yoniskhaliif74@gmail.com',
        'Test Yonis',
        'testyonis',
        'pass1234',
        'ADMIN'
    );
    console.log('Result:', res);
    process.exit(0);
}

runTest();
