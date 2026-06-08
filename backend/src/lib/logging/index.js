import prisma from '../prisma.js';
import { extractRequestMeta, resolveBranchId } from './requestMeta.js';
import { computeFieldChanges, sanitizeForAudit } from './changes.js';

async function safeCreate(model, data) {
    try {
        await prisma[model].create({ data });
    } catch (err) {
        console.error(`${model} create failed:`, err.message);
    }
}

/**
 * Log a general user activity (what happened).
 */
export async function logActivity(req, params) {
    const { branchId, userId, action, module, entityType, entityId = null, details = null } = params;
    const resolvedUserId = userId || req?.user?.id;
    const resolvedBranchId = branchId ?? resolveBranchId(req);
    const meta = req ? extractRequestMeta(req) : {};

    if (!resolvedUserId || !action || !entityType) return;

    await safeCreate('activityLog', {
        branchId: resolvedBranchId,
        userId: resolvedUserId,
        action,
        module: module || null,
        entityType,
        entityId,
        details,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
    });
}

/**
 * Log a security-focused audit entry with before/after values.
 */
export async function logAudit(req, params) {
    const {
        branchId,
        userId,
        action,
        module,
        entityType,
        entityId = null,
        summary = null,
        before = null,
        after = null,
        oldValues: providedOld = null,
        newValues: providedNew = null,
        changedFields: providedChanged = null,
    } = params;

    const resolvedUserId = userId || req?.user?.id;
    const resolvedBranchId = branchId ?? resolveBranchId(req);
    const meta = req ? extractRequestMeta(req) : {};

    if (!resolvedUserId || !action || !entityType) return;

    let oldValues = providedOld;
    let newValues = providedNew;
    let changedFields = providedChanged;

    if (before !== null || after !== null) {
        const sanitizedBefore = sanitizeForAudit(before);
        const sanitizedAfter = sanitizeForAudit(after);
        const diff = computeFieldChanges(sanitizedBefore, sanitizedAfter);
        oldValues = diff.oldValues;
        newValues = diff.newValues;
        changedFields = diff.changedFields;
    }

    if (Array.isArray(changedFields) && changedFields.length === 0 && action === 'UPDATE') {
        return;
    }

    await safeCreate('auditLog', {
        branchId: resolvedBranchId,
        userId: resolvedUserId,
        action,
        module: module || null,
        entityType,
        entityId,
        summary,
        oldValues: oldValues || null,
        newValues: newValues || null,
        changedFields: changedFields || null,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
    });
}

/** @deprecated Use logActivity instead */
export async function createActivityLog(params) {
    return logActivity(null, params);
}

export { extractRequestMeta, resolveBranchId, computeFieldChanges, sanitizeForAudit };
export * from './constants.js';
export * from './changes.js';
