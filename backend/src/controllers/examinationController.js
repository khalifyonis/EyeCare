import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

const toNullableString = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
};

const assertBranchAccess = (req, branchId) => {
    if (req.user.role !== 'SUPERADMIN' && req.user.branchId && branchId !== req.user.branchId) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }
};

const examinationStatusOf = (appointment) => {
    const hasER = !!appointment.erExamination;
    const hasClinical = !!appointment.clinicalExamination;

    if (hasER && hasClinical) return 'COMPLETE';
    if (hasER || hasClinical) return 'PARTIAL';
    return 'NONE';
};

const getAppointmentForExam = async (req, appointmentId) => {
    return prisma.appointment.findFirst({
        where: {
            id: appointmentId,
            ...getBranchFilter(req)
        },
        include: {
            patient: { select: { id: true, fullName: true, phone: true } },
            doctor: { include: { user: { select: { id: true, fullName: true } } } },
            branch: { select: { id: true, branchName: true } }
        }
    });
};

const resolveExaminedByDoctorId = async (req, appointment, requestedDoctorId) => {
    const branchFilter = getBranchFilter(req);

    if (requestedDoctorId) {
        const doctor = await prisma.doctor.findFirst({
            where: {
                id: requestedDoctorId,
                ...branchFilter
            },
            select: { id: true }
        });

        if (!doctor) {
            const err = new Error('Examining doctor not found');
            err.statusCode = 404;
            throw err;
        }

        return doctor.id;
    }

    if (req.user.role === 'DOCTOR') {
        const ownDoctorProfile = await prisma.doctor.findFirst({
            where: {
                userId: req.user.id,
                ...branchFilter
            },
            select: { id: true }
        });

        if (!ownDoctorProfile) {
            const err = new Error('Doctor profile not found for current user');
            err.statusCode = 404;
            throw err;
        }

        return ownDoctorProfile.id;
    }

    return appointment.doctorId;
};

export const getExaminations = async (req, res, next) => {
    try {
        const {
            search,
            appointmentStatus = 'all',
            examinationStatus = 'all'
        } = req.query;

        const whereClause = {
            ...getBranchFilter(req),
            ...(appointmentStatus !== 'all' ? { status: appointmentStatus } : {}),
            ...(search ? {
                OR: [
                    { bookingNumber: { contains: search, mode: 'insensitive' } },
                    { patient: { fullName: { contains: search, mode: 'insensitive' } } },
                    { patient: { phone: { contains: search, mode: 'insensitive' } } },
                ]
            } : {})
        };

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            orderBy: { appointmentDate: 'desc' },
            include: {
                patient: { select: { id: true, fullName: true, phone: true } },
                doctor: { include: { user: { select: { id: true, fullName: true } } } },
                branch: { select: { id: true, branchName: true } },
                erExamination: {
                    select: {
                        id: true,
                        createdAt: true,
                        recordedBy: { select: { id: true, fullName: true } }
                    }
                },
                clinicalExamination: {
                    select: {
                        id: true,
                        examinedAt: true,
                        diagnosis: true,
                        examinedBy: {
                            select: {
                                id: true,
                                user: { select: { id: true, fullName: true } }
                            }
                        }
                    }
                }
            }
        });

        const withStatus = appointments.map((appointment) => ({
            ...appointment,
            examinationStatus: examinationStatusOf(appointment)
        }));

        const filtered = examinationStatus === 'all'
            ? withStatus
            : withStatus.filter((appointment) => appointment.examinationStatus === examinationStatus);

        res.status(200).json(filtered);
    } catch (error) {
        next(error);
    }
};

