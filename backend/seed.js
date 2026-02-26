import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
    console.log('Seeding roles...');
    const roles = [
        { name: 'SUPERADMIN', description: 'Complete System Access' },
        { name: 'ADMIN', description: 'System Administrator' },
        { name: 'DOCTOR', description: 'Medical Professional' },
        { name: 'RECEPTIONIST', description: 'Front Desk Staff' },
        { name: 'OPTICIAN', description: 'Eyewear Specialist' },
        { name: 'PHARMACIST', description: 'Medication Specialist' },
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: role,
        });
    }

    console.log('Seeding default branch...');
    const mainBranch = await prisma.branch.upsert({
        where: { id: 'main-branch-id' }, // Using a fixed ID for consistency in seed
        update: {},
        create: {
            id: 'main-branch-id',
            branchName: 'Main Branch',
            address: '123 Eye St, Medical District',
            phone: '123-456-7890',
        }
    });

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) throw new Error('ADMIN role not found after seeding');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const usersToSeed = [
        {
            fullName: 'System Admin',
            username: 'admin',
            email: 'admin@eyecare.com',
            password: hashedPassword,
            roleId: adminRole.id,
            branchId: mainBranch.id,
        },
        {
            fullName: 'Yonis',
            username: 'yonis',
            email: 'yonis@eyecare.com',
            password: hashedPassword,
            roleId: adminRole.id, // Giving admin access as requested
            branchId: mainBranch.id,
        }
    ];

    console.log('Checking and seeding users...');
    for (const userData of usersToSeed) {
        const existing = await prisma.user.findUnique({ where: { username: userData.username } });
        if (existing) {
            console.log(`User ${userData.username} already exists. Skipping.`);
        } else {
            const user = await prisma.user.create({ data: userData });
            console.log(`User created: ${user.username}`);
        }
    }

    console.log('Seeding complete.');
    console.log('Credentials:');
    console.log('- username="admin", password="admin123"');
    console.log('- username="yonis", password="admin123"');
    await pool.end();
}

seed().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
});
