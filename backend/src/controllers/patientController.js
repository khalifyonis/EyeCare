import prisma from '../lib/prisma.js';
import moment from 'moment';

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

        const patients = await prisma.patient.findMany({
            where: whereClause,
            orderBy: { [sortBy]: sortOrder },
            include: {
                branch: {
                    select: { branchName: true }
                }
            }
        });

        res.status(200).json(patients);
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
        const patient = await prisma.patient.findUnique({
            where: { id: req.params.id },
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
                        clinicalExamination: true,
                        erExamination: true
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
