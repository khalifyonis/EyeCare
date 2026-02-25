import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
    const username = 'admin';
    const password = 'admin123';

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(`User: ${username}`);
        console.log(`Password valid: ${isPasswordValid}`);
        if (!isPasswordValid) {
            console.log(`Stored Hash: ${user.password}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
