/**
 * Parse pagination params from req.query.
 * @param {object} query - req.query
 * @param {number} defaultLimit - default page size (default 20)
 * @param {number} maxLimit - max allowed page size (default 100)
 * @returns {{ skip: number, take: number, page: number, limit: number }}
 */
export function getPaginationParams(query, defaultLimit = 20, maxLimit = 100) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    let limit = parseInt(query.limit, 10) || defaultLimit;
    limit = Math.min(Math.max(1, limit), maxLimit);
    const skip = (page - 1) * limit;
    return { skip, take: limit, page, limit };
}

/**
 * Send paginated JSON response.
 * @param {object} res - Express res
 * @param {Array} data - array of items
 * @param {number} total - total count
 * @param {number} page - current page
 * @param {number} limit - page size
 */
export function sendPaginated(res, data, total, page, limit) {
    const totalPages = Math.ceil(total / limit) || 1;
    res.status(200).json({
        data,
        total,
        page,
        limit,
        totalPages,
    });
}
