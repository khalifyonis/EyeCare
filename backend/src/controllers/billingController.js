import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

export const listBillings = async (req, res, next) => {
    try {
        const { search, status = 'all', serviceType = 'all', date } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query);
        const branchFilter = getBranchFilter(req);

        const whereClause = {
            ...branchFilter,
            ...(status !== 'all' ? { status } : {}),
            ...(serviceType !== 'all' ? { serviceType } : {}),
            ...(date ? {
                createdAt: {
                    gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                },
            } : {}),
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
        const existing = await prisma.billing.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Billing not found' });
        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await prisma.billing.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Billing deleted successfully' });
    } catch (error) {
        next(error);
    }
};