export const getExaminationByAppointment = async (req, res, next) => {
    try {
        const appointment = await prisma.appointment.findFirst({
            where: {
                id: req.params.appointmentId,
                ...getBranchFilter(req)
            },
            include: {
                patient: true,
                doctor: { include: { user: { select: { id: true, fullName: true, email: true } } } },
                branch: true,
                erExamination: {
                    include: {
                        recordedBy: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true
                            }
                        }
                    }
                },
                clinicalExamination: {
                    include: {
                        examinedBy: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        fullName: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.status(200).json({
            ...appointment,
            examinationStatus: examinationStatusOf(appointment)
        });
    } catch (error) {
        next(error);
    }
};

export const listERExaminations = async (req, res, next) => {
    try {
        const { search, appointmentStatus = 'all', date } = req.query;

        const whereClause = {
            appointment: {
                ...getBranchFilter(req),
                ...(appointmentStatus !== 'all' ? { status: appointmentStatus } : {}),
            },
            ...(date ? {
                createdAt: {
                    gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                }
            } : {}),
            ...(search ? {
                OR: [
                    { appointment: { bookingNumber: { contains: search, mode: 'insensitive' } } },
                    { appointment: { patient: { fullName: { contains: search, mode: 'insensitive' } } } },
                    { appointment: { patient: { phone: { contains: search, mode: 'insensitive' } } } },
                ]
            } : {})
        };

        const { skip, take, page, limit } = getPaginationParams(req.query);

        const [rows, total] = await Promise.all([
            prisma.eRExamination.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                include: {
                    recordedBy: { select: { id: true, fullName: true, username: true } },
                    appointment: {
                        include: {
                            patient: { select: { id: true, fullName: true, phone: true } },
                            doctor: { include: { user: { select: { id: true, fullName: true } } } },
                            branch: { select: { id: true, branchName: true } }
                        }
                    }
                }
            }),
            prisma.eRExamination.count({ where: whereClause })
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getERExaminationById = async (req, res, next) => {
    try {
        const row = await prisma.eRExamination.findFirst({
            where: {
                id: req.params.id,
                appointment: {
                    ...getBranchFilter(req)
                }
            },
            include: {
                recordedBy: { select: { id: true, fullName: true, username: true } },
                appointment: {
                    include: {
                        patient: { select: { id: true, fullName: true, phone: true } },
                        doctor: { include: { user: { select: { id: true, fullName: true } } } },
                        branch: { select: { id: true, branchName: true } }
                    }
                }
            }
        });

        if (!row) return res.status(404).json({ message: 'ER examination not found' });
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const createERExamination = async (req, res, next) => {
    try {
        const {
            appointmentId,
            vaRight,
            vaLeft,
            phRight,
            phLeft,
            iopRight,
            iopLeft,
            notes
        } = req.body;

        const appointment = await getAppointmentForExam(req, appointmentId);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        const existing = await prisma.eRExamination.findUnique({ where: { appointmentId } });
        if (existing) {
            return res.status(400).json({ message: 'ER examination already exists for this appointment' });
        }

        const created = await prisma.eRExamination.create({
            data: {
                appointmentId,
                vaRight: toNullableString(vaRight),
                vaLeft: toNullableString(vaLeft),
                phRight: toNullableString(phRight),
                phLeft: toNullableString(phLeft),
                iopRight,
                iopLeft,
                notes: toNullableString(notes),
                recordedById: req.user.id
            },
            include: {
                recordedBy: { select: { id: true, fullName: true, username: true } },
                appointment: {
                    include: {
                        patient: { select: { id: true, fullName: true, phone: true } },
                        doctor: { include: { user: { select: { id: true, fullName: true } } } },
                        branch: { select: { id: true, branchName: true } }
                    }
                }
            }
        });

        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
};

export const updateERExamination = async (req, res, next) => {
    try {
        const existing = await prisma.eRExamination.findUnique({
            where: { id: req.params.id },
            include: { appointment: { select: { id: true, branchId: true } } }
        });

        if (!existing) return res.status(404).json({ message: 'ER examination not found' });
        assertBranchAccess(req, existing.appointment.branchId);

        const {
            vaRight,
            vaLeft,
            phRight,
            phLeft,
            iopRight,
            iopLeft,
            notes
        } = req.body;

        const updated = await prisma.eRExamination.update({
            where: { id: req.params.id },
            data: {
                vaRight: toNullableString(vaRight),
                vaLeft: toNullableString(vaLeft),
                phRight: toNullableString(phRight),
                phLeft: toNullableString(phLeft),
                iopRight,
                iopLeft,
                notes: toNullableString(notes),
                recordedById: req.user.id
            },
            include: {
                recordedBy: { select: { id: true, fullName: true, username: true } },
                appointment: {
                    include: {
                        patient: { select: { id: true, fullName: true, phone: true } },
                        doctor: { include: { user: { select: { id: true, fullName: true } } } },
                        branch: { select: { id: true, branchName: true } }
                    }
                }
            }
        });

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

export const deleteERExamination = async (req, res, next) => {
    try {
        const existing = await prisma.eRExamination.findUnique({
            where: { id: req.params.id },
            include: { appointment: { select: { branchId: true } } }
        });

        if (!existing) return res.status(404).json({ message: 'ER examination not found' });
        assertBranchAccess(req, existing.appointment.branchId);

        await prisma.eRExamination.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'ER examination deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const listClinicalExaminations = async (req, res, next) => {
    try {
        const { search, appointmentStatus = 'all', date } = req.query;

        const whereClause = {
            appointment: {
                ...getBranchFilter(req),
                ...(appointmentStatus !== 'all' ? { status: appointmentStatus } : {}),
            },
            ...(date ? {
                examinedAt: {
                    gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                }
            } : {}),
            ...(search ? {
                OR: [
                    { appointment: { bookingNumber: { contains: search, mode: 'insensitive' } } },
                    { appointment: { patient: { fullName: { contains: search, mode: 'insensitive' } } } },
                    { appointment: { patient: { phone: { contains: search, mode: 'insensitive' } } } },
                    { diagnosis: { contains: search, mode: 'insensitive' } },
                ]
            } : {})
        };

        const { skip, take, page, limit } = getPaginationParams(req.query);

        const [rows, total] = await Promise.all([
            prisma.clinicalExamination.findMany({
                where: whereClause,
                orderBy: { examinedAt: 'desc' },
                skip,
                take,
                include: {
                    examinedBy: {
                        include: {
                            user: { select: { id: true, fullName: true, email: true } }
                        }
                    },
                    appointment: {
                        include: {
                            patient: { select: { id: true, fullName: true, phone: true } },
                            doctor: { include: { user: { select: { id: true, fullName: true } } } },
                            branch: { select: { id: true, branchName: true } }
                        }
                    }
                }
            }),
            prisma.clinicalExamination.count({ where: whereClause })
        ]);

        sendPaginated(res, rows, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getClinicalExaminationById = async (req, res, next) => {
    try {
        const row = await prisma.clinicalExamination.findFirst({
            where: {
                id: req.params.id,
                appointment: {
                    ...getBranchFilter(req)
                }
            },
            include: {
                examinedBy: {
                    include: {
                        user: { select: { id: true, fullName: true, email: true } }
                    }
                },
                appointment: {
                    include: {
                        patient: { select: { id: true, fullName: true, phone: true } },
                        doctor: { include: { user: { select: { id: true, fullName: true } } } },
                        branch: { select: { id: true, branchName: true } }
                    }
                }
            }
        });

        if (!row) return res.status(404).json({ message: 'Clinical examination not found' });
        res.status(200).json(row);
    } catch (error) {
        next(error);
    }
};

export const createClinicalExamination = async (req, res, next) => {
    try {
        const {
            appointmentId,
            sphRight,
            cylRight,
            axisRight,
            sphLeft,
            cylLeft,
            axisLeft,
            diagnosis,
            managementPlan,
            examinedById
        } = req.body;

        const appointment = await getAppointmentForExam(req, appointmentId);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        const existing = await prisma.clinicalExamination.findUnique({ where: { appointmentId } });
        if (existing) {
            return res.status(400).json({ message: 'Clinical examination already exists for this appointment' });
        }

        const doctorId = await resolveExaminedByDoctorId(req, appointment, examinedById);

        const created = await prisma.clinicalExamination.create({
            data: {
                appointmentId,
                sphRight,
                cylRight,
                axisRight,
                sphLeft,
                cylLeft,
                axisLeft,
                diagnosis: toNullableString(diagnosis),
                managementPlan: toNullableString(managementPlan),
                examinedById: doctorId
            },
            include: {
                examinedBy: {
                    include: {
                        user: { select: { id: true, fullName: true, email: true } }
                    }
                },
                appointment: {
                    include: {
                        patient: { select: { id: true, fullName: true, phone: true } },
                        doctor: { include: { user: { select: { id: true, fullName: true } } } },
                        branch: { select: { id: true, branchName: true } }
                    }
                }
            }
        });

        res.status(201).json(created);
    } catch (error) {
        next(error);
    }
};

export const updateClinicalExamination = async (req, res, next) => {
    try {
        const existing = await prisma.clinicalExamination.findUnique({
            where: { id: req.params.id },
            include: { appointment: { select: { id: true, branchId: true, doctorId: true } } }
        });

        if (!existing) return res.status(404).json({ message: 'Clinical examination not found' });
        assertBranchAccess(req, existing.appointment.branchId);

        const {
            sphRight,
            cylRight,
            axisRight,
            sphLeft,
            cylLeft,
            axisLeft,
            diagnosis,
            managementPlan,
            examinedById
        } = req.body;

        const resolvedExaminedById = examinedById
            ? await resolveExaminedByDoctorId(req, existing.appointment, examinedById)
            : undefined;

        const updated = await prisma.clinicalExamination.update({
            where: { id: req.params.id },
            data: {
                sphRight,
                cylRight,
                axisRight,
                sphLeft,
                cylLeft,
                axisLeft,
                diagnosis: toNullableString(diagnosis),
                managementPlan: toNullableString(managementPlan),
                examinedById: resolvedExaminedById
            },
            include: {
                examinedBy: {
                    include: {
                        user: { select: { id: true, fullName: true, email: true } }
                    }
                },
                appointment: {
                    include: {
                        patient: { select: { id: true, fullName: true, phone: true } },
                        doctor: { include: { user: { select: { id: true, fullName: true } } } },
                        branch: { select: { id: true, branchName: true } }
                    }
                }
            }
        });

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

export const deleteClinicalExamination = async (req, res, next) => {
    try {
        const existing = await prisma.clinicalExamination.findUnique({
            where: { id: req.params.id },
            include: { appointment: { select: { branchId: true } } }
        });

        if (!existing) return res.status(404).json({ message: 'Clinical examination not found' });
        assertBranchAccess(req, existing.appointment.branchId);

        await prisma.clinicalExamination.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Clinical examination deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const upsertERExamination = async (req, res, next) => {
    try {
        const {
            appointmentId,
            vaRight,
            vaLeft,
            phRight,
            phLeft,
            iopRight,
            iopLeft,
            notes
        } = req.body;

        const appointment = await getAppointmentForExam(req, appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const examination = await prisma.eRExamination.upsert({
            where: { appointmentId },
            update: {
                vaRight: toNullableString(vaRight),
                vaLeft: toNullableString(vaLeft),
                phRight: toNullableString(phRight),
                phLeft: toNullableString(phLeft),
                iopRight,
                iopLeft,
                notes: toNullableString(notes),
                recordedById: req.user.id
            },
            create: {
                appointmentId,
                vaRight: toNullableString(vaRight),
                vaLeft: toNullableString(vaLeft),
                phRight: toNullableString(phRight),
                phLeft: toNullableString(phLeft),
                iopRight,
                iopLeft,
                notes: toNullableString(notes),
                recordedById: req.user.id
            },
            include: {
                recordedBy: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true
                    }
                }
            }
        });

        res.status(200).json(examination);
    } catch (error) {
        next(error);
    }
};

export const upsertClinicalExamination = async (req, res, next) => {
    try {
        const {
            appointmentId,
            sphRight,
            cylRight,
            axisRight,
            sphLeft,
            cylLeft,
            axisLeft,
            diagnosis,
            managementPlan,
            examinedById
        } = req.body;

        const appointment = await getAppointmentForExam(req, appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const doctorId = await resolveExaminedByDoctorId(req, appointment, examinedById);

        const examination = await prisma.clinicalExamination.upsert({
            where: { appointmentId },
            update: {
                sphRight,
                cylRight,
                axisRight,
                sphLeft,
                cylLeft,
                axisLeft,
                diagnosis: toNullableString(diagnosis),
                managementPlan: toNullableString(managementPlan),
                examinedById: doctorId
            },
            create: {
                appointmentId,
                sphRight,
                cylRight,
                axisRight,
                sphLeft,
                cylLeft,
                axisLeft,
                diagnosis: toNullableString(diagnosis),
                managementPlan: toNullableString(managementPlan),
                examinedById: doctorId
            },
            include: {
                examinedBy: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        res.status(200).json(examination);
    } catch (error) {
        next(error);
    }
};
