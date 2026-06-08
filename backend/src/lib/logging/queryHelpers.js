export const getBranchFilter = (req) =>
    (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

export function buildDateFilter(from, to) {
    if (!from && !to) return {};
    const filter = {};
    if (from) {
        const fromStart = new Date(from);
        fromStart.setHours(0, 0, 0, 0);
        filter.gte = fromStart;
    }
    if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        filter.lte = toEnd;
    }
    return Object.keys(filter).length ? { createdAt: filter } : {};
}

export function buildSearchFilter(search, fields) {
    if (!search?.trim()) return {};
    const term = search.trim();
    return {
        OR: fields.map((field) => ({
            [field]: { contains: term, mode: 'insensitive' },
        })),
    };
}

export function toCsv(rows, columns) {
    const header = columns.map(c => c.label).join(',');
    const lines = rows.map(row =>
        columns.map(c => {
            const val = c.get(row);
            const str = val === null || val === undefined ? '' : String(val);
            return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
    );
    return [header, ...lines].join('\n');
}
