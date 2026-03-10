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
                        {
                            appointment: {
                                bookingNumber: { contains: search, mode: 'insensitive' },
                            },
                        },
                        {
                            appointment: {
                                patient: {
                                    fullName: { contains: search, mode: 'insensitive' },
                                },
                            },
                        },
                        {
                            appointment: {
                                patient: {
                                    phone: { contains: search, mode: 'insensitive' },
                                },
                            },
                        },
                        {
                            clinicalExam: {
                                diagnosis: { contains: search, mode: 'insensitive' },
                            },
                        },
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

        sendPaginated(res, rows, total, page, limit);
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
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const createPrescription = async (req, res, next) => {
    try {
        const {
            examId,
            itemType,
            itemId,
            quantity,
            instructions,
        } = req.body;

        const clinicalExam = await prisma.clinicalExamination.findFirst({
            where: {
                id: examId,
                appointment: {
                    ...getBranchFilter(req)
                },
            },
            include: {
                appointment: {
                    select: {
                        id: true,
                        branchId: true,
                    }
                }
            }
        });

        if (!clinicalExam) return res.status(404).json({ message: 'Clinical examination not found' });
        assertBranchAccess(req, clinicalExam.appointment.branchId);

        const row = await prisma.prescription.create({
            data: {
                examId: clinicalExam.id,
                appointmentId: clinicalExam.appointmentId,
                branchId: clinicalExam.appointment.branchId,
                itemType,
                itemId: normalizeOptionalString(itemId),
                quantity: Number(quantity),
                instructions: normalizeOptionalString(instructions),
            },
            include: prescriptionInclude,
        });

        res.status(201).json(row);
    } catch (error) {
        next(error);
    }
};

export const updatePrescription = async (req, res, next) => {
    try {
        const existing = await prisma.prescription.findUnique({
            where: { id: req.params.id },
            select: { id: true, branchId: true },
        });

        if (!existing) return res.status(404).json({ message: 'Prescription not found' });
        assertBranchAccess(req, existing.branchId);

        const {
            examId,
            itemType,
            itemId,
            quantity,
            instructions,
        } = req.body;

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
                    appointment: {
                        ...getBranchFilter(req)
                    },
                },
                include: {
                    appointment: {
                        select: {
                            id: true,
                            branchId: true,
                        }
                    }
                }
            });

            if (!clinicalExam) return res.status(404).json({ message: 'Clinical examination not found' });
            assertBranchAccess(req, clinicalExam.appointment.branchId);

            data.examId = clinicalExam.id;
            data.appointmentId = clinicalExam.appointmentId;
            data.branchId = clinicalExam.appointment.branchId;
        }

        const row = await prisma.prescription.update({
            where: { id: req.params.id },
            data,
            include: prescriptionInclude,
        });

        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const deletePrescription = async (req, res, next) => {
    try {
        const existing = await prisma.prescription.findUnique({
            where: { id: req.params.id },
            select: { id: true, branchId: true },
        });

        if (!existing) return res.status(404).json({ message: 'Prescription not found' });
        assertBranchAccess(req, existing.branchId);

        await prisma.prescription.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Prescription deleted successfully' });
    } catch (error) {
        next(error);
    }
};
