import prisma from '../src/lib/prisma.js';

async function main() {
    try {
        const users = await prisma.user.findMany({
            include: {
                branch: true,
            }
        });
        console.log('--- USERS IN DATABASE ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}`);
            console.log(`Username: ${u.username}`);
            console.log(`FullName: ${u.fullName}`);
            console.log(`Email: ${u.email}`);
            console.log(`Role: ${u.role}`);
            console.log(`Branch: ${u.branch?.branchName}`);
            console.log(`Password (raw/hash): ${u.password}`);
            console.log('-------------------------');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
