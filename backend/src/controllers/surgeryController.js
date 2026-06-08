import prisma from '../lib/prisma.js';
import { getPaginationParams } from '../lib/pagination.js';

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

const surgeryInclude = {
    branch: { select: { id: true, branchName: true } },
    patient: { select: { id: true, fullName: true, phone: true, patientNumber: true } },
    surgeon: { include: { user: { select: { id: true, fullName: true, email: true } } } },
    clinicalExam: {
        include: {
            appointment: {
                include: {
                    patient: { select: { id: true, fullName: true, phone: true, patientNumber: true } },
                    doctor: { include: { user: { select: { id: true, fullName: true } } } },
                    branch: { select: { id: true, branchName: true } },
                },
            },
        },
    },
};

function normalizeStatus(input) {
    const raw = (typeof input === 'string' ? input : '')?.trim();
    if (!raw) return 'scheduled';
    const s = raw.toLowerCase();
    if (s === 'pending') return 'scheduled';
    if (s === 'cancelled' || s === 'canceled') return 'cancelled';
    if (s === 'completed' || s === 'scheduled') return s;
    return s;
}

function normalizeEye(input) {
    const raw = (typeof input === 'string' ? input : '')?.trim();
    if (!raw) return 'BOTH';
    const s = raw.toUpperCase();
    if (s === 'RIGHT') return 'OD';
    if (s === 'LEFT') return 'OS';
    if (s === 'OD' || s === 'OS' || s === 'BOTH') return s;
    return s;
}

function normalizeSurgeryType(input) {
    const raw = (typeof input === 'string' ? input : '')?.trim();
    if (!raw) return raw;
    const key = raw.toLowerCase();

    if (key === 'lasik/prk' || key === 'refractive' || key === 'refractive surgery' || key === 'lasik' || key === 'prk') {
        return 'Refractive Surgery';
    }
    if (key === 'retinal' || key === 'retinal surgery') {
        return 'Retinal Surgery';
    }
    if (key === 'cataract' || key === 'cataract surgery') {
        return 'Cataract Surgery';
    }

    return raw;
}

function normalizeAnesthesiaType(input) {
    const raw = (typeof input === 'string' ? input : '')?.trim();
    if (!raw) return raw;
    const key = raw.toLowerCase();
    if (key === 'local') return 'Local (Retrobulbar/Peribulbar)';
    return raw;
}

function normalizeProcedure(input, surgeryType) {
    const raw = (typeof input === 'string' ? input : '')?.trim();
    if (!raw) return null;
    const canonicalType = normalizeSurgeryType(surgeryType);
    if (canonicalType === 'Cataract Surgery' && raw.toLowerCase() === 'cataract surgery') {
        return 'Phacoemulsification + IOL';
    }
    return raw;
}

function normalizeTypeFilter(input) {
    const raw = (typeof input === 'string' ? input : '')?.trim();
    if (!raw || raw.toLowerCase() === 'all') return null;

    const key = raw.toLowerCase();
    const map = {
        cataract: ['Cataract Surgery'],
        'cataract surgery': ['Cataract Surgery'],

        refractive: ['Refractive Surgery', 'LASIK/PRK'],
        'refractive surgery': ['Refractive Surgery', 'LASIK/PRK'],
        'lasik/prk': ['LASIK/PRK', 'Refractive Surgery'],
        lasik: ['LASIK/PRK', 'Refractive Surgery'],
        prk: ['LASIK/PRK', 'Refractive Surgery'],

        retinal: ['Retinal Surgery', 'Retinal'],
        'retinal surgery': ['Retinal Surgery', 'Retinal'],
    };

    if (map[key]) return map[key];
    return [raw];
}

