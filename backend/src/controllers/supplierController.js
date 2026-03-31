import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

const getBranchFilter = (req) =>
    (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

export const listSuppliers = async (req, res, next) => {
    try {
        const { search } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query, 20, 500);
        const branchFilter = getBranchFilter(req);

        const where = {
            ...branchFilter,
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            } : {}),
        };

        const [rows, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take,
                include: { branch: { select: { id: true, branchName: true } } },
            }),
            prisma.supplier.count({ where }),
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getSupplierById = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const row = await prisma.supplier.findFirst({
            where: { id: req.params.id, ...branchFilter },
            include: { branch: true },
        });
        if (!row) return res.status(404).json({ message: 'Supplier not found' });
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const createSupplier = async (req, res, next) => {
    try {
        const branchId = req.body.branchId || req.user.branchId;
        if (!branchId) return res.status(400).json({ message: 'Branch is required' });
        if (req.user.role !== 'SUPERADMIN' && req.user.branchId && branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const data = {
            branchId,
            name: req.body.name?.trim() || '',
            phone: req.body.phone?.trim() || null,
            email: req.body.email?.trim() || null,
            address: req.body.address?.trim() || null,
        };

        const supplier = await prisma.supplier.create({
            data,
            include: { branch: { select: { id: true, branchName: true } } },
        });
        res.status(201).json(supplier);
    } catch (error) {
        next(error);
    }
};

export const updateSupplier = async (req, res, next) => {
    try {
        const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Supplier not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const body = req.body;
        const data = {};
        if (body.name !== undefined) data.name = body.name.trim();
        if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
        if (body.email !== undefined) data.email = body.email?.trim() || null;
        if (body.address !== undefined) data.address = body.address?.trim() || null;

        const supplier = await prisma.supplier.update({
            where: { id: req.params.id },
            data,
            include: { branch: { select: { id: true, branchName: true } } },
        });
        res.status(200).json(supplier);
    } catch (error) {
        next(error);
    }
};

export const deleteSupplier = async (req, res, next) => {
    try {
        const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Supplier not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await prisma.supplier.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        next(error);
    }
};

