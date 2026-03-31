import jwt from 'jsonwebtoken';
import 'dotenv/config';
import prisma from '../lib/prisma.js';

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // { id, role, branchId }

        const requestedBranchHeader = req.headers['x-branch-id'];
        const requestedBranchId = typeof requestedBranchHeader === 'string'
            ? requestedBranchHeader.trim()
            : Array.isArray(requestedBranchHeader)
                ? requestedBranchHeader[0]?.trim()
                : '';

        if (requestedBranchId) {
            if (req.user.role === 'SUPERADMIN') {
                req.user.branchId = requestedBranchId;
            } else {
                // Allow the user's primary assigned branch from the token.
                if (req.user.branchId && requestedBranchId === req.user.branchId) {
                    req.user.branchId = requestedBranchId;
                    return next();
                }

                const hasBranchAccess = await prisma.staffAssignment.findFirst({
                    where: {
                        userId: req.user.id,
                        branchId: requestedBranchId,
                    },
                    select: { branchId: true },
                });

                if (!hasBranchAccess) {
                    return res.status(403).json({ message: 'Forbidden. Branch access denied.' });
                }

                req.user.branchId = requestedBranchId;
            }
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
        }
        next();
    };
};
