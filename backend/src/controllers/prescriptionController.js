import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

const assertBranchAccess = (req, branchId) => {
    if (req.user.role !== 'SUPERADMIN' && req.user.branchId && branchId !== req.user.branchId) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }
};

const normalizeOptionalString = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
};

const prescriptionInclude = {
    branch: { select: { id: true, branchName: true } },
    appointment: {
        include: {
            patient: { select: { id: true, fullName: true, phone: true } },
            doctor: { include: { user: { select: { id: true, fullName: true } } } },
            branch: { select: { id: true, branchName: true } },
        }
    },
    clinicalExam: {
        include: {
            examinedBy: {
                include: {
                    user: { select: { id: true, fullName: true } }
                }
            }
        }
    }
};

async function resolveItemName(itemType, itemId) {
    if (!itemId) return null;
    if (itemType === 'PHARMACY') {
        const item = await prisma.pharmacyItem.findUnique({
            where: { id: itemId },
            select: { itemName: true, category: true, itemType: true },
        });
        return item ? `${item.itemName}${item.itemType ? ` (${item.itemType})` : ''}` : null;
    }
    if (itemType === 'OPTICAL') {
        const item = await prisma.opticalItem.findUnique({
            where: { id: itemId },
            select: { itemName: true, brand: true, itemType: true },
        });
        return item ? `${item.itemName}${item.brand ? ` — ${item.brand}` : ''}` : null;
    }
    return null;
}

async function enrichWithItemNames(rows) {
    return Promise.all(rows.map(async (row) => {
        const plainRow = { ...row };
        plainRow._itemName = await resolveItemName(row.itemType, row.itemId);
        return plainRow;
    }));
}

async function validateAndLookupItem(itemType, itemId, branchId) {
    if (!itemId) return null;
    if (itemType === 'PHARMACY') {
        const item = await prisma.pharmacyItem.findFirst({
            where: { id: itemId, branchId },
        });
        if (!item) {
            const err = new Error('Pharmacy item not found in this branch');
            err.statusCode = 400;
            throw err;
        }
        return item;
    }
    if (itemType === 'OPTICAL') {
        const item = await prisma.opticalItem.findFirst({
            where: { id: itemId, branchId },
        });
        if (!item) {
            const err = new Error('Optical item not found in this branch');
            err.statusCode = 400;
            throw err;
        }
        return item;
    }
    return null;
}

async function deductStock(itemType, itemId, branchId, quantity, userId) {
    if (!itemId) return;
    if (itemType === 'PHARMACY') {
        const item = await prisma.pharmacyItem.findUnique({ where: { id: itemId } });
        if (!item) return;
        if (item.stockQuantity < quantity) {
            const err = new Error(`Insufficient stock: only ${item.stockQuantity} available`);
            err.statusCode = 400;
            throw err;
        }
        await prisma.$transaction([
            prisma.pharmacyItem.update({
                where: { id: itemId },
                data: { stockQuantity: { decrement: quantity } },
            }),
            prisma.pharmacyStockTransaction.create({
                data: {
                    pharmacyItemId: itemId,
                    branchId,
                    transactionType: 'OUT',
                    quantity,
                    unitPrice: item.sellingPrice,
                    performedById: userId,
                },
            }),
        ]);
    } else if (itemType === 'OPTICAL') {
        const item = await prisma.opticalItem.findUnique({ where: { id: itemId } });
        if (!item) return;
        if (item.stockQuantity < quantity) {
            const err = new Error(`Insufficient stock: only ${item.stockQuantity} available`);
            err.statusCode = 400;
            throw err;
        }
        await prisma.$transaction([
            prisma.opticalItem.update({
                where: { id: itemId },
                data: { stockQuantity: { decrement: quantity } },
            }),
            prisma.opticalStockTransaction.create({
                data: {
                    opticalItemId: itemId,
                    branchId,
                    transactionType: 'OUT',
                    quantity,
                    unitPrice: item.sellingPrice,
                    performedById: userId,
                },
            }),
        ]);
    }
}

async function restoreStock(itemType, itemId, branchId, quantity, userId) {
    if (!itemId) return;
    if (itemType === 'PHARMACY') {
        await prisma.$transaction([
            prisma.pharmacyItem.update({
                where: { id: itemId },
                data: { stockQuantity: { increment: quantity } },
            }),
            prisma.pharmacyStockTransaction.create({
                data: {
                    pharmacyItemId: itemId,
                    branchId,
                    transactionType: 'IN',
                    quantity,
                    unitPrice: 0,
                    performedById: userId,
                },
            }),
        ]);
    } else if (itemType === 'OPTICAL') {
        await prisma.$transaction([
            prisma.opticalItem.update({
                where: { id: itemId },
                data: { stockQuantity: { increment: quantity } },
            }),
            prisma.opticalStockTransaction.create({
                data: {
                    opticalItemId: itemId,
                    branchId,
                    transactionType: 'IN',
                    quantity,
                    unitPrice: 0,
                    performedById: userId,
                },
            }),
        ]);
    }
}

