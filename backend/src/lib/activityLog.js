import prisma from './prisma.js';

export async function createActivityLog(params) {
    const { branchId, userId, action, entityType, entityId = null, details = null } = params;
    if (!branchId || !userId || !action || !entityType) return;
    try {
        await prisma.activityLog.create({
            data: { branchId, userId, action, entityType, entityId, details },
        });
    } catch (err) {
        console.error('Activity log create failed:', err.message);
    }
}
