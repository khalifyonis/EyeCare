import prisma from '../lib/prisma.js';

const getBranchFilter = (req) =>
    (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

export const listAll = async (req, res, next) => {
    try {
        const { status = 'all', from, to } = req.query;
        const branchFilter = getBranchFilter(req);

        let dateFilter = {};
        if (from && to) {
            const fromStart = new Date(from);
            fromStart.setHours(0, 0, 0, 0);
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            dateFilter = { dueDate: { gte: fromStart, lte: toEnd } };
        }

        const where = {
            ...branchFilter,
            ...dateFilter,
            ...(status !== 'all' ? { status } : {}),
        };

        const [followUps, overdueCount, doneCount, totalCount] = await Promise.all([
            prisma.followUp.findMany({
                where,
                orderBy: { dueDate: 'asc' },
                take: 500,
                include: {
                    patient: { select: { id: true, fullName: true, phone: true } },
                    branch: { select: { id: true, branchName: true } },
                },
            }),
            prisma.followUp.count({ where: { ...branchFilter, status: 'OVERDUE' } }),
            prisma.followUp.count({ where: { ...branchFilter, status: 'DONE' } }),
            prisma.followUp.count({ where: branchFilter }),
        ]);

        res.status(200).json({
            followUps,
            totalCount,
            overdueCount,
            doneCount,
            completionRate: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
        });
    } catch (error) {
        next(error);
    }
};

export const listAll = async (req, res, next) => {
    try {
        const { status = 'all', from, to } = req.query;
        const branchFilter = getBranchFilter(req);

        let dateFilter = {};
        if (from && to) {
            const fromStart = new Date(from);
            fromStart.setHours(0, 0, 0, 0);
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            dateFilter = { dueDate: { gte: fromStart, lte: toEnd } };
        }

        const where = {
            ...branchFilter,
            ...dateFilter,
            ...(status !== 'all' ? { status } : {}),
        };

        const followUps = await prisma.followUp.findMany({
            where,
            orderBy: { dueDate: 'asc' },
            take: 500,
            include: {
                patient: { select: { id: true, fullName: true, phone: true } },
                branch: { select: { id: true, branchName: true } },
            },
        });

        const overdueCount = await prisma.followUp.count({
            where: { ...branchFilter, status: 'OVERDUE' },
        });

        const doneCount = await prisma.followUp.count({
            where: { ...branchFilter, status: 'DONE' },
        });

        const totalCount = await prisma.followUp.count({ where: branchFilter });

        res.status(200).json({
            followUps,
            totalCount,
            overdueCount,
            doneCount,
            completionRate: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
        });
    } catch (error) {
        next(error);
    }
};

export const listByPatient = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { status = 'all' } = req.query;
        const branchFilter = getBranchFilter(req);

        const where = {
            patientId,
            ...branchFilter,
            ...(status !== 'all' ? { status } : {}),
        };

        const followUps = await prisma.followUp.findMany({
            where,
            orderBy: { dueDate: 'asc' },
            include: {
                branch: { select: { id: true, branchName: true } },
            },
        });

        res.status(200).json(followUps);
    } catch (error) {
        next(error);
    }
};

export const listDue = async (req, res, next) => {
    try {
        const { scope = 'week' } = req.query; // 'today' | 'week'
        const branchFilter = getBranchFilter(req);
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        let endDate = endOfToday;
        if (scope === 'week') {
            endDate = new Date(now);
            endDate.setDate(endDate.getDate() + 7);
        }

        const where = {
            ...branchFilter,
            status: 'PENDING',
            dueDate: {
                gte: startOfToday,
                lte: endDate,
            },
        };

        const followUps = await prisma.followUp.findMany({
            where,
            orderBy: { dueDate: 'asc' },
            include: {
                patient: { select: { id: true, fullName: true, phone: true } },
                branch: { select: { id: true, branchName: true } },
            },
        });

        const overdue = await prisma.followUp.count({
            where: {
                ...branchFilter,
                status: 'PENDING',
                dueDate: { lt: startOfToday },
            },
        });

        res.status(200).json({ followUps, overdue });
    } catch (error) {
        next(error);
    }
};

export const markComplete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { completedAppointmentId } = req.body;

        const existing = await prisma.followUp.findFirst({
            where: { id, ...getBranchFilter(req) },
        });
        if (!existing) return res.status(404).json({ message: 'Follow-up not found' });

        const updated = await prisma.followUp.update({
            where: { id },
            data: {
                status: 'DONE',
                ...(completedAppointmentId ? { completedAppointmentId } : {}),
            },
            include: {
                patient: { select: { id: true, fullName: true } },
            },
        });
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

export const cancel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.followUp.findFirst({
            where: { id, ...getBranchFilter(req) },
        });
        if (!existing) return res.status(404).json({ message: 'Follow-up not found' });

        await prisma.followUp.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        res.status(200).json({ message: 'Follow-up cancelled' });
    } catch (error) {
        next(error);
    }
};

