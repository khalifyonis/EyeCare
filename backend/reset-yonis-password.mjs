import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const username = 'yonis';
    const password = 'yonis1862';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.update({
            where: { username },
            data: {
                password: hashedPassword,
            },
        });

        console.log(`User ${username} password reset to: ${password}`);
    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