export const listPrescriptions = async (req, res, next) => {
    try {
        const { search, itemType = 'all', date } = req.query;

        const whereClause = {
            ...getBranchFilter(req),
            ...(itemType !== 'all' ? { itemType } : {}),
            ...(date
                ? {
                    createdAt: {
                        gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                        lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                    },
                }
                : {}),
            ...(search
                ? {
                    OR: [
                        { itemType: { contains: search, mode: 'insensitive' } },
                        { itemId: { contains: search, mode: 'insensitive' } },
                        { instructions: { contains: search, mode: 'insensitive' } },
                        { appointment: { bookingNumber: { contains: search, mode: 'insensitive' } } },
                        { appointment: { patient: { fullName: { contains: search, mode: 'insensitive' } } } },
                        { appointment: { patient: { phone: { contains: search, mode: 'insensitive' } } } },
                        { clinicalExam: { diagnosis: { contains: search, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };

        const { skip, take, page, limit } = getPaginationParams(req.query);

        const [rows, total] = await Promise.all([
            prisma.prescription.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: prescriptionInclude,
            }),
            prisma.prescription.count({ where: whereClause })
        ]);

        const enriched = await enrichWithItemNames(rows);
        sendPaginated(res, enriched, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getPrescriptionById = async (req, res, next) => {
    try {
        const row = await prisma.prescription.findFirst({
            where: {
                id: req.params.id,
                ...getBranchFilter(req),
            },
            include: prescriptionInclude,
        });

        if (!row) return res.status(404).json({ message: 'Prescription not found' });

        row._itemName = await resolveItemName(row.itemType, row.itemId);
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const createPrescription = async (req, res, next) => {
    try {
        const { examId, itemType, itemId, quantity, instructions } = req.body;

        const clinicalExam = await prisma.clinicalExamination.findFirst({
            where: {
                id: examId,
                appointment: { ...getBranchFilter(req) },
            },
            include: {
                appointment: { select: { id: true, branchId: true } }
            }
        });

        if (!clinicalExam) return res.status(404).json({ message: 'Clinical examination not found' });
        assertBranchAccess(req, clinicalExam.appointment.branchId);

        const normalizedItemId = normalizeOptionalString(itemId);
        const branchId = clinicalExam.appointment.branchId;
        const qty = Number(quantity);

        if (normalizedItemId) {
            await validateAndLookupItem(itemType, normalizedItemId, branchId);
            await deductStock(itemType, normalizedItemId, branchId, qty, req.user.id);
        }

        const row = await prisma.prescription.create({
            data: {
                examId: clinicalExam.id,
                appointmentId: clinicalExam.appointmentId,
                branchId,
                itemType,
                itemId: normalizedItemId,
                quantity: qty,
                instructions: normalizeOptionalString(instructions),
            },
            include: prescriptionInclude,
        });

        row._itemName = await resolveItemName(row.itemType, row.itemId);
        res.status(201).json(row);
    } catch (error) {
        next(error);
    }
};

export const updatePrescription = async (req, res, next) => {
    try {
        const existing = await prisma.prescription.findUnique({
            where: { id: req.params.id },
            select: { id: true, branchId: true, itemType: true, itemId: true, quantity: true },
        });

        if (!existing) return res.status(404).json({ message: 'Prescription not found' });
        assertBranchAccess(req, existing.branchId);

        const { examId, itemType, itemId, quantity, instructions } = req.body;

        const data = {
            ...(itemType !== undefined ? { itemType } : {}),
            ...(itemId !== undefined ? { itemId: normalizeOptionalString(itemId) } : {}),
            ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
            ...(instructions !== undefined ? { instructions: normalizeOptionalString(instructions) } : {}),
        };

        if (examId !== undefined) {
            const clinicalExam = await prisma.clinicalExamination.findFirst({
                where: {
                    id: examId,
                    appointment: { ...getBranchFilter(req) },
                },
                include: {
                    appointment: { select: { id: true, branchId: true } }
                }
            });

            if (!clinicalExam) return res.status(404).json({ message: 'Clinical examination not found' });
            assertBranchAccess(req, clinicalExam.appointment.branchId);

            data.examId = clinicalExam.id;
            data.appointmentId = clinicalExam.appointmentId;
            data.branchId = clinicalExam.appointment.branchId;
        }

        const newItemId = data.itemId !== undefined ? data.itemId : existing.itemId;
        const newItemType = data.itemType || existing.itemType;
        const newQty = data.quantity || existing.quantity;
        const itemChanged = newItemId !== existing.itemId || newItemType !== existing.itemType || newQty !== existing.quantity;

        if (itemChanged) {
            if (existing.itemId) {
                await restoreStock(existing.itemType, existing.itemId, existing.branchId, existing.quantity, req.user.id);
            }
            if (newItemId) {
                await validateAndLookupItem(newItemType, newItemId, data.branchId || existing.branchId);
                await deductStock(newItemType, newItemId, data.branchId || existing.branchId, newQty, req.user.id);
            }
        }

        const row = await prisma.prescription.update({
            where: { id: req.params.id },
            data,
            include: prescriptionInclude,
        });

        row._itemName = await resolveItemName(row.itemType, row.itemId);
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const deletePrescription = async (req, res, next) => {
    try {
        const existing = await prisma.prescription.findUnique({
            where: { id: req.params.id },
            select: { id: true, branchId: true, itemType: true, itemId: true, quantity: true },
        });

        if (!existing) return res.status(404).json({ message: 'Prescription not found' });
        assertBranchAccess(req, existing.branchId);

        if (existing.itemId) {
            await restoreStock(existing.itemType, existing.itemId, existing.branchId, existing.quantity, req.user.id);
        }

        await prisma.prescription.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Prescription deleted successfully' });
    } catch (error) {
        next(error);
    }
};
