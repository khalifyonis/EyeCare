import prisma from './src/lib/prisma.js';

async function testStats() {
    try {
        const branchFilter = {}; // SUPERADMIN style
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        console.log('Testing stats with filter:', branchFilter);
        console.log('Today range:', startOfToday, 'to', endOfToday);

        const stats = await Promise.all([
            prisma.billing.count({ where: branchFilter }),
            prisma.billing.count({ where: { ...branchFilter, status: 'UNPAID' } }),
            prisma.billing.count({ where: { ...branchFilter, status: 'PAID' } }),
            prisma.billing.count({ where: { ...branchFilter, status: 'PARTIALLY_PAID' } }),
            prisma.billing.count({ where: { ...branchFilter, status: 'DRAFT' } }),
            prisma.billing.aggregate({
                where: {
                    ...branchFilter,
                    status: 'PAID',
                    createdAt: { gte: startOfToday, lte: endOfToday },
                },
                _sum: { finalAmount: true },
            }),
        ]);

        console.log('Stats result:', stats);
    } catch (error) {
        console.error('Stats test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testStats();
