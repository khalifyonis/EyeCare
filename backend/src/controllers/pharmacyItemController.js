import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

export const listPharmacyItems = async (req, res, next) => {
    try {
        const { search, category, lowStock } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query);
        const branchFilter = getBranchFilter(req);

        const whereClause = {
            ...branchFilter,
            ...(category ? { category: { contains: category, mode: 'insensitive' } } : {}),
            ...(search ? {
                OR: [
                    { itemName: { contains: search, mode: 'insensitive' } },
                    { genericName: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                    { barcode: { contains: search, mode: 'insensitive' } },
                    { batchNumber: { contains: search, mode: 'insensitive' } },
                    { manufacturer: { contains: search, mode: 'insensitive' } },
                ],
            } : {}),
        };

        const wantLowStock = lowStock === '1' || lowStock === 'true';

        if (wantLowStock) {
            const allRows = await prisma.pharmacyItem.findMany({
                where: whereClause,
                orderBy: { itemName: 'asc' },
                include: {
                    branch: { select: { id: true, branchName: true } },
                    supplier: { select: { id: true, name: true } },
                },
            });
            const filtered = allRows.filter((r) => Number(r.stockQuantity) <= Number(r.reorderLevel));
            const paged = filtered.slice(skip, skip + take);
            sendPaginated(res, paged, filtered.length, page, limit);
            return;
        }

        const [rows, total] = await Promise.all([
            prisma.pharmacyItem.findMany({
                where: whereClause,
                orderBy: { itemName: 'asc' },
                skip,
                take,
                include: {
                    branch: { select: { id: true, branchName: true } },
                    supplier: { select: { id: true, name: true } },
                },
            }),
            prisma.pharmacyItem.count({ where: whereClause }),
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getPharmacyItemById = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const row = await prisma.pharmacyItem.findFirst({
            where: { id: req.params.id, ...branchFilter },
            include: { branch: true, supplier: { select: { id: true, name: true } } },
        });
        if (!row) return res.status(404).json({ message: 'Pharmacy item not found' });
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const createPharmacyItem = async (req, res, next) => {
    try {
        const branchId = req.body.branchId || req.user.branchId;
        if (!branchId) return res.status(400).json({ message: 'Branch is required' });
        if (req.user.role !== 'SUPERADMIN' && req.user.branchId && branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        let supplierName = req.body.supplierName || null;
        const supplierId = req.body.supplierId || null;
        if (supplierId && branchId) {
            const sup = await prisma.supplier.findFirst({ where: { id: supplierId, branchId }, select: { name: true } });
            if (sup) supplierName = sup.name;
        }
        const data = {
            branchId,
            supplierId: supplierId || undefined,
            sku: req.body.sku || null,
            barcode: req.body.barcode || null,
            itemName: req.body.itemName?.trim() || '',
            genericName: req.body.genericName || null,
            itemType: req.body.itemType || null,
            category: req.body.category || null,
            strength: req.body.strength || null,
            unitOfMeasure: req.body.unitOfMeasure || null,
            manufacturer: req.body.manufacturer || null,
            supplierName,
            batchNumber: req.body.batchNumber || null,
            stockQuantity: Number(req.body.stockQuantity) ?? 0,
            reorderLevel: Number(req.body.reorderLevel) ?? 10,
            purchasePrice: Number(req.body.purchasePrice) ?? 0,
            sellingPrice: Number(req.body.sellingPrice) ?? 0,
            taxRate: req.body.taxRate !== undefined && req.body.taxRate !== null && req.body.taxRate !== '' ? Number(req.body.taxRate) : null,
            expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
        };

        const item = await prisma.pharmacyItem.create({
            data,
            include: { branch: { select: { id: true, branchName: true } }, supplier: { select: { id: true, name: true } } },
        });
        res.status(201).json(item);
    } catch (error) {
        next(error);
    }
};

export const updatePharmacyItem = async (req, res, next) => {
    try {
        const existing = await prisma.pharmacyItem.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Pharmacy item not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const body = req.body;
        const data = {};
        if (body.sku !== undefined) data.sku = body.sku || null;
        if (body.barcode !== undefined) data.barcode = body.barcode || null;
        if (body.itemName !== undefined) data.itemName = body.itemName.trim();
        if (body.genericName !== undefined) data.genericName = body.genericName || null;
        if (body.itemType !== undefined) data.itemType = body.itemType || null;
        if (body.category !== undefined) data.category = body.category || null;
        if (body.strength !== undefined) data.strength = body.strength || null;
        if (body.unitOfMeasure !== undefined) data.unitOfMeasure = body.unitOfMeasure || null;
        if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer || null;
        if (body.supplierName !== undefined) data.supplierName = body.supplierName || null;
        if (body.supplierId !== undefined) {
            data.supplierId = body.supplierId || null;
            if (body.supplierId) {
                const sup = await prisma.supplier.findFirst({ where: { id: body.supplierId, branchId: existing.branchId }, select: { name: true } });
                if (sup) data.supplierName = sup.name;
            } else {
                data.supplierName = null;
            }
        }
        if (body.batchNumber !== undefined) data.batchNumber = body.batchNumber || null;
        if (body.stockQuantity !== undefined) data.stockQuantity = Number(body.stockQuantity);
        if (body.reorderLevel !== undefined) data.reorderLevel = Number(body.reorderLevel);
        if (body.purchasePrice !== undefined) data.purchasePrice = Number(body.purchasePrice);
        if (body.sellingPrice !== undefined) data.sellingPrice = Number(body.sellingPrice);
        if (body.taxRate !== undefined) data.taxRate = body.taxRate === null || body.taxRate === '' ? null : Number(body.taxRate);
        if (body.expiryDate !== undefined) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;

        const item = await prisma.pharmacyItem.update({
            where: { id: req.params.id },
            data,
            include: { branch: { select: { id: true, branchName: true } }, supplier: { select: { id: true, name: true } } },
        });
        res.status(200).json(item);
    } catch (error) {
        next(error);
    }
};

export const deletePharmacyItem = async (req, res, next) => {
    try {
        const existing = await prisma.pharmacyItem.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Pharmacy item not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await prisma.pharmacyItem.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Pharmacy item deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const receivePharmacyStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchFilter = getBranchFilter(req);

        const item = await prisma.pharmacyItem.findFirst({
            where: { id, ...branchFilter },
        });
        if (!item) return res.status(404).json({ message: 'Pharmacy item not found' });

        const quantity = Number(req.body.quantity);
        const unitPrice = Number(req.body.unitPrice ?? item.purchasePrice);

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ message: 'Quantity must be a positive integer' });
        }

        const [transaction, updated] = await prisma.$transaction([
            prisma.pharmacyStockTransaction.create({
                data: {
                    pharmacyItemId: id,
                    branchId: item.branchId,
                    transactionType: 'IN',
                    quantity,
                    unitPrice,
                    performedById: req.user.id,
                },
            }),
            prisma.pharmacyItem.update({
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

export const adjustPharmacyStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchFilter = getBranchFilter(req);

        const item = await prisma.pharmacyItem.findFirst({
            where: { id, ...branchFilter },
        });
        if (!item) return res.status(404).json({ message: 'Pharmacy item not found' });

        const delta = Number(req.body.quantity);
        if (!Number.isInteger(delta) || delta === 0) {
            return res.status(400).json({ message: 'Quantity must be a non-zero integer (positive to add, negative to reduce)' });
        }

        const newStock = Number(item.stockQuantity) + delta;
        if (newStock < 0) {
            return res.status(400).json({ message: `Stock cannot go below zero. Current: ${item.stockQuantity}, adjustment: ${delta}` });
        }

        const unitPrice = Number(req.body.unitPrice ?? item.purchasePrice ?? 0);

        const [transaction, updated] = await prisma.$transaction([
            prisma.pharmacyStockTransaction.create({
                data: {
                    pharmacyItemId: id,
                    branchId: item.branchId,
                    transactionType: 'ADJUST',
                    quantity: delta,
                    unitPrice,
                    performedById: req.user.id,
                },
            }),
            prisma.pharmacyItem.update({
                where: { id },
                data: { stockQuantity: newStock },
                include: { branch: { select: { id: true, branchName: true } } },
            }),
        ]);

        res.status(200).json({ item: updated, transaction });
    } catch (error) {
        next(error);
    }
};

export const getPharmacyItemTransactions = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchFilter = getBranchFilter(req);

        const item = await prisma.pharmacyItem.findFirst({
            where: { id, ...branchFilter },
            select: { id: true, itemName: true, stockQuantity: true },
        });
        if (!item) return res.status(404).json({ message: 'Pharmacy item not found' });

        const transactions = await prisma.pharmacyStockTransaction.findMany({
            where: { pharmacyItemId: id },
            orderBy: { transactionDate: 'desc' },
            take: 100,
            include: {
                performedBy: { select: { fullName: true } },
            },
        });

        res.status(200).json({ item, transactions });
    } catch (error) {
        next(error);
    }
};

export const listAllPharmacyTransactions = async (req, res, next) => {
    try {
        const { type, from, to } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query, 20, 100);
        const branchFilter = getBranchFilter(req);

        let dateFilter = {};
        if (from && to) {
            const f = new Date(from); f.setHours(0, 0, 0, 0);
            const t = new Date(to); t.setHours(23, 59, 59, 999);
            dateFilter = { transactionDate: { gte: f, lte: t } };
        }

        const where = {
            ...branchFilter,
            ...dateFilter,
            ...(type ? { transactionType: type } : {}),
        };

        const [rows, total] = await Promise.all([
            prisma.pharmacyStockTransaction.findMany({
                where,
                orderBy: { transactionDate: 'desc' },
                skip,
                take,
                include: {
                    pharmacyItem: { select: { id: true, itemName: true, category: true } },
                    performedBy: { select: { id: true, fullName: true } },
                    billing: { select: { id: true, referenceNumber: true } },
                },
            }),
            prisma.pharmacyStockTransaction.count({ where }),
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getPharmacyStats = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const [total, lowStockCount] = await Promise.all([
            prisma.pharmacyItem.count({ where: branchFilter }),
            prisma.pharmacyItem.findMany({ where: branchFilter, select: { stockQuantity: true, reorderLevel: true } }),
        ]);
        const lowStock = lowStockCount.filter((i) => Number(i.stockQuantity) <= Number(i.reorderLevel)).length;
        res.status(200).json({ total, lowStock });
    } catch (error) {
        next(error);
    }
};

export const syncExpiredPharmacyItems = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expired = await prisma.pharmacyItem.findMany({
            where: {
                ...branchFilter,
                expiryDate: { lt: today },
                stockQuantity: { gt: 0 },
            },
            select: {
                id: true,
                branchId: true,
                stockQuantity: true,
                purchasePrice: true,
            },
            take: 500,
        });

        if (expired.length === 0) {
            res.status(200).json({ adjusted: 0 });
            return;
        }

        await prisma.$transaction(
            expired.flatMap((item) => {
                const qty = Number(item.stockQuantity) || 0;
                if (qty <= 0) return [];
                return [
                    prisma.pharmacyStockTransaction.create({
                        data: {
                            pharmacyItemId: item.id,
                            branchId: item.branchId,
                            transactionType: 'ADJUST',
                            quantity: -qty,
                            unitPrice: item.purchasePrice ?? 0,
                            performedById: req.user.id,
                        },
                    }),
                    prisma.pharmacyItem.update({
                        where: { id: item.id },
                        data: { stockQuantity: 0 },
                    }),
                ];
            })
        );

        res.status(200).json({ adjusted: expired.length });
    } catch (error) {
        next(error);
    }
};
