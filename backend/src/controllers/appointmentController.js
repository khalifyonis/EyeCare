import prisma from '../lib/prisma.js';

// Generate next booking number like APT-0001, APT-0002, etc.
const generateBookingNumber = async () => {
    const lastAppointment = await prisma.appointment.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { bookingNumber: true }
    });

    let nextNumber = 1;
    if (lastAppointment?.bookingNumber) {
        const currentNum = parseInt(lastAppointment.bookingNumber.replace('APT-', ''), 10);
        if (!isNaN(currentNum)) nextNumber = currentNum + 1;
    }

    return `APT-${nextNumber.toString().padStart(4, '0')}`;
};

export const createAppointment = async (req, res, next) => {
    try {
        const { patientId, doctorId, branchId, appointmentDate, status, amount } = req.body;

        const activeBranchId = branchId || req.user.branchId;

        if (!activeBranchId) {
            return res.status(400).json({ message: 'Branch assignment is required' });
        }

        const bookingNumber = await generateBookingNumber();

        const appointment = await prisma.appointment.create({
            data: {
                bookingNumber,
                patientId,
                doctorId,
                branchId: activeBranchId,
                appointmentDate: new Date(appointmentDate),
                status: status || 'PENDING',
                amount: amount || 0,
                createdById: req.user.id
            },
            include: {
                patient: { select: { id: true, fullName: true } },
                doctor: { include: { user: { select: { fullName: true } } } },
                branch: { select: { branchName: true } }
            }
        });

        res.status(201).json(appointment);
    } catch (error) {
        next(error);
    }
};

export const getAppointments = async (req, res, next) => {
    try {
        const { patientId, doctorId, date, status, search, sortBy = 'appointmentDate', sortOrder = 'desc' } = req.query;

        const branchFilter = (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };
        const whereClause = {
            ...branchFilter,
            ...(patientId ? { patientId } : {}),
            ...(doctorId ? { doctorId } : {}),
            ...(status ? { status } : {}),
            ...(date ? {
                appointmentDate: {
                    gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    lte: new Date(new Date(date).setHours(23, 59, 59, 999))
                }
            } : {}),
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
            orderBy: { [sortBy]: sortOrder },
            include: {
                patient: { select: { id: true, fullName: true, phone: true } },
                doctor: { include: { user: { select: { fullName: true } } } },
                branch: { select: { branchName: true } },
                createdBy: { select: { fullName: true } }
            }
        });

        res.status(200).json(appointments);
    } catch (error) {
        next(error);
    }
};

export const getAppointmentStats = async (req, res, next) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const branchFilter = (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

        const [total, pending, completedToday, cancelled, revenueToday] = await Promise.all([
            prisma.appointment.count({ where: branchFilter }),
            prisma.appointment.count({
                where: { ...branchFilter, status: 'PENDING' }
            }),
            prisma.appointment.count({
                where: {
                    ...branchFilter,
                    status: 'COMPLETED',
                    appointmentDate: { gte: startOfToday, lte: endOfToday }
                }
            }),
            prisma.appointment.count({
                where: { ...branchFilter, status: 'CANCELLED' }
            }),
            prisma.appointment.aggregate({
                where: {
                    ...branchFilter,
                    status: 'COMPLETED',
                    appointmentDate: { gte: startOfToday, lte: endOfToday }
                },
                _sum: { amount: true }
            })
        ]);

        res.status(200).json({
            total,
            pending,
            completed: completedToday,
            cancelled,
            revenueToday: revenueToday._sum.amount || 0
        });
    } catch (error) {
        next(error);
    }
};

export const getAppointmentById = async (req, res, next) => {
    try {
        const branchFilter = (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };
        const whereClause = { id: req.params.id, ...branchFilter };

        const appointment = await prisma.appointment.findFirst({
            where: whereClause,
            include: {
                patient: true,
                doctor: { include: { user: { select: { fullName: true } } } },
                branch: true,
                clinicalExamination: true,
                erExamination: true
            }
        });

        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        res.status(200).json(appointment);
    } catch (error) {
        next(error);
    }
};

export const updateAppointment = async (req, res, next) => {
    try {
        const { doctorId, appointmentDate, status, amount } = req.body;

        const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Appointment not found' });

        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const appointment = await prisma.appointment.update({
            where: { id: req.params.id },
            data: {
                doctorId,
                appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
                status,
                amount: amount !== undefined ? amount : undefined
            },
            include: {
                patient: { select: { id: true, fullName: true } },
                doctor: { include: { user: { select: { fullName: true } } } },
                branch: { select: { branchName: true } }
            }
        });

        res.status(200).json(appointment);
    } catch (error) {
        next(error);
    }
};

export const deleteAppointment = async (req, res, next) => {
    try {
        const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Appointment not found' });

        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await prisma.appointment.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        next(error);
    }
};
