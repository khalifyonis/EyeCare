import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client.ts';

console.log('DATABASE_URL:', process.env.DATABASE_URL);

// First test raw pg connection
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
    const res = await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected! Time:', res.rows[0].now);
} catch (e) {
    console.error('PostgreSQL connection FAILED:', e.message);
    process.exit(1);
}

// Now test Prisma
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
    const users = await prisma.user.findMany();
    console.log('Prisma SUCCESS! Users:', users.length);
    users.forEach(u => console.log(' -', u.username, u.role));
} catch (e) {
    console.error('Prisma ERROR:', e.message);
    console.error('Full error:', JSON.stringify(e, null, 2));
} finally {
    await pool.end();
    process.exit(0);
}
