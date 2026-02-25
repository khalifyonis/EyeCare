import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const roles = await prisma.role.findMany(); // Using lowercase model name 'role' as Prisma client typically maps them
        console.log('--- Roles ---');
        console.log(JSON.stringify(roles, null, 2));

        const users = await prisma.user.findMany({
            include: {
                role: true,
            },
        });
        console.log('\n--- Users ---');
        console.log(JSON.stringify(users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role.name
        })), null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
