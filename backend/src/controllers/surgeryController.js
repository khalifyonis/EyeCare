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

export const listSurgeries = async (req, res, next) => {
    try {
        const { search, status = 'all', date } = req.query;

        const whereClause = {
            ...getBranchFilter(req),
            ...(status !== 'all' ? { status } : {}),
            ...(date
                ? {
                    surgeryDate: {
                        gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                        lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                    },
                }
                : {}),
            ...(search
                ? {
                    OR: [
                        { surgeryType: { contains: search, mode: 'insensitive' } },
                        { eyeSide: { contains: search, mode: 'insensitive' } },
                        {
                            clinicalExam: {
                                appointment: {
                                    bookingNumber: { contains: search, mode: 'insensitive' },
                                },
                            },
                        },
                        {
                            clinicalExam: {
                                appointment: {
                                    patient: {
                                        fullName: { contains: search, mode: 'insensitive' },
                                    },
                                },
                            },
                        },
                        {
                            clinicalExam: {
                                appointment: {
                                    patient: {
                                        phone: { contains: search, mode: 'insensitive' },
                                    },
                                },
                            },
                        },
                        {
                            surgeon: {
                                user: {
                                    fullName: { contains: search, mode: 'insensitive' },
                                },
                            },
                        },
                    ],
                }
                : {}),
        };

        const { skip, take, page, limit } = getPaginationParams(req.query);

        const [rows, total] = await Promise.all([
            prisma.surgery.findMany({
                where: whereClause,
                orderBy: { surgeryDate: 'desc' },
                skip,
                take,
                include: {
                    branch: { select: { id: true, branchName: true } },
                    surgeon: { include: { user: { select: { id: true, fullName: true, email: true } } } },
                    clinicalExam: {
                        include: {
                            appointment: {
                                include: {
                                    patient: { select: { id: true, fullName: true, phone: true } },
                                    doctor: { include: { user: { select: { id: true, fullName: true } } } },
                                    branch: { select: { id: true, branchName: true } },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.surgery.count({ where: whereClause })
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getSurgeryById = async (req, res, next) => {
    try {
        const row = await prisma.surgery.findFirst({
            where: {
                id: req.params.id,
                ...getBranchFilter(req),
            },
            include: {
                branch: { select: { id: true, branchName: true } },
                surgeon: { include: { user: { select: { id: true, fullName: true, email: true } } } },
                clinicalExam: {
                    include: {
                        appointment: {
                            include: {
                                patient: { select: { id: true, fullName: true, phone: true } },
                                doctor: { include: { user: { select: { id: true, fullName: true } } } },
                                branch: { select: { id: true, branchName: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!row) return res.status(404).json({ message: 'Surgery not found' });
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const createSurgery = async (req, res, next) => {
    try {
        const {
            examId,
            branchId,
            eyeSide,
            surgeryType,
            surgeryDate,
            cost,
            status,
            notes,
            nextFollowUpDate,
            surgeonId,
        } = req.body;

        const activeBranchId = branchId || req.user.branchId;
        if (!activeBranchId) return res.status(400).json({ message: 'Branch assignment is required' });

        const clinicalExam = await prisma.clinicalExamination.findFirst({
            where: {
                id: examId,
                appointment: {
                    branchId: activeBranchId,
                },
            },
            include: {
                appointment: { select: { id: true, branchId: true, patientId: true } },
            },
        });

        if (!clinicalExam) return res.status(404).json({ message: 'Clinical examination not found' });
        assertBranchAccess(req, clinicalExam.appointment.branchId);

        const surgeon = await prisma.doctor.findFirst({
            where: {
                id: surgeonId,
                branchId: activeBranchId,
            },
            select: { id: true },
        });

        if (!surgeon) return res.status(404).json({ message: 'Surgeon not found' });

        const row = await prisma.surgery.create({
            data: {
                examId,
                branchId: activeBranchId,
                eyeSide,
                surgeryType,
                surgeryDate: new Date(surgeryDate),
                cost: Number(cost),
                status: status || 'PENDING',
                notes: typeof notes === 'string' && notes.trim() === '' ? null : notes,
                nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
                surgeonId,
            },
            include: {
                branch: { select: { id: true, branchName: true } },
                surgeon: { include: { user: { select: { id: true, fullName: true, email: true } } } },
                clinicalExam: {
                    include: {
                        appointment: {
                            include: {
                                patient: { select: { id: true, fullName: true, phone: true } },
                                doctor: { include: { user: { select: { id: true, fullName: true } } } },
                                branch: { select: { id: true, branchName: true } },
                            },
                        },
                    },
                },
            },
        });

        if (nextFollowUpDate && clinicalExam.appointment.patientId) {
            await prisma.followUp.create({
                data: {
                    patientId: clinicalExam.appointment.patientId,
                    branchId: activeBranchId,
                    sourceType: 'SURGERY',
                    sourceId: row.id,
                    dueDate: new Date(nextFollowUpDate),
                    status: 'PENDING',
                    notes: surgeryType ? `Post-surgery follow-up: ${surgeryType}` : 'Post-surgery follow-up',
                    surgeryId: row.id,
                },
            });
        }

        res.status(201).json(row);
    } catch (error) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ message: 'A surgery already exists for this clinical examination' });
        }
        next(error);
    }
};

export const updateSurgery = async (req, res, next) => {
    try {
        const existing = await prisma.surgery.findUnique({
            where: { id: req.params.id },
            select: { id: true, branchId: true },
        });

        if (!existing) return res.status(404).json({ message: 'Surgery not found' });
        assertBranchAccess(req, existing.branchId);

        const {
            eyeSide,
            surgeryType,
            surgeryDate,
            cost,
            status,
            notes,
            nextFollowUpDate,
            surgeonId,
        } = req.body;

        if (surgeonId) {
            const surgeon = await prisma.doctor.findFirst({
                where: {
                    id: surgeonId,
                    branchId: existing.branchId,
                },
                select: { id: true },
            });

            if (!surgeon) return res.status(404).json({ message: 'Surgeon not found' });
        }

        const row = await prisma.surgery.update({
            where: { id: req.params.id },
            data: {
                ...(eyeSide !== undefined ? { eyeSide } : {}),
                ...(surgeryType !== undefined ? { surgeryType } : {}),
                ...(surgeryDate !== undefined ? { surgeryDate: new Date(surgeryDate) } : {}),
                ...(cost !== undefined ? { cost: Number(cost) } : {}),
                ...(status !== undefined ? { status } : {}),
                ...(notes !== undefined ? { notes: typeof notes === 'string' && notes.trim() === '' ? null : notes } : {}),
                ...(nextFollowUpDate !== undefined ? { nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null } : {}),
                ...(surgeonId !== undefined ? { surgeonId } : {}),
            },
            include: {
                branch: { select: { id: true, branchName: true } },
                surgeon: { include: { user: { select: { id: true, fullName: true, email: true } } } },
                clinicalExam: {
                    include: {
                        appointment: {
                            include: {
                                patient: { select: { id: true, fullName: true, phone: true } },
                                doctor: { include: { user: { select: { id: true, fullName: true } } } },
                                branch: { select: { id: true, branchName: true } },
                            },
                        },
                    },
                },
            },
        });

        const existingFollowUp = await prisma.followUp.findFirst({
            where: { surgeryId: row.id },
        });

        if (nextFollowUpDate !== undefined) {
            if (nextFollowUpDate && row.clinicalExam?.appointment?.patient?.id) {
                const followUpPayload = {
                    dueDate: new Date(nextFollowUpDate),
                    status: 'PENDING',
                    notes: surgeryType ? `Post-surgery follow-up: ${surgeryType}` : 'Post-surgery follow-up',
                };

                if (existingFollowUp) {
                    await prisma.followUp.update({
                        where: { id: existingFollowUp.id },
                        data: followUpPayload,
                    });
                } else {
                    await prisma.followUp.create({
                        data: {
                            patientId: row.clinicalExam.appointment.patient.id,
                            branchId: row.branchId,
                            sourceType: 'SURGERY',
                            sourceId: row.id,
                            dueDate: new Date(nextFollowUpDate),
                            status: 'PENDING',
                            notes: surgeryType ? `Post-surgery follow-up: ${surgeryType}` : 'Post-surgery follow-up',
                            surgeryId: row.id,
                        },
                    });
                }
            } else if (existingFollowUp) {
                await prisma.followUp.update({
                    where: { id: existingFollowUp.id },
                    data: { status: 'CANCELLED' },
                });
            }
        }

        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const deleteSurgery = async (req, res, next) => {
    try {
        const existing = await prisma.surgery.findUnique({
            where: { id: req.params.id },
            select: { id: true, branchId: true },
        });

        if (!existing) return res.status(404).json({ message: 'Surgery not found' });
        assertBranchAccess(req, existing.branchId);

        await prisma.surgery.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Surgery deleted successfully' });
    } catch (error) {
        next(error);
    }
};
