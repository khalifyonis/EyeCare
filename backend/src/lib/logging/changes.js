import { SENSITIVE_FIELDS } from './constants.js';

function toComparable(value) {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
        if (Array.isArray(value)) return JSON.stringify(value);
        return JSON.stringify(value);
    }
    return String(value);
}

export function sanitizeForAudit(obj, extraSensitive = []) {
    if (!obj || typeof obj !== 'object') return obj;
    const sensitive = new Set([...SENSITIVE_FIELDS, ...extraSensitive]);
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (sensitive.has(key)) continue;
        if (value instanceof Date) {
            result[key] = value.toISOString();
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = sanitizeForAudit(value, extraSensitive);
        } else {
            result[key] = value;
        }
    }
    return result;
}

export function computeFieldChanges(before, after, fields = null) {
    const oldValues = {};
    const newValues = {};
    const changedFields = [];

    const keys = fields || [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];

    for (const key of keys) {
        if (SENSITIVE_FIELDS.has(key)) continue;
        const oldVal = before?.[key];
        const newVal = after?.[key];
        if (toComparable(oldVal) !== toComparable(newVal)) {
            changedFields.push(key);
            oldValues[key] = oldVal ?? null;
            newValues[key] = newVal ?? null;
        }
    }

    return { oldValues, newValues, changedFields };
}

export function computePermissionChanges(beforePerms, afterPerms) {
    const beforeMap = Object.fromEntries((beforePerms || []).map(p => [p.module, p]));
    const afterMap = Object.fromEntries((afterPerms || []).map(p => [p.module, p]));
    const modules = [...new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)])];

    const added = [];
    const removed = [];
    const changed = [];

    for (const mod of modules) {
        const b = beforeMap[mod];
        const a = afterMap[mod];
        if (!b && a) {
            added.push({ module: mod, permissions: a });
        } else if (b && !a) {
            removed.push({ module: mod, permissions: b });
        } else if (b && a) {
            const diff = {};
            for (const flag of ['canRead', 'canCreate', 'canUpdate', 'canDelete']) {
                if (!!b[flag] !== !!a[flag]) {
                    diff[flag] = { from: !!b[flag], to: !!a[flag] };
                }
            }
            if (Object.keys(diff).length > 0) {
                changed.push({ module: mod, changes: diff });
            }
        }
    }

    return { added, removed, changed };
}
