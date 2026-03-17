import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';
import { createActivityLog } from '../lib/activityLog.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

export const listBillings = async (req, res, next) => {
    try {
        const { search, status = 'all', serviceType = 'all', date, from, to } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query);
        const branchFilter = getBranchFilter(req);

        let dateFilter = {};
        if (from && to) {
            const fromStart = new Date(from);
            fromStart.setHours(0, 0, 0, 0);
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { gte: fromStart, lte: toEnd } };
        } else if (date) {
            dateFilter = {
                createdAt: {
                    gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                },
            };
        }

        const whereClause = {
            ...branchFilter,
            ...(status !== 'all' ? { status } : {}),
            ...(serviceType !== 'all' ? { serviceType } : {}),
            ...dateFilter,
            ...(search ? {
                OR: [
                    { referenceNumber: { contains: search, mode: 'insensitive' } },
                    { patient: { fullName: { contains: search, mode: 'insensitive' } } },
                    { patient: { phone: { contains: search, mode: 'insensitive' } } },
                ],
            } : {}),
        };

        const [rows, total] = await Promise.all([
            prisma.billing.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: {
                    patient: { select: { id: true, fullName: true, phone: true } },
                    branch: { select: { id: true, branchName: true } },
                    appointment: { select: { id: true, bookingNumber: true } },
                    surgery: { select: { id: true, surgeryType: true } },
                    prescription: { select: { id: true, itemType: true } },
                    createdBy: { select: { id: true, fullName: true } },
                },
            }),
            prisma.billing.count({ where: whereClause }),
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getBillingStats = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const [total, unpaid, paid, partial, revenueToday] = await Promise.all([
            prisma.billing.count({ where: branchFilter }),
            prisma.billing.count({ where: { ...branchFilter, status: 'UNPAID' } }),
            prisma.billing.count({ where: { ...branchFilter, status: 'PAID' } }),
            prisma.billing.count({ where: { ...branchFilter, status: 'PARTIAL' } }),
            prisma.billing.aggregate({
                where: {
                    ...branchFilter,
                    status: 'PAID',
                    createdAt: { gte: startOfToday, lte: endOfToday },
                },
                _sum: { finalAmount: true },
            }),
        ]);

        res.status(200).json({
            total,
            unpaid,
            paid,
            partial,
            revenueToday: revenueToday._sum.finalAmount || 0,
        });
    } catch (error) {
        next(error);
    }
};

export const getBillingById = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);
        const row = await prisma.billing.findFirst({
            where: { id: req.params.id, ...branchFilter },
            include: {
                patient: true,
                branch: true,
                appointment: {
                    include: {
                        doctor: { include: { user: { select: { fullName: true } } } },
                    },
                },
                surgery: {
                    include: {
                        surgeon: { include: { user: { select: { fullName: true } } } },
                    },
                },
                prescription: { include: { clinicalExam: true } },
                createdBy: { select: { id: true, fullName: true } },
            },
        });
        if (!row) return res.status(404).json({ message: 'Billing not found' });
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

async function deductStockForBilling(itemType, itemId, branchId, quantity, userId, billingId) {
    if (!itemId) return;
    if (itemType === 'PHARMACY') {
        const item = await prisma.pharmacyItem.findUnique({ where: { id: itemId } });
        if (!item) {
            const err = new Error('Pharmacy item not found');
            err.statusCode = 400;
            throw err;
        }
        if (item.stockQuantity < quantity) {
            const err = new Error(`Insufficient stock: only ${item.stockQuantity} available`);
            err.statusCode = 400;
            throw err;
        }
        await prisma.pharmacyStockTransaction.create({
            data: {
                pharmacyItemId: itemId,
                branchId,
                transactionType: 'OUT',
                quantity,
                unitPrice: item.sellingPrice,
                billingId,
                performedById: userId,
            },
        });
        await prisma.pharmacyItem.update({
            where: { id: itemId },
            data: { stockQuantity: { decrement: quantity } },
        });
    } else if (itemType === 'OPTICAL') {
        const item = await prisma.opticalItem.findUnique({ where: { id: itemId } });
        if (!item) {
            const err = new Error('Optical item not found');
            err.statusCode = 400;
            throw err;
        }
        if (item.stockQuantity < quantity) {
            const err = new Error(`Insufficient stock: only ${item.stockQuantity} available`);
            err.statusCode = 400;
            throw err;
        }
        await prisma.opticalStockTransaction.create({
            data: {
                opticalItemId: itemId,
                branchId,
                transactionType: 'OUT',
                quantity,
                unitPrice: item.sellingPrice,
                billingId,
                performedById: userId,
            },
        });
        await prisma.opticalItem.update({
            where: { id: itemId },
            data: { stockQuantity: { decrement: quantity } },
        });
    }
}

