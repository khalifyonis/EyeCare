import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';
import { getBranchFilter, buildDateFilter, buildSearchFilter, toCsv } from '../lib/logging/queryHelpers.js';

const userSelect = { id: true, fullName: true, username: true, role: true };
const branchSelect = { id: true, branchName: true };

export const listAuditLogs = async (req, res, next) => {
    try {
        const { entityType, action, module, userId, entityId, from, to, search } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query, 20, 100);
        const branchFilter = getBranchFilter(req);

        const where = {
            ...branchFilter,
            ...buildDateFilter(from, to),
            ...(entityType ? { entityType } : {}),
            ...(action ? { action } : {}),
            ...(module ? { module } : {}),
            ...(userId ? { userId } : {}),
            ...(entityId ? { entityId } : {}),
            ...(search ? buildSearchFilter(search, ['summary', 'entityType', 'action']) : {}),
        };

        const [rows, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: {
                    user: { select: userSelect },
                    branch: { select: branchSelect },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getAuditLogById = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const log = await prisma.auditLog.findFirst({
            where: { id: req.params.id, ...branchFilter },
            include: {
                user: { select: userSelect },
                branch: { select: branchSelect },
            },
        });

        if (!log) {
            return res.status(404).json({ message: 'Audit log not found' });
        }

        res.status(200).json(log);
    } catch (error) {
        next(error);
    }
};

export const getAuditLogFilters = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const [entityTypes, actions, modules, users] = await Promise.all([
            prisma.auditLog.findMany({ where: branchFilter, distinct: ['entityType'], select: { entityType: true }, orderBy: { entityType: 'asc' } }),
            prisma.auditLog.findMany({ where: branchFilter, distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
            prisma.auditLog.findMany({ where: { ...branchFilter, module: { not: null } }, distinct: ['module'], select: { module: true }, orderBy: { module: 'asc' } }),
            prisma.auditLog.findMany({
                where: branchFilter,
                distinct: ['userId'],
                select: { user: { select: userSelect } },
                orderBy: { userId: 'asc' },
            }),
        ]);

        res.status(200).json({
            entityTypes: entityTypes.map(r => r.entityType),
            actions: actions.map(r => r.action),
            modules: modules.map(r => r.module).filter(Boolean),
            users: users.map(r => r.user).filter(Boolean),
        });
    } catch (error) {
        next(error);
    }
};

export const getAuditLogStats = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const since = new Date();
        since.setDate(since.getDate() - 7);

        const [total, last7Days, recent, topUsers, topModules, byAction] = await Promise.all([
            prisma.auditLog.count({ where: branchFilter }),
            prisma.auditLog.count({ where: { ...branchFilter, createdAt: { gte: since } } }),
            prisma.auditLog.findMany({
                where: branchFilter,
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { user: { select: userSelect } },
            }),
            prisma.auditLog.groupBy({
                by: ['userId'],
                where: { ...branchFilter, createdAt: { gte: since } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5,
            }),
            prisma.auditLog.groupBy({
                by: ['module'],
                where: { ...branchFilter, createdAt: { gte: since }, module: { not: null } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5,
            }),
            prisma.auditLog.groupBy({
                by: ['action'],
                where: { ...branchFilter, createdAt: { gte: since } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
            }),
        ]);

        const userIds = topUsers.map(u => u.userId);
        const userMap = userIds.length
            ? Object.fromEntries(
                (await prisma.user.findMany({ where: { id: { in: userIds } }, select: userSelect })).map(u => [u.id, u])
            )
            : {};

        res.status(200).json({
            total,
            last7Days,
            recent,
            topUsers: topUsers.map(u => ({
                user: userMap[u.userId] || { id: u.userId },
                count: u._count.id,
            })),
            topModules: topModules.map(m => ({ module: m.module, count: m._count.id })),
            byAction: byAction.map(a => ({ action: a.action, count: a._count.id })),
        });
    } catch (error) {
        next(error);
    }
};

export const exportAuditLogs = async (req, res, next) => {
    try {
        const { entityType, action, module, userId, from, to } = req.query;
        const branchFilter = getBranchFilter(req);

        const where = {
            ...branchFilter,
            ...buildDateFilter(from, to),
            ...(entityType ? { entityType } : {}),
            ...(action ? { action } : {}),
            ...(module ? { module } : {}),
            ...(userId ? { userId } : {}),
        };

        const rows = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 5000,
            include: {
                user: { select: userSelect },
                branch: { select: branchSelect },
            },
        });

        const csv = toCsv(rows, [
            { label: 'Date', get: r => r.createdAt?.toISOString?.() || r.createdAt },
            { label: 'User', get: r => r.user?.fullName || r.user?.username || '' },
            { label: 'Action', get: r => r.action },
            { label: 'Module', get: r => r.module || '' },
            { label: 'Entity Type', get: r => r.entityType },
            { label: 'Entity ID', get: r => r.entityId || '' },
            { label: 'Summary', get: r => r.summary || '' },
            { label: 'Changed Fields', get: r => Array.isArray(r.changedFields) ? r.changedFields.join('; ') : '' },
            { label: 'IP Address', get: r => r.ipAddress || '' },
            { label: 'Branch', get: r => r.branch?.branchName || '' },
        ]);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
};
