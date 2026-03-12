import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

export const listOpticalItems = async (req, res, next) => {
    try {
        const { search, itemType } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query);
        const branchFilter = getBranchFilter(req);

        const whereClause = {
            ...branchFilter,
            ...(itemType ? { itemType: { contains: itemType, mode: 'insensitive' } } : {}),
            ...(search ? {
                OR: [
                    { itemName: { contains: search, mode: 'insensitive' } },
                    { brand: { contains: search, mode: 'insensitive' } },
                    { manufacturer: { contains: search, mode: 'insensitive' } },
                ],
            } : {}),
        };

        const [rows, total] = await Promise.all([
            prisma.opticalItem.findMany({
                where: whereClause,
                orderBy: { itemName: 'asc' },
                skip,
                take,
                include: { branch: { select: { id: true, branchName: true } } },
            }),
            prisma.opticalItem.count({ where: whereClause }),
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getOpticalItemById = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const row = await prisma.opticalItem.findFirst({
            where: { id: req.params.id, ...branchFilter },
            include: { branch: true },
        });
        if (!row) return res.status(404).json({ message: 'Optical item not found' });
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const createOpticalItem = async (req, res, next) => {
    try {
        const branchId = req.body.branchId || req.user.branchId;
        if (!branchId) return res.status(400).json({ message: 'Branch is required' });
        if (req.user.role !== 'SUPERADMIN' && req.user.branchId && branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const data = {
            branchId,
            itemName: req.body.itemName?.trim() || '',
            itemType: req.body.itemType || null,
            brand: req.body.brand || null,
            manufacturer: req.body.manufacturer || null,
            supplierName: req.body.supplierName || null,
            stockQuantity: Number(req.body.stockQuantity) ?? 0,
            reorderLevel: Number(req.body.reorderLevel) ?? 5,
            purchasePrice: Number(req.body.purchasePrice) ?? 0,
            sellingPrice: Number(req.body.sellingPrice) ?? 0,
        };

        const item = await prisma.opticalItem.create({
            data,
            include: { branch: { select: { id: true, branchName: true } } },
        });
        res.status(201).json(item);
    } catch (error) {
        next(error);
    }
};

export const updateOpticalItem = async (req, res, next) => {
    try {
        const existing = await prisma.opticalItem.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Optical item not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const body = req.body;
        const data = {};
        if (body.itemName !== undefined) data.itemName = body.itemName.trim();
        if (body.itemType !== undefined) data.itemType = body.itemType || null;
        if (body.brand !== undefined) data.brand = body.brand || null;
        if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer || null;
        if (body.supplierName !== undefined) data.supplierName = body.supplierName || null;
        if (body.stockQuantity !== undefined) data.stockQuantity = Number(body.stockQuantity);
        if (body.reorderLevel !== undefined) data.reorderLevel = Number(body.reorderLevel);
        if (body.purchasePrice !== undefined) data.purchasePrice = Number(body.purchasePrice);
        if (body.sellingPrice !== undefined) data.sellingPrice = Number(body.sellingPrice);

        const item = await prisma.opticalItem.update({
            where: { id: req.params.id },
            data,
            include: { branch: { select: { id: true, branchName: true } } },
        });
        res.status(200).json(item);
    } catch (error) {
        next(error);
    }
};

export const deleteOpticalItem = async (req, res, next) => {
    try {
        const existing = await prisma.opticalItem.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Optical item not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await prisma.opticalItem.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Optical item deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const receiveOpticalStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchFilter = getBranchFilter(req);

        const item = await prisma.opticalItem.findFirst({
            where: { id, ...branchFilter },
        });
        if (!item) return res.status(404).json({ message: 'Optical item not found' });

        const quantity = Number(req.body.quantity);
        const unitPrice = Number(req.body.unitPrice ?? item.purchasePrice);

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ message: 'Quantity must be a positive integer' });
        }

        const [transaction, updated] = await prisma.$transaction([
            prisma.opticalStockTransaction.create({
                data: {
                    opticalItemId: id,
                    branchId: item.branchId,
                    transactionType: 'IN',
                    quantity,
                    unitPrice,
                    performedById: req.user.id,
                },
            }),
            prisma.opticalItem.update({
                where: { id },
                data: { stockQuantity: { increment: quantity } },
                include: { branch: { select: { id: true, branchName: true } } },
            }),
        ]);

        res.status(200).json({ item: updated, transaction });
    } catch (error) {
        next(error);
    }
};

export const getOpticalStats = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const [total, items] = await Promise.all([
            prisma.opticalItem.count({ where: branchFilter }),
            prisma.opticalItem.findMany({ where: branchFilter, select: { stockQuantity: true, reorderLevel: true } }),
        ]);
        const lowStock = items.filter((i) => Number(i.stockQuantity) <= Number(i.reorderLevel)).length;
        res.status(200).json({ total, lowStock });
    } catch (error) {
        next(error);
    }
};
