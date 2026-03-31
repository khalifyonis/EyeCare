import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

const getBranchFilter = (req) =>
    (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

export const listActivityLogs = async (req, res, next) => {
    try {
        const { entityType, action, from, to } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query, 20, 100);
        const branchFilter = getBranchFilter(req);

        let dateFilter = {};
        if (from && to) {
            const fromStart = new Date(from);
            fromStart.setHours(0, 0, 0, 0);
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { gte: fromStart, lte: toEnd } };
        }

        const where = {
            ...branchFilter,
            ...dateFilter,
            ...(entityType ? { entityType } : {}),
            ...(action ? { action } : {}),
        };

        const [rows, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: {
                    user: { select: { id: true, fullName: true, username: true } },
                    branch: { select: { id: true, branchName: true } },
                },
            }),
            prisma.activityLog.count({ where }),
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};
