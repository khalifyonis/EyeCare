import prisma from '../lib/prisma.js';
import moment from 'moment';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

export const createPatient = async (req, res, next) => {
    try {
        const { fullName, phone, email, dateOfBirth, gender, address, branchId } = req.body;

        const activeBranchId = branchId || req.user.branchId;

        if (!activeBranchId) {
            return res.status(400).json({ message: 'Branch assignment is required' });
        }

        const patient = await prisma.patient.create({
            data: {
                fullName: (fullName || '').trim(),
                phone,
                email: email || undefined,
                dateOfBirth: dateOfBirth ? moment(dateOfBirth).toDate() : undefined,
                gender: gender || undefined,
                address: address || undefined,
                branchId: activeBranchId,
            }
        });

        res.status(201).json(patient);
    } catch (error) {
        next(error);
    }
};

export const getAllPatients = async (req, res, next) => {
    try {
        const { search, branchId, gender, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const { skip, take, page, limit } = getPaginationParams(req.query);

        // SUPERADMIN sees all; others filter by branch (skip branch filter if branchId missing, e.g. old token)
        const branchFilter = req.user.role === 'SUPERADMIN' || !req.user.branchId
            ? {}
            : { branchId: req.user.branchId };
        const whereClause = {
            ...branchFilter,
            ...(branchId ? { branchId } : {}),
            ...(gender ? { gender } : {}),
            ...(search ? {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ]
            } : {})
        };

        const [patients, total] = await Promise.all([
            prisma.patient.findMany({
                where: whereClause,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take,
                include: {
                    branch: {
                        select: { branchName: true }
                    }
                }
            }),
            prisma.patient.count({ where: whereClause })
        ]);

        sendPaginated(res, patients, total, page, limit);
    } catch (error) {
        next(error);
    }
};

export const getPatientStats = async (req, res, next) => {
    try {
        const now = moment();
        const startOfToday = now.clone().startOf('day').toDate();
        const startOfWeek = now.clone().startOf('week').toDate();
        const startOfMonth = now.clone().startOf('month').toDate();

        const branchFilter = (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

        const [total, today, week, month] = await Promise.all([
            prisma.patient.count({ where: branchFilter }),
            prisma.patient.count({
                where: {
                    ...branchFilter,
                    createdAt: { gte: startOfToday }
                }
            }),
            prisma.patient.count({
                where: {
                    ...branchFilter,
                    createdAt: { gte: startOfWeek }
                }
            }),
            prisma.patient.count({
                where: {
                    ...branchFilter,
                    createdAt: { gte: startOfMonth }
                }
            })
        ]);

        res.status(200).json({
            total,
            today,
            week,
            month,
        });
    } catch (error) {
        next(error);
    }
};

export const getPatientById = async (req, res, next) => {
    try {
        const branchFilter = req.user.role === 'SUPERADMIN' || !req.user.branchId
            ? {}
            : { branchId: req.user.branchId };

        const patient = await prisma.patient.findFirst({
            where: {
                id: req.params.id,
                ...branchFilter,
            },
            include: {
                appointments: {
                    include: {
                        doctor: {
                            include: {
                                user: {
                                    select: { fullName: true }
                                }
                            }
                        },
                        clinicalExamination: {
                            include: {
                                examinedBy: {
                                    include: {
                                        user: {
                                            select: {
                                                fullName: true
                                            }
                                        }
                                    }
                                },
                                surgery: {
                                    include: {
                                        surgeon: {
                                            include: {
                                                user: {
                                                    select: {
                                                        fullName: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                prescriptions: {
                                    select: {
                                        id: true,
                                        itemType: true,
                                        itemId: true,
                                        quantity: true,
                                        instructions: true,
                                        createdAt: true,
                                    }
                                }
                            }
                        },
                        erExamination: {
                            include: {
                                recordedBy: {
                                    select: {
                                        fullName: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        appointmentDate: 'desc'
                    }
                },
                branch: true
            }
        });

        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        res.status(200).json(patient);
    } catch (error) {
        next(error);
    }
};

export const updatePatient = async (req, res, next) => {
    try {
        const { fullName, phone, email, dateOfBirth, gender, address } = req.body;

        const data = {};
        if (fullName !== undefined) data.fullName = fullName.trim();
        if (phone !== undefined) data.phone = phone;
        if (email !== undefined) data.email = email || null;
        if (dateOfBirth !== undefined) data.dateOfBirth = moment(dateOfBirth).toDate();
        if (gender !== undefined) data.gender = gender;
        if (address !== undefined) data.address = address || null;

        const patient = await prisma.patient.update({
            where: { id: req.params.id },
            data
        });
        res.status(200).json(patient);
    } catch (error) {
        next(error);
    }
};

export const deletePatient = async (req, res, next) => {
    try {
        await prisma.patient.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const getPatientEyeHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchFilter = req.user.role === 'SUPERADMIN' || !req.user.branchId
            ? {}
            : { branchId: req.user.branchId };

        const patient = await prisma.patient.findFirst({
            where: { id, ...branchFilter },
            select: { id: true },
        });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        const appointments = await prisma.appointment.findMany({
            where: { patientId: id, ...branchFilter },
            orderBy: { appointmentDate: 'asc' },
            include: {
                doctor: { include: { user: { select: { fullName: true } } } },
                clinicalExamination: {
                    include: {
                        examinedBy: { include: { user: { select: { fullName: true } } } },
                        surgery: {
                            include: {
                                surgeon: { include: { user: { select: { fullName: true } } } },
                            },
                        },
                    },
                },
                erExamination: {
                    include: { recordedBy: { select: { fullName: true } } },
                },
            },
        });

        const refractionHistory = [];
        const iopHistory = [];
        const surgeries = [];

        for (const apt of appointments) {
            if (apt.clinicalExamination) {
                const ce = apt.clinicalExamination;
                refractionHistory.push({
                    date: apt.appointmentDate,
                    doctorName: ce.examinedBy?.user?.fullName || apt.doctor?.user?.fullName || 'Unknown',
                    sphRight: ce.sphRight,
                    cylRight: ce.cylRight,
                    axisRight: ce.axisRight,
                    sphLeft: ce.sphLeft,
                    cylLeft: ce.cylLeft,
                    axisLeft: ce.axisLeft,
                    diagnosis: ce.diagnosis,
                });
                if (ce.surgery) {
                    const s = ce.surgery;
                    surgeries.push({
                        date: s.surgeryDate,
                        eyeSide: s.eyeSide,
                        surgeryType: s.surgeryType,
                        status: s.status,
                        surgeonName: s.surgeon?.user?.fullName || 'Unknown',
                        notes: s.notes,
                    });
                }
            }
            if (apt.erExamination) {
                const er = apt.erExamination;
                iopHistory.push({
                    date: apt.appointmentDate,
                    recordedBy: er.recordedBy?.fullName || 'Unknown',
                    vaRight: er.vaRight,
                    vaLeft: er.vaLeft,
                    iopRight: er.iopRight,
                    iopLeft: er.iopLeft,
                });
            }
        }

        res.status(200).json({ refractionHistory, iopHistory, surgeries });
    } catch (error) {
        next(error);
    }
};
