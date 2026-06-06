import prisma from '../src/lib/prisma.js';

async function main() {
    try {
        const users = await prisma.user.findMany({
            include: {
                branch: true,
                staffAssignments: { include: { branch: true } }
            }
        });
        console.log('=== All Users in DB ===');
        for (const u of users) {
            console.log(`ID: ${u.id}`);
            console.log(`Username: ${u.username}`);
            console.log(`FullName: ${u.fullName}`);
            console.log(`Email: ${u.email}`);
            console.log(`Role: ${u.role}`);
            console.log(`Primary Branch: ${u.branch?.branchName} (${u.branchId})`);
            console.log(`Staff Assignments: ${u.staffAssignments.map(sa => sa.branch?.branchName).join(', ')}`);
            console.log('-----------------------------------');
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        process.exit(0);
    }
}

main();