async function restoreStockForBilling(itemType, itemId, branchId, quantity, userId) {
    if (!itemId) return;
    if (itemType === 'PHARMACY') {
        await prisma.pharmacyStockTransaction.create({
            data: {
                pharmacyItemId: itemId,
                branchId,
                transactionType: 'IN',
                quantity,
                unitPrice: 0,
                performedById: userId,
            },
        });
        await prisma.pharmacyItem.update({
            where: { id: itemId },
            data: { stockQuantity: { increment: quantity } },
        });
    } else if (itemType === 'OPTICAL') {
        await prisma.opticalStockTransaction.create({
            data: {
                opticalItemId: itemId,
                branchId,
                transactionType: 'IN',
                quantity,
                unitPrice: 0,
                performedById: userId,
            },
        });
        await prisma.opticalItem.update({
            where: { id: itemId },
            data: { stockQuantity: { increment: quantity } },
        });
    }
}

export const createBilling = async (req, res, next) => {
    try {
        const {
            patientId,
            branchId,
            appointmentId,
            surgeryId,
            prescriptionId,
            serviceType,
            totalAmount,
            discount = 0,
            paymentMethod,
            referenceNumber,
            status = 'UNPAID',
        } = req.body;

        const activeBranchId = branchId || req.user.branchId;
        if (!activeBranchId) {
            return res.status(400).json({ message: 'Branch is required' });
        }
        if (req.user.role !== 'SUPERADMIN' && req.user.branchId && activeBranchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const total = Number(totalAmount) || 0;
        const disc = Number(discount) || 0;
        const finalAmount = Math.max(0, total - disc);

        if ((serviceType === 'PHARMACY' || serviceType === 'OPTICAL') && prescriptionId) {
            const prescription = await prisma.prescription.findFirst({
                where: { id: prescriptionId, branchId: activeBranchId },
                select: { itemType: true, itemId: true, quantity: true, branchId: true },
            });
            if (!prescription) {
                return res.status(404).json({ message: 'Prescription not found' });
            }
            if (prescription.itemId && prescription.quantity > 0) {
                if (prescription.itemType === 'PHARMACY') {
                    const item = await prisma.pharmacyItem.findUnique({ where: { id: prescription.itemId } });
                    if (!item) return res.status(400).json({ message: 'Pharmacy item not found' });
                    if (item.stockQuantity < prescription.quantity) {
                        return res.status(400).json({
                            message: `Insufficient stock: only ${item.stockQuantity} available`,
                        });
                    }
                } else if (prescription.itemType === 'OPTICAL') {
                    const item = await prisma.opticalItem.findUnique({ where: { id: prescription.itemId } });
                    if (!item) return res.status(400).json({ message: 'Optical item not found' });
                    if (item.stockQuantity < prescription.quantity) {
                        return res.status(400).json({
                            message: `Insufficient stock: only ${item.stockQuantity} available`,
                        });
                    }
                }
            }
        }

        const billing = await prisma.billing.create({
            data: {
                patientId,
                branchId: activeBranchId,
                appointmentId: appointmentId || undefined,
                surgeryId: surgeryId || undefined,
                prescriptionId: prescriptionId || undefined,
                serviceType,
                totalAmount: total,
                discount: disc,
                finalAmount,
                paymentMethod: paymentMethod || null,
                referenceNumber: referenceNumber || null,
                status: status || 'UNPAID',
                createdById: req.user.id,
            },
            include: {
                patient: { select: { id: true, fullName: true, phone: true } },
                branch: { select: { id: true, branchName: true } },
                appointment: { select: { id: true, bookingNumber: true } },
                surgery: { select: { id: true, surgeryType: true } },
                prescription: { select: { id: true, itemType: true } },
                createdBy: { select: { id: true, fullName: true } },
            },
        });

        if ((serviceType === 'PHARMACY' || serviceType === 'OPTICAL') && prescriptionId && billing.prescription) {
            const prescription = await prisma.prescription.findFirst({
                where: { id: prescriptionId },
                select: { itemType: true, itemId: true, quantity: true },
            });
            if (prescription?.itemId && prescription.quantity > 0) {
                await deductStockForBilling(
                    prescription.itemType,
                    prescription.itemId,
                    activeBranchId,
                    prescription.quantity,
                    req.user.id,
                    billing.id,
                );
            }
        }

        createActivityLog({
            branchId: activeBranchId,
            userId: req.user.id,
            action: 'CREATED',
            entityType: 'Billing',
            entityId: billing.id,
            details: `${serviceType} - ${String(billing.finalAmount)}`,
        }).catch(() => {});

        res.status(201).json(billing);
    } catch (error) {
        next(error);
    }
};

export const updateBilling = async (req, res, next) => {
    try {
        const existing = await prisma.billing.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Billing not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const {
            totalAmount,
            discount,
            paymentMethod,
            referenceNumber,
            status,
        } = req.body;

        const data = {};
        if (totalAmount !== undefined) data.totalAmount = Number(totalAmount);
        if (discount !== undefined) data.discount = Number(discount);
        if (paymentMethod !== undefined) data.paymentMethod = paymentMethod || null;
        if (referenceNumber !== undefined) data.referenceNumber = referenceNumber || null;
        if (status !== undefined) data.status = status;
        if (data.totalAmount !== undefined || data.discount !== undefined) {
            const total = data.totalAmount ?? Number(existing.totalAmount);
            const disc = data.discount ?? Number(existing.discount);
            data.finalAmount = Math.max(0, total - disc);
        }

        const billing = await prisma.billing.update({
            where: { id: req.params.id },
            data,
            include: {
                patient: { select: { id: true, fullName: true, phone: true } },
                branch: { select: { id: true, branchName: true } },
                appointment: { select: { id: true, bookingNumber: true } },
                surgery: { select: { id: true, surgeryType: true } },
                prescription: { select: { id: true, itemType: true } },
                createdBy: { select: { id: true, fullName: true } },
            },
        });
        res.status(200).json(billing);
    } catch (error) {
        next(error);
    }
};

export const deleteBilling = async (req, res, next) => {
    try {
        const existing = await prisma.billing.findUnique({
            where: { id: req.params.id },
            include: {
                pharmacyTransactions: { where: { transactionType: 'OUT' } },
                opticalTransactions: { where: { transactionType: 'OUT' } },
            },
        });
        if (!existing) return res.status(404).json({ message: 'Billing not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        for (const tx of existing.pharmacyTransactions || []) {
            await prisma.pharmacyStockTransaction.create({
                data: {
                    pharmacyItemId: tx.pharmacyItemId,
                    branchId: tx.branchId,
                    transactionType: 'IN',
                    quantity: tx.quantity,
                    unitPrice: 0,
                    performedById: req.user.id,
                },
            });
            await prisma.pharmacyItem.update({
                where: { id: tx.pharmacyItemId },
                data: { stockQuantity: { increment: tx.quantity } },
            });
        }
        for (const tx of existing.opticalTransactions || []) {
            await prisma.opticalStockTransaction.create({
                data: {
                    opticalItemId: tx.opticalItemId,
                    branchId: tx.branchId,
                    transactionType: 'IN',
                    quantity: tx.quantity,
                    unitPrice: 0,
                    performedById: req.user.id,
                },
            });
            await prisma.opticalItem.update({
                where: { id: tx.opticalItemId },
                data: { stockQuantity: { increment: tx.quantity } },
            });
        }

        await prisma.pharmacyStockTransaction.updateMany({ where: { billingId: existing.id }, data: { billingId: null } });
        await prisma.opticalStockTransaction.updateMany({ where: { billingId: existing.id }, data: { billingId: null } });

        createActivityLog({
            branchId: existing.branchId,
            userId: req.user.id,
            action: 'DELETED',
            entityType: 'Billing',
            entityId: existing.id,
            details: `${existing.serviceType} - ${String(existing.finalAmount)}`,
        }).catch(() => {});

        await prisma.billing.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Billing deleted successfully' });
    } catch (error) {
        next(error);
    }
};
