import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';
import { emitEvent } from '../lib/socket.js';

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

const getDayBounds = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const isSameDay = (left, right) => {
    if (!left || !right) return false;
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
};

export const createAppointment = async (req, res, next) => {
    try {
        const {
            patientId,
            doctorId,
            branchId,
            appointmentDate,
            status,
            amount,
            type,
            notes,
            location,
            billingAmount,
            billingDiscount,
            billingStatus,
            paymentMethod,
            referenceNumber,
            dueDate,
            billingNotes,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelationship,
            eyeSide,
        } = req.body;

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

        const { start: dayStart, end: dayEnd } = getDayBounds(parsedDate);

        const existingSameDay = await prisma.appointment.findFirst({
            where: {
                patientId,
                branchId: activeBranchId,
                appointmentDate: { gte: dayStart, lte: dayEnd },
                NOT: { status: 'CANCELLED' }
            }
        });

        if (existingSameDay) {
            return res.status(409).json({ message: 'Patient already has an appointment on this date.' });
        }

        const existingTimeSlot = await prisma.appointment.findFirst({
            where: {
                doctorId,
                branchId: activeBranchId,
                appointmentDate: parsedDate,
                NOT: { status: 'CANCELLED' }
            }
        });

        if (existingTimeSlot) {
            return res.status(409).json({ message: 'This time slot is already booked for the selected doctor.' });
        }

        let appointment;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            try {
                const bookingNumber = await generateBookingNumber();

                // If this is a surgery appointment, ensure patient has emergency contact (either in DB or in this request)
                if ((type || 'consultation').toLowerCase() === 'surgery') {
                    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
                    if (!patient) return res.status(404).json({ message: 'Patient not found' });
                    
                    const hasEmergencyInDb = patient.emergencyContactName && patient.emergencyContactPhone;
                    const hasEmergencyInRequest = emergencyContactName && emergencyContactPhone;
                    
                    if (!hasEmergencyInDb && !hasEmergencyInRequest) {
                        return res.status(400).json({ message: 'Emergency contact required for surgery appointments.' });
                    }
                }

                // Determine initial status based on date
                const now = new Date();
                const isToday = parsedDate.getFullYear() === now.getFullYear() &&
                               parsedDate.getMonth() === now.getMonth() &&
                               parsedDate.getDate() === now.getDate();
                const initialStatus = isToday ? 'PENDING' : 'SCHEDULED';

                // Create appointment and (if surgery) a billing record atomically
                appointment = await prisma.$transaction(async (tx) => {
                    const resolvedAppointmentType = (type || 'consultation').toLowerCase();
                    const resolvedBillingStatus = String(billingStatus || 'UNPAID').toUpperCase();
                    const totalAmount = Number(billingAmount ?? amount ?? 0) || 0;
                    const discount = Number(billingDiscount ?? 0) || 0;
                    const finalAmount = Math.max(0, totalAmount - discount);
                    const parsedDueDate = dueDate ? new Date(dueDate) : null;

                    const apt = await tx.appointment.create({
                        data: {
                            bookingNumber,
                            patientId,
                            doctorId,
                            branchId: activeBranchId,
                            appointmentDate: parsedDate,
                            status: initialStatus,
                            amount: totalAmount,
                            type: resolvedAppointmentType,
                            notes: notes || null,
                            location: location || null,
                            eyeSide: eyeSide || null,
                            createdById: req.user.id
                        },
                        include: {
                            patient: { select: { id: true, fullName: true } },
                            doctor: { include: { user: { select: { fullName: true } } } },
                            branch: { select: { branchName: true } }
                        }
                    });

                    await tx.billing.create({
                        data: {
                            patientId,
                            branchId: activeBranchId,
                            appointmentId: apt.id,
                            serviceType: resolvedAppointmentType === 'surgery' ? 'SURGERY' : 'APPOINTMENT',
                            totalAmount,
                            discount,
                            finalAmount,
                            paymentMethod: paymentMethod || null,
                            referenceNumber: referenceNumber || null,
                            status: resolvedBillingStatus === 'PARTIAL' ? 'PARTIALLY_PAID' : resolvedBillingStatus,
                            dueDate: parsedDueDate && !Number.isNaN(parsedDueDate.getTime()) ? parsedDueDate : null,
                            notes: billingNotes || notes || null,
                            createdById: req.user.id,
                        }
                    });

                    // Update patient emergency contact if provided
                    if (emergencyContactName || emergencyContactPhone) {
                        await tx.patient.update({
                            where: { id: patientId },
                            data: {
                                emergencyContactName: emergencyContactName || undefined,
                                emergencyContactPhone: emergencyContactPhone || undefined,
                                emergencyContactRelationship: emergencyContactRelationship || undefined,
                            }
                        });
                    }

                    return apt;
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

        emitEvent('appointment:created', appointment, activeBranchId);
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
                    createdBy: { select: { fullName: true } },
                    billings: { select: { id: true, finalAmount: true, status: true } },
                    clinicalExamination: { include: { surgery: true } }
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
                clinicalExamination: { include: { surgery: true, examinedBy: { include: { user: { select: { fullName: true } } } } } },
                erExamination: true,
                billings: { include: { lineItems: true } }
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
        const { doctorId, appointmentDate, status, amount, type, notes, location, billingAmount, billingDiscount, billingStatus, paymentMethod, referenceNumber, dueDate, billingNotes, eyeSide } = req.body;

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

            // Automate status based on the new date if status was not explicitly provided or was already in a scheduled state
            if (status === undefined || existing.status === 'SCHEDULED' || existing.status === 'PENDING') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkDate = new Date(parsedDate);
                checkDate.setHours(0, 0, 0, 0);

                if (checkDate.getTime() === today.getTime()) {
                    data.status = 'PENDING';
                } else {
                    data.status = 'SCHEDULED';
                }
            }
        }

        if (appointmentDate !== undefined || doctorId !== undefined) {
            const nextDate = appointmentDate !== undefined ? new Date(appointmentDate) : existing.appointmentDate;
            const nextDoctorId = doctorId ?? existing.doctorId;
            const { start: dayStart, end: dayEnd } = getDayBounds(nextDate);

            const existingSameDay = await prisma.appointment.findFirst({
                where: {
                    id: { not: existing.id },
                    patientId: existing.patientId,
                    branchId: existing.branchId,
                    appointmentDate: { gte: dayStart, lte: dayEnd },
                    NOT: { status: 'CANCELLED' }
                }
            });

            if (existingSameDay) {
                return res.status(409).json({ message: 'Patient already has an appointment on this date.' });
            }

            const existingTimeSlot = await prisma.appointment.findFirst({
                where: {
                    id: { not: existing.id },
                    doctorId: nextDoctorId,
                    branchId: existing.branchId,
                    appointmentDate: nextDate,
                    NOT: { status: 'CANCELLED' }
                }
            });

            if (existingTimeSlot) {
                return res.status(409).json({ message: 'This time slot is already booked for the selected doctor.' });
            }
        }
        if (status !== undefined) data.status = status;
        if (amount !== undefined) data.amount = amount;
        if (type !== undefined) data.type = type;
        if (notes !== undefined) data.notes = notes || null;
        if (location !== undefined) data.location = location || null;
        if (eyeSide !== undefined) data.eyeSide = eyeSide || null;
        if (amount !== undefined || billingAmount !== undefined) data.amount = Number(billingAmount ?? amount ?? existing.amount ?? 0);

        const appointment = await prisma.appointment.update({
            where: { id: req.params.id },
            data,
            include: {
                patient: { select: { id: true, fullName: true } },
                doctor: { include: { user: { select: { fullName: true } } } },
                branch: { select: { branchName: true } }
            }
        });

        const resolvedAppointmentType = String(type || existing.type || 'consultation').toLowerCase();
        const resolvedBillingStatus = billingStatus ? String(billingStatus).toUpperCase() : null;
        const totalAmount = Number(billingAmount ?? amount ?? appointment.amount ?? existing.amount ?? 0) || 0;
        const discount = Number(billingDiscount ?? 0) || 0;
        const finalAmount = Math.max(0, totalAmount - discount);
        const parsedDueDate = dueDate ? new Date(dueDate) : null;

        const billingStatusToUpdate = resolvedBillingStatus
            ? (resolvedBillingStatus === 'PARTIAL' ? 'PARTIALLY_PAID' : resolvedBillingStatus)
            : undefined;

        const existingBilling = await prisma.billing.findFirst({ where: { appointmentId: appointment.id } });
        if (existingBilling) {
            await prisma.billing.update({
                where: { id: existingBilling.id },
                data: {
                    serviceType: resolvedAppointmentType === 'surgery' ? 'SURGERY' : 'APPOINTMENT',
                    totalAmount,
                    discount,
                    finalAmount,
                    paymentMethod: paymentMethod !== undefined ? (paymentMethod || null) : existingBilling.paymentMethod,
                    referenceNumber: referenceNumber !== undefined ? (referenceNumber || null) : existingBilling.referenceNumber,
                    status: billingStatusToUpdate,
                    dueDate: dueDate !== undefined ? (parsedDueDate && !Number.isNaN(parsedDueDate.getTime()) ? parsedDueDate : null) : existingBilling.dueDate,
                    notes: billingNotes !== undefined ? (billingNotes || null) : existingBilling.notes,
                }
            });
        } else {
            await prisma.billing.create({
                data: {
                    patientId: appointment.patientId,
                    branchId: appointment.branchId,
                    appointmentId: appointment.id,
                    serviceType: resolvedAppointmentType === 'surgery' ? 'SURGERY' : 'APPOINTMENT',
                    totalAmount,
                    discount,
                    finalAmount,
                    paymentMethod: paymentMethod || null,
                    referenceNumber: referenceNumber || null,
                    status: billingStatusToUpdate || 'UNPAID',
                    dueDate: parsedDueDate && !Number.isNaN(parsedDueDate.getTime()) ? parsedDueDate : null,
                    notes: billingNotes || notes || null,
                    createdById: req.user.id,
                }
            });
        }

        // If appointment type was changed to surgery, ensure emergency contact and create billing if missing
        if (type !== undefined && String(type).toLowerCase() === 'surgery' && String(existing.type || '').toLowerCase() !== 'surgery') {
            const patient = await prisma.patient.findUnique({ where: { id: appointment.patientId } });
            if (!patient) return res.status(404).json({ message: 'Patient not found' });
            if (!patient.emergencyContactName || !patient.emergencyContactPhone) {
                return res.status(400).json({ message: 'Emergency contact required for surgery appointments. Please update patient record.' });
            }
        }

        emitEvent('appointment:updated', appointment, appointment.branchId);
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
        emitEvent('appointment:deleted', { id: req.params.id }, existing.branchId);
        res.status(200).json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        next(error);
    }
};
export const markAsArrived = async (req, res, next) => {
    try {
        const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Appointment not found' });

        if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED') {
            return res.status(400).json({ message: 'Cannot mark a completed or cancelled appointment as arrived.' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const aptDate = new Date(existing.appointmentDate);
        if (!isSameDay(aptDate, today)) {
            return res.status(400).json({ message: 'Only today appointments can be marked as arrived.' });
        }

        const newStatus = 'RECEIVED';

        const appointment = await prisma.appointment.update({
            where: { id: req.params.id },
            data: { status: newStatus },
            include: {
                patient: { select: { id: true, fullName: true } },
                doctor: { include: { user: { select: { fullName: true } } } },
                branch: { select: { branchName: true } }
            }
        });

        emitEvent('appointment:updated', appointment, appointment.branchId);
        res.status(200).json(appointment);
    } catch (error) {
        next(error);
    }
};
