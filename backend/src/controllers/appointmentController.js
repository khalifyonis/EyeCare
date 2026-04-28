import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

// Generate professional, sequential booking number (e.g., BK-10001)
const generateBookingNumber = async () => {
    // Fetch ALL booking numbers and find the true numeric max to avoid string-sort issues
    // (e.g., "BK-9999" lexicographically > "BK-10001")
    const allBookings = await prisma.appointment.findMany({
        where: { bookingNumber: { not: null } },
        select: { bookingNumber: true }
    });

    let maxNumber = 10000; // Will start at 10001

    for (const row of allBookings) {
        if (!row.bookingNumber) continue;
        const matches = row.bookingNumber.match(/\d+/g);
        if (matches) {
            for (const m of matches) {
                const num = parseInt(m, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        }
    }

    return `BK-${maxNumber + 1}`;
};

export const createAppointment = async (req, res, next) => {
    try {
        const { patientId, doctorId, branchId, appointmentDate, status, amount, type, notes, location } = req.body;

        const activeBranchId = branchId || req.user.branchId;

        if (!activeBranchId) {
            return res.status(400).json({ message: 'Branch assignment is required' });
        }

        // Validate appointment date is not in the past
        const parsedDate = new Date(appointmentDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid appointment date' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate < today) {
            return res.status(400).json({ message: 'Appointment date cannot be in the past' });
        }

        let appointment;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            try {
                const bookingNumber = await generateBookingNumber();
                appointment = await prisma.appointment.create({
                    data: {
                        bookingNumber,
                        patientId,
                        doctorId,
                        branchId: activeBranchId,
                        appointmentDate: parsedDate,
                        status: status || 'PENDING',
                        amount: amount || 0,
                        type: type || 'consultation',
                        notes: notes || null,
                        location: location || null,
                        createdById: req.user.id
                    },
                    include: {
                        patient: { select: { id: true, fullName: true } },
                        doctor: { include: { user: { select: { fullName: true } } } },
                        branch: { select: { branchName: true } }
                    }
                });
                break; // Success
            } catch (error) {
                // Check if it's a unique constraint violation on bookingNumber
                if (error.code === 'P2002' && error.meta?.target?.includes('booking_number')) {
                    attempts++;
                    if (attempts >= maxAttempts) throw error;
                    // Wait a small random amount before retry to reduce further collisions
                    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
                    continue;
                }
                throw error;
            }
        }

        res.status(201).json(appointment);
    } catch (error) {
        next(error);
    }
};

export const getAppointments = async (req, res, next) => {
    try {
        const { patientId, doctorId, date, from, to, status, search, sortBy = 'appointmentDate', sortOrder = 'desc' } = req.query;

        const branchFilter = (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

        let dateFilter = {};
        if (from && to) {
            const fromStart = new Date(from);
            fromStart.setHours(0, 0, 0, 0);
            const toEnd = new Date(to);
            toEnd.setHours(23, 59, 59, 999);
            dateFilter = { appointmentDate: { gte: fromStart, lte: toEnd } };
        } else if (date) {
            dateFilter = {
                appointmentDate: {
                    gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                    lte: new Date(new Date(date).setHours(23, 59, 59, 999))
                }
            };
        }

        const whereClause = {
            ...branchFilter,
            ...(patientId ? { patientId } : {}),
            ...(doctorId ? { doctorId } : {}),
            ...(status ? { status } : {}),
            ...dateFilter,
            ...(search ? {
                OR: [
                    { bookingNumber: { contains: search, mode: 'insensitive' } },
                    { patient: { fullName: { contains: search, mode: 'insensitive' } } },
                    { patient: { phone: { contains: search, mode: 'insensitive' } } },
                    { doctor: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
                ]
            } : {})
        };

        const { skip, take, page, limit } = getPaginationParams(req.query);

        const [appointments, total] = await Promise.all([
            prisma.appointment.findMany({
                where: whereClause,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take,
                include: {
                    patient: { select: { id: true, fullName: true, phone: true } },
                    doctor: { include: { user: { select: { fullName: true } } } },
                    branch: { select: { branchName: true } },
                    createdBy: { select: { fullName: true } }
                }
            }),
            prisma.appointment.count({ where: whereClause })
        ]);

        sendPaginated(res, appointments, total, page, limit);
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
        const { doctorId, appointmentDate, status, amount, type, notes, location } = req.body;

        const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Appointment not found' });

        if (req.user.role !== 'SUPERADMIN' && existing.branchId !== req.user.branchId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const data = {};
        if (doctorId !== undefined) data.doctorId = doctorId;
        if (appointmentDate !== undefined) {
            const parsedDate = new Date(appointmentDate);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ message: 'Invalid appointment date' });
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (parsedDate < today) {
                return res.status(400).json({ message: 'Appointment date cannot be in the past' });
            }
            data.appointmentDate = parsedDate;
        }
        if (status !== undefined) data.status = status;
        if (amount !== undefined) data.amount = amount;
        if (type !== undefined) data.type = type;
        if (notes !== undefined) data.notes = notes || null;
        if (location !== undefined) data.location = location || null;

        const appointment = await prisma.appointment.update({
            where: { id: req.params.id },
            data,
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
