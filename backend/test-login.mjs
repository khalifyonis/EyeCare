import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin(username, password) {
    console.log(`Testing login for: ${username}`);
    try {
        const user = await prisma.user.findUnique({
            where: { username },
            include: { role: true },
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User found:', user.username);
        console.log('Stored hash:', user.password);

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Is password valid?', isPasswordValid);

        if (!isPasswordValid) {
            // Just as a test, let's see what the hash of the provided password is
            const newHash = await bcrypt.hash(password, 10);
            console.log('Hash of provided password:', newHash);
        }

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testLogin('yonis', 'yonis1862');
testLogin('tempadmin', 'Password@123');