export const listSurgeries = async (req, res, next) => {
    try {
        const { search, status = 'all', date, type = 'all' } = req.query;

        const typeValues = normalizeTypeFilter(String(type));

        const whereClause = {
            ...getBranchFilter(req),
            ...(status !== 'all' ? { status: normalizeStatus(String(status)) } : {}),
            ...(typeValues ? { surgeryType: { in: typeValues } } : {}),
            ...(date
                ? {
                    date: {
                        gte: new Date(new Date(String(date)).setHours(0, 0, 0, 0)),
                        lte: new Date(new Date(String(date)).setHours(23, 59, 59, 999)),
                    },
                }
                : {}),
            ...(search
                ? {
                    OR: [
                        { surgeryType: { contains: String(search), mode: 'insensitive' } },
                        { procedure: { contains: String(search), mode: 'insensitive' } },
                        { eye: { contains: String(search), mode: 'insensitive' } },
                        { patient: { fullName: { contains: String(search), mode: 'insensitive' } } },
                        { patient: { phone: { contains: String(search), mode: 'insensitive' } } },
                        { patient: { patientNumber: { contains: String(search), mode: 'insensitive' } } },
                        { surgeon: { user: { fullName: { contains: String(search), mode: 'insensitive' } } } },
                    ],
                }
                : {}),
        };

        const { skip, take, page, limit } = getPaginationParams(req.query);

        const branchWhere = getBranchFilter(req);
        const now = new Date();
        const todayStart = new Date(new Date(now).setHours(0, 0, 0, 0));
        const todayEnd = new Date(new Date(now).setHours(23, 59, 59, 999));

        const [rows, total, todaysSurgeries, scheduledCount, completedCount, totalProcedures] = await Promise.all([
            prisma.surgery.findMany({
                where: whereClause,
                orderBy: { date: 'desc' },
                skip,
                take,
                include: surgeryInclude,
            }),
            prisma.surgery.count({ where: whereClause }),
            prisma.surgery.count({ where: { ...branchWhere, date: { gte: todayStart, lte: todayEnd } } }),
            prisma.surgery.count({ where: { ...branchWhere, status: 'scheduled' } }),
            prisma.surgery.count({ where: { ...branchWhere, status: 'completed' } }),
            prisma.surgery.count({ where: { ...branchWhere } }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;
        res.status(200).json({
            data: rows,
            total,
            page,
            limit,
            totalPages,
            stats: {
                todaysSurgeries,
                scheduled: scheduledCount,
                completed: completedCount,
                totalProcedures,
            },
        });
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
            include: surgeryInclude,
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
            appointmentId, // Added for workflow linking
            branchId,
            patientId,
            eye,
            surgeryType,
            procedure,
            anesthesiaType,
            date,
            time,
            operatingRoom,
            cataractDetails,
            cost,
            status,
            notes,
            nextFollowUpDate,
            surgeonId,
        } = req.body;

        const activeBranchId = branchId || req.user.branchId;
        if (!activeBranchId) return res.status(400).json({ message: 'Branch assignment is required' });

        const patient = await prisma.patient.findFirst({
            where: {
                id: patientId,
                branchId: activeBranchId,
            },
            select: { id: true, branchId: true },
        });

        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        assertBranchAccess(req, patient.branchId);

        // Workflow Linking: Ensure surgery is tied to an exam (and thus an appointment)
        let clinicalExamId = examId;
        let finalAppointmentId = appointmentId;

        if (!clinicalExamId && finalAppointmentId) {
            // Find if an exam already exists for this appointment
            const existingExam = await prisma.clinicalExamination.findUnique({
                where: { appointmentId: finalAppointmentId }
            });

            if (existingExam) {
                clinicalExamId = existingExam.id;
            } else {
                // Fetch appointment to get its doctor for the "examinedBy" requirement
                const appointment = await prisma.appointment.findUnique({
                    where: { id: finalAppointmentId },
                    select: { doctorId: true }
                });

                if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

                // Create a shell clinical exam to bridge the Surgery to the Appointment
                const newExam = await prisma.clinicalExamination.create({
                    data: {
                        appointment: { connect: { id: finalAppointmentId } },
                        examinedBy: { connect: { id: appointment.doctorId } },
                        diagnosis: surgeryType ? `Scheduled for ${surgeryType}` : 'Scheduled Surgery',
                    }
                });
                clinicalExamId = newExam.id;
            }
        } else if (!clinicalExamId && !finalAppointmentId) {
            // Auto-create a shell Appointment and ClinicalExamination to anchor the Surgery and Prescriptions
            const rand = Math.floor(1000 + Math.random() * 9000);
            const bookingNumber = `SURG-${Date.now().toString().slice(-6)}-${rand}`;

            const appointment = await prisma.appointment.create({
                data: {
                    appointmentDate: new Date(date),
                    status: 'COMPLETED',
                    branchId: activeBranchId,
                    patientId,
                    doctorId: surgeonId,
                    createdById: req.user.id,
                    type: 'surgery',
                    eyeSide: normalizeEye(eye),
                    bookingNumber,
                }
            });
            finalAppointmentId = appointment.id;

            const newExam = await prisma.clinicalExamination.create({
                data: {
                    appointment: { connect: { id: appointment.id } },
                    examinedBy: { connect: { id: surgeonId } },
                    diagnosis: surgeryType ? `Surgery: ${surgeryType}` : 'Surgery Procedure',
                }
            });
            clinicalExamId = newExam.id;
        }


        // Validate clinical exam access
        if (clinicalExamId) {
            const clinicalExam = await prisma.clinicalExamination.findFirst({
                where: {
                    id: clinicalExamId,
                    appointment: {
                        branchId: activeBranchId,
                        patientId: patientId,
                    },
                },
                include: {
                    appointment: { select: { id: true, branchId: true, patientId: true } },
                },
            });

            if (!clinicalExam) return res.status(404).json({ message: 'Clinical examination context not found' });
            assertBranchAccess(req, clinicalExam.appointment.branchId);
        }

        const surgeon = await prisma.doctor.findFirst({
            where: {
                id: surgeonId,
                branchId: activeBranchId,
            },
            select: { id: true },
        });

        if (!surgeon) return res.status(404).json({ message: 'Surgeon not found' });

        const canonicalSurgeryType = normalizeSurgeryType(surgeryType);
        const canonicalProcedure = normalizeProcedure(procedure, canonicalSurgeryType);
        const canonicalAnesthesia = normalizeAnesthesiaType(anesthesiaType);

        const row = await prisma.surgery.create({
            data: {
                examId: clinicalExamId || null,
                branchId: activeBranchId,
                patientId,
                eye: normalizeEye(eye),
                surgeryType: canonicalSurgeryType,
                procedure: canonicalProcedure,
                anesthesiaType: typeof canonicalAnesthesia === 'string' && canonicalAnesthesia.trim() ? canonicalAnesthesia.trim() : null,
                date: new Date(date),
                time: typeof time === 'string' && time.trim() ? time.trim() : null,
                operatingRoom: typeof operatingRoom === 'string' && operatingRoom.trim() ? operatingRoom.trim() : null,
                cataractDetails: cataractDetails ?? null,
                cost: cost !== undefined && cost !== null && cost !== '' ? Number(cost) : 0,
                status: normalizeStatus(status),
                notes: typeof notes === 'string' && notes.trim() === '' ? null : notes,
                nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
                surgeonId,
            },
            include: surgeryInclude,
        });

        // Professional Workflow: If linked to an appointment, mark it as completed
        if (appointmentId) {
            await prisma.appointment.update({
                where: { id: appointmentId },
                data: { status: 'COMPLETED' }
            });
        }

        if (nextFollowUpDate && patientId) {
            await prisma.followUp.create({
                data: {
                    patientId,
                    branchId: activeBranchId,
                    sourceType: 'SURGERY',
                    sourceId: row.id,
                    dueDate: new Date(nextFollowUpDate),
                    status: 'PENDING',
                    notes: canonicalSurgeryType ? `Post-surgery follow-up: ${canonicalSurgeryType}` : 'Post-surgery follow-up',
                    surgeryId: row.id,
                },
            });
        }

        if (!finalAppointmentId && clinicalExamId) {
            const exam = await prisma.clinicalExamination.findUnique({
                where: { id: clinicalExamId },
                select: { appointmentId: true }
            });
            if (exam) {
                finalAppointmentId = exam.appointmentId;
            }
        }

        if (req.body.prescriptions && Array.isArray(req.body.prescriptions)) {
            for (const rx of req.body.prescriptions) {
                if (rx.itemId && rx.quantity) {
                    await prisma.prescription.create({
                        data: {
                            branchId: activeBranchId,
                            clinicalExamId: clinicalExamId || null,
                            appointmentId: finalAppointmentId || null,
                            itemType: 'PHARMACY',
                            itemId: rx.itemId,
                            itemName: rx.itemName || null,
                            quantity: Number(rx.quantity) || 1,
                            instructions: rx.instructions || '',
                            status: 'PENDING',
                        }
                    });
                }
            }
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
            select: { id: true, branchId: true, patientId: true },
        });

        if (!existing) return res.status(404).json({ message: 'Surgery not found' });
        assertBranchAccess(req, existing.branchId);

        const {
            eye,
            surgeryType,
            procedure,
            anesthesiaType,
            date,
            time,
            operatingRoom,
            cataractDetails,
            cost,
            status,
            notes,
            nextFollowUpDate,
            surgeonId,
        } = req.body;

        const canonicalSurgeryType = surgeryType !== undefined ? normalizeSurgeryType(surgeryType) : undefined;
        const canonicalProcedure = procedure !== undefined ? normalizeProcedure(procedure, canonicalSurgeryType) : undefined;
        const canonicalAnesthesia = anesthesiaType !== undefined ? normalizeAnesthesiaType(anesthesiaType) : undefined;

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
                ...(eye !== undefined ? { eye: normalizeEye(eye) } : {}),
                ...(canonicalSurgeryType !== undefined ? { surgeryType: canonicalSurgeryType } : {}),
                ...(canonicalProcedure !== undefined ? { procedure: canonicalProcedure } : {}),
                ...(canonicalAnesthesia !== undefined
                    ? { anesthesiaType: typeof canonicalAnesthesia === 'string' && canonicalAnesthesia.trim() ? canonicalAnesthesia.trim() : null }
                    : {}),
                ...(date !== undefined ? { date: new Date(date) } : {}),
                ...(time !== undefined ? { time: typeof time === 'string' && time.trim() ? time.trim() : null } : {}),
                ...(operatingRoom !== undefined ? { operatingRoom: typeof operatingRoom === 'string' && operatingRoom.trim() ? operatingRoom.trim() : null } : {}),
                ...(cataractDetails !== undefined ? { cataractDetails: cataractDetails ?? null } : {}),
                ...(cost !== undefined ? { cost: Number(cost) } : {}),
                ...(status !== undefined ? { status: normalizeStatus(status) } : {}),
                ...(notes !== undefined ? { notes: typeof notes === 'string' && notes.trim() === '' ? null : notes } : {}),
                ...(nextFollowUpDate !== undefined ? { nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null } : {}),
                ...(surgeonId !== undefined ? { surgeonId } : {}),
            },
            include: surgeryInclude,
        });

        const existingFollowUp = await prisma.followUp.findFirst({
            where: { surgeryId: row.id },
        });

        if (nextFollowUpDate !== undefined) {
            if (nextFollowUpDate && (row.patientId || existing.patientId)) {
                const followUpPayload = {
                    dueDate: new Date(nextFollowUpDate),
                    status: 'PENDING',
                    notes: canonicalSurgeryType ? `Post-surgery follow-up: ${canonicalSurgeryType}` : 'Post-surgery follow-up',
                };

                if (existingFollowUp) {
                    await prisma.followUp.update({
                        where: { id: existingFollowUp.id },
                        data: followUpPayload,
                    });
                } else {
                    await prisma.followUp.create({
                        data: {
                            patientId: row.patientId || existing.patientId,
                            branchId: row.branchId,
                            sourceType: 'SURGERY',
                            sourceId: row.id,
                            dueDate: new Date(nextFollowUpDate),
                            status: 'PENDING',
                            notes: canonicalSurgeryType ? `Post-surgery follow-up: ${canonicalSurgeryType}` : 'Post-surgery follow-up',
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
