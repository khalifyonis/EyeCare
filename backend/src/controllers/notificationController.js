import prisma from '../lib/prisma.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

const todayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
};

const formatTime = (date) =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function sortNotifications(items) {
    return items.sort((a, b) => {
        const p = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
        if (p !== 0) return p;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export const getNotifications = async (req, res, next) => {
    try {
        const role = (req.user.role || '').toUpperCase();
        const branchFilter = getBranchFilter(req);
        const today = todayRange();
        const now = new Date();
        const notifications = [];

        let doctorId = null;
        if (role === 'DOCTOR') {
            const doctor = await prisma.doctor.findFirst({
                where: { userId: req.user.id, ...branchFilter },
                select: { id: true },
            });
            doctorId = doctor?.id ?? null;
        }

        const canSeeAppointments = ['SUPERADMIN', 'ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(role);
        const canSeeInventory = ['SUPERADMIN', 'ADMIN', 'PHARMACIST', 'OPTICIAN'].includes(role);
        const canSeeBilling = ['SUPERADMIN', 'ADMIN', 'RECEPTIONIST'].includes(role);
        const canSeeFollowUps = ['SUPERADMIN', 'ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(role);

        const queries = [];

        if (canSeeAppointments) {
            queries.push(
                prisma.appointment.findMany({
                    where: {
                        ...branchFilter,
                        appointmentDate: today,
                        status: { in: ['PENDING', 'SCHEDULED', 'CONFIRMED', 'RECEIVED'] },
                        ...(doctorId ? { doctorId } : {}),
                    },
                    take: 6,
                    orderBy: { appointmentDate: 'asc' },
                    include: {
                        patient: { select: { fullName: true } },
                        doctor: { include: { user: { select: { fullName: true } } } },
                    },
                }).then((rows) => {
                    for (const appt of rows) {
                        notifications.push({
                            id: `appointment-${appt.id}`,
                            type: 'APPOINTMENT',
                            title: 'Appointment today',
                            message: `${appt.patient?.fullName || 'Patient'} at ${formatTime(appt.appointmentDate)}${doctorId ? '' : ` — Dr. ${appt.doctor?.user?.fullName || '—'}`}`,
                            link: `/dashboard/appointments?date=today&status=${appt.status}`,
                            createdAt: appt.appointmentDate.toISOString(),
                            priority: 'high',
                        });
                    }
                })
            );
        }

        if (canSeeFollowUps) {
            queries.push(
                prisma.followUp.count({
                    where: {
                        ...branchFilter,
                        status: 'PENDING',
                        dueDate: { lt: now },
                    },
                }).then((count) => {
                    if (count > 0) {
                        notifications.push({
                            id: 'followup-overdue-summary',
                            type: 'FOLLOWUP',
                            title: 'Overdue follow-ups',
                            message: `${count} patient follow-up${count === 1 ? '' : 's'} overdue and need attention`,
                            link: '/dashboard/reports/operational?view=all',
                            createdAt: now.toISOString(),
                            priority: 'high',
                        });
                    }
                })
            );
        }

        if (canSeeBilling) {
            queries.push(
                prisma.billing.count({
                    where: {
                        ...branchFilter,
                        status: { in: ['UNPAID', 'PARTIAL', 'PARTIALLY_PAID'] },
                    },
                }).then((count) => {
                    if (count > 0) {
                        notifications.push({
                            id: 'billing-unpaid-summary',
                            type: 'BILLING',
                            title: 'Outstanding payments',
                            message: `${count} invoice${count === 1 ? '' : 's'} with unpaid or partial balance`,
                            link: '/dashboard/billing?view=all&status=OUTSTANDING',
                            createdAt: now.toISOString(),
                            priority: 'medium',
                        });
                    }
                })
            );
        }

        if (canSeeInventory && (role === 'PHARMACIST' || role === 'SUPERADMIN' || role === 'ADMIN')) {
            queries.push(
                prisma.pharmacyItem.findMany({
                    where: { ...branchFilter, isActive: true },
                    select: { id: true, itemName: true, stockQuantity: true, reorderLevel: true },
                    take: 100,
                }).then((items) => {
                    const low = items.filter((i) => (i.reorderLevel ?? 0) > 0 && (i.stockQuantity ?? 0) <= i.reorderLevel);
                    if (low.length > 0) {
                        notifications.push({
                            id: 'pharmacy-low-stock-summary',
                            type: 'INVENTORY',
                            title: 'Pharmacy low stock',
                            message: `${low.length} medicine${low.length === 1 ? '' : 's'} at or below reorder level`,
                            link: '/dashboard/pharmacy/inventory?view=lowstock',
                            createdAt: now.toISOString(),
                            priority: 'medium',
                        });
                    }
                    for (const item of low.slice(0, 3)) {
                        notifications.push({
                            id: `pharmacy-low-${item.id}`,
                            type: 'INVENTORY',
                            title: 'Low stock alert',
                            message: `${item.itemName}: ${item.stockQuantity} left (reorder at ${item.reorderLevel})`,
                            link: '/dashboard/pharmacy/inventory?view=lowstock',
                            createdAt: now.toISOString(),
                            priority: 'low',
                        });
                    }
                })
            );

            queries.push(
                prisma.prescription.count({
                    where: {
                        ...branchFilter,
                        itemType: 'PHARMACY',
                        status: 'PENDING',
                    },
                }).then((count) => {
                    if (count > 0) {
                        notifications.push({
                            id: 'medicine-pending-summary',
                            type: 'PRESCRIPTION',
                            title: 'Pending medicine prescriptions',
                            message: `${count} prescription${count === 1 ? '' : 's'} waiting to be dispensed`,
                            link: '/dashboard/prescription/medicine?status=PENDING&view=all',
                            createdAt: now.toISOString(),
                            priority: 'high',
                        });
                    }
                })
            );
        }

        if (canSeeInventory && (role === 'OPTICIAN' || role === 'SUPERADMIN' || role === 'ADMIN')) {
            queries.push(
                prisma.opticalItem.findMany({
                    where: { ...branchFilter, isActive: true },
                    select: { id: true, itemName: true, stockQuantity: true, reorderLevel: true },
                    take: 100,
                }).then((items) => {
                    const low = items.filter((i) => (i.reorderLevel ?? 0) > 0 && (i.stockQuantity ?? 0) <= i.reorderLevel);
                    if (low.length > 0) {
                        notifications.push({
                            id: 'optical-low-stock-summary',
                            type: 'INVENTORY',
                            title: 'Optical low stock',
                            message: `${low.length} optical item${low.length === 1 ? '' : 's'} at or below reorder level`,
                            link: '/dashboard/optical-shop/frames?view=lowstock',
                            createdAt: now.toISOString(),
                            priority: 'medium',
                        });
                    }
                })
            );

            queries.push(
                prisma.opticalPrescription.count({
                    where: {
                        ...branchFilter,
                        status: 'FILLED',
                    },
                }).then((count) => {
                    if (count > 0) {
                        notifications.push({
                            id: 'optical-pending-summary',
                            type: 'PRESCRIPTION',
                            title: 'Optical prescriptions ready',
                            message: `${count} optical prescription${count === 1 ? '' : 's'} ready for dispensing`,
                            link: '/dashboard/prescription/optical?status=ACTIVE&view=all',
                            createdAt: now.toISOString(),
                            priority: 'high',
                        });
                    }
                })
            );
        }

        if (['SUPERADMIN', 'ADMIN'].includes(role)) {
            queries.push(
                prisma.activityLog.findMany({
                    where: branchFilter.branchId ? { branchId: branchFilter.branchId } : {},
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: { user: { select: { fullName: true } } },
                }).then((logs) => {
                    for (const log of logs) {
                        notifications.push({
                            id: `activity-${log.id}`,
                            type: 'ACTIVITY',
                            title: log.action.replace(/_/g, ' '),
                            message: `${log.user?.fullName || 'Staff'} — ${log.module || log.entityType}${log.details ? `: ${String(log.details).slice(0, 60)}` : ''}`,
                            link: '/dashboard/activity-log',
                            createdAt: log.createdAt.toISOString(),
                            priority: 'low',
                        });
                    }
                })
            );
        }

        await Promise.all(queries);

        const sorted = sortNotifications(notifications).slice(0, 25);

        res.json({
            notifications: sorted,
            total: sorted.length,
        });
    } catch (error) {
        next(error);
    }
};
