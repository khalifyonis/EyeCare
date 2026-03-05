import prisma from '../lib/prisma.js';
import moment from 'moment';

// Generate unique Patient ID like 'P-0001'
const generatePatientId = async () => {
    const lastPatient = await prisma.patient.findFirst({
        orderBy: { patientId: 'desc' },
    });

    if (!lastPatient || !lastPatient.patientId) return 'P-0001';

    const lastNum = parseInt(lastPatient.patientId.split('-')[1]);
    return `P-${(lastNum + 1).toString().padStart(4, '0')}`;
};

export const createPatient = async (req, res, next) => {
    try {
        const { firstName, lastName, phone, email, dateOfBirth, gender, address, branchId } = req.body;

        const patientId = await generatePatientId();

        // Use branchId from body if provided, otherwise fallback to user's branch
        const activeBranchId = branchId || req.user.branchId;

        if (!activeBranchId) {
            return res.status(400).json({ message: 'Branch assignment is required' });
        }

        const patient = await prisma.patient.create({
            data: {
                patientId,
                firstName,
                lastName,
                phone,
                email,
                dateOfBirth: dateOfBirth ? moment(dateOfBirth).toDate() : null,
                gender,
                address,
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

        const whereClause = {
            ...(req.user.role !== 'SUPERADMIN' ? { branchId: req.user.branchId } : {}),
            ...(branchId ? { branchId } : {}), // Specific branch filter
            ...(gender ? { gender } : {}),
            OR: search ? [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { patientId: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ] : undefined
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
        const startOfMonth = now.clone().startOf('month').toDate();

        const branchFilter = req.user.role !== 'SUPERADMIN' ? { branchId: req.user.branchId } : {};

        const [total, today, month] = await Promise.all([
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
                    createdAt: { gte: startOfMonth }
                }
            })
        ]);

        res.status(200).json({
            total,
            today,
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
        const { dateOfBirth, branch, id, ...updateData } = req.body;

        const patient = await prisma.patient.update({
            where: { id: req.params.id },
            data: {
                ...updateData,
                dateOfBirth: dateOfBirth ? moment(dateOfBirth).toDate() : undefined,
            }
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
