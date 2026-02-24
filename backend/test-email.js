import { sendOnboardingEmail } from './src/services/emailService.js';

async function testEmail() {
    console.log('Testing email delivery...');
    const result = await sendOnboardingEmail(
        'qaliifyonis@gmail.com',
        'Test Admin',
        'testadmin',
        'temp123!',
        'ADMIN'
    );
    console.log('Test Result:', result);
    process.exit(result.success ? 0 : 1);
}

testEmail();
