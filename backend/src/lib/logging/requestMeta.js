export function extractRequestMeta(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket?.remoteAddress || req.ip || null;

    const userAgent = req.headers['user-agent'] || null;

    return { ipAddress: ip, userAgent };
}

export function resolveBranchId(req, entityBranchId = null) {
    return req?.user?.branchId || entityBranchId || null;
}
