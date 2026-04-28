import prisma from '../lib/prisma.js';

const MEDICINE_ITEM_TYPE = 'PHARMACY';

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

const assertMedicineItemType = (itemType) => {
    if (itemType === undefined || itemType === null || itemType === '' || itemType === MEDICINE_ITEM_TYPE) {
        return;
    }

    const err = new Error('Only medicine prescriptions are allowed here. Use /api/prescriptions for optical prescriptions.');
    err.statusCode = 400;
    throw err;
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
    },
    eyeExam: {
        include: {
            patient: { select: { id: true, fullName: true, phone: true } },
            doctor: { include: { user: { select: { id: true, fullName: true } } } },
            branch: { select: { id: true, branchName: true } },
        }
    }
};

const resolveExamContext = async (req, examId) => {
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

    if (clinicalExam) {
        return {
            branchId: clinicalExam.appointment.branchId,
            appointmentId: clinicalExam.appointmentId,
            clinicalExamId: clinicalExam.id,
            eyeExamId: null,
        };
    }

    const eyeExam = await prisma.eyeExamination.findFirst({
        where: {
            id: examId,
            ...getBranchFilter(req),
        },
        select: {
            id: true,
            branchId: true,
        },
    });

    if (eyeExam) {
        return {
            branchId: eyeExam.branchId,
            appointmentId: null,
            clinicalExamId: null,
            eyeExamId: eyeExam.id,
        };
    }

    return null;
};

export const listPrescriptions = async (req, res, next) => {
    try {
        const { search, itemType = 'all', date, patientId } = req.query;

        assertMedicineItemType(itemType === 'all' ? MEDICINE_ITEM_TYPE : itemType);

        const andFilters = [];

        if (patientId) {
            andFilters.push({
                OR: [
                    { appointment: { patientId } },
                    { eyeExam: { patientId } },
                ],
            });
        }

        if (search) {
            andFilters.push({
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
                    {
                        eyeExam: {
                            diagnosis: { contains: search, mode: 'insensitive' },
                        },
                    },
                    {
                        eyeExam: {
                            patient: {
                                fullName: { contains: search, mode: 'insensitive' },
                            },
                        },
                    },
                ],
            });
        }

        const whereClause = {
            ...getBranchFilter(req),
            itemType: MEDICINE_ITEM_TYPE,
            ...(date
                ? {
                    createdAt: {
                        gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                        lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                    },
                }
                : {}),
        };

        if (andFilters.length > 0) {
            whereClause.AND = andFilters;
        }

        const rows = await prisma.prescription.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: prescriptionInclude,
        });

        res.status(200).json(rows);
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

        assertMedicineItemType(itemType);

        const resolvedExam = await resolveExamContext(req, examId);

        if (!resolvedExam) return res.status(404).json({ message: 'Examination not found' });
        assertBranchAccess(req, resolvedExam.branchId);

        const row = await prisma.prescription.create({
            data: {
                appointmentId: resolvedExam.appointmentId,
                clinicalExamId: resolvedExam.clinicalExamId,
                eyeExamId: resolvedExam.eyeExamId,
                branchId: resolvedExam.branchId,
                itemType: MEDICINE_ITEM_TYPE,
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

        assertMedicineItemType(itemType);

        const data = {
            ...(itemType !== undefined ? { itemType: MEDICINE_ITEM_TYPE } : {}),
            ...(itemId !== undefined ? { itemId: normalizeOptionalString(itemId) } : {}),
            ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
            ...(instructions !== undefined ? { instructions: normalizeOptionalString(instructions) } : {}),
        };

        if (examId !== undefined) {
            const resolvedExam = await resolveExamContext(req, examId);

            if (!resolvedExam) return res.status(404).json({ message: 'Examination not found' });
            assertBranchAccess(req, resolvedExam.branchId);

            data.appointmentId = resolvedExam.appointmentId;
            data.clinicalExamId = resolvedExam.clinicalExamId;
            data.eyeExamId = resolvedExam.eyeExamId;
            data.branchId = resolvedExam.branchId;
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
