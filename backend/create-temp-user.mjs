import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const username = 'tempadmin';
    const password = 'Password@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // Get the Admin role ID
        const adminRole = await prisma.role.findUnique({
            where: { name: 'ADMIN' },
        });

        if (!adminRole) {
            console.error('Admin role not found');
            return;
        }

        // Get the first branch ID
        const branch = await prisma.branch.findFirst();
        if (!branch) {
            console.error('No branch found in database');
            return;
        }

        const user = await prisma.user.upsert({
            where: { username },
            update: {
                password: hashedPassword,
            },
            create: {
                username,
                fullName: 'Temporary Admin',
                email: 'temp@eyecare.com',
                password: hashedPassword,
                roleId: adminRole.id,
                branchId: branch.id,
            },
        });

        console.log(`User ${username} created/updated with password: ${password}`);
    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
