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

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) throw new Error('ADMIN role not found after seeding');

    console.log('Checking for admin user...');
    const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (existing) {
        console.log('Admin user already exists. Skipping user seed.');
    } else {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = await prisma.user.create({
            data: {
                fullName: 'System Admin',
                username: 'admin',
                email: 'admin@eyecare.com',
                password: hashedPassword,
                roleId: adminRole.id,
            },
        });
        console.log('Admin user created:', { id: admin.id, username: admin.username, role: 'ADMIN' });
    }

    console.log('Seeding complete.');
    console.log('Admin credentials: username="admin", password="admin123"');
    await pool.end();
}

seed().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
});
