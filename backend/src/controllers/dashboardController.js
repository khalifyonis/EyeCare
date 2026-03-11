import prisma from '../lib/prisma.js';
import moment from 'moment';

function todayRange() {
    const now = moment();
    return {
        gte: now.clone().startOf('day').toDate(),
        lte: now.clone().endOf('day').toDate(),
    };
}

// ── Admin / SuperAdmin dashboard ──
export const getDashboardStats = async (req, res, next) => {
    try {
        const branchFilter = (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };
        const today = todayRange();

        const [totalPatients, appointmentsToday, totalDoctors, totalExams, recentPatients, recentAppointments] = await Promise.all([
            prisma.patient.count({ where: branchFilter }),
            prisma.appointment.count({ where: { ...branchFilter, appointmentDate: today } }),
            prisma.doctor.count({ where: branchFilter }),
            prisma.clinicalExamination.count({ where: { appointment: { ...branchFilter } } }),
            prisma.patient.findMany({ where: branchFilter, orderBy: { createdAt: 'desc' }, take: 5 }),
            prisma.appointment.findMany({
                where: branchFilter, orderBy: { appointmentDate: 'desc' }, take: 5,
                include: { patient: { select: { fullName: true } }, doctor: { include: { user: { select: { fullName: true } } } } },
            }),
        ]);

        res.status(200).json({ totalPatients, appointmentsToday, totalDoctors, totalExams, recentPatients, recentAppointments });
    } catch (error) {
        next(error);
    }
};

// ── Doctor dashboard ──
export const getDoctorDashboard = async (req, res, next) => {
    try {
        const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
        if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

        const today = todayRange();
        const docFilter = { doctorId: doctor.id };

        const [
            myAppointmentsToday,
            myPendingToday,
            myCompletedToday,
            myTotalPatients,
            todaySchedule,
            recentPrescriptions,
            upcomingSurgeries,
        ] = await Promise.all([
            prisma.appointment.count({ where: { ...docFilter, appointmentDate: today } }),
            prisma.appointment.count({ where: { ...docFilter, appointmentDate: today, status: 'PENDING' } }),
            prisma.appointment.count({ where: { ...docFilter, appointmentDate: today, status: 'COMPLETED' } }),
            prisma.appointment.groupBy({ by: ['patientId'], where: docFilter }).then(r => r.length),
            prisma.appointment.findMany({
                where: { ...docFilter, appointmentDate: today },
                orderBy: { appointmentDate: 'asc' },
                take: 10,
                include: {
                    patient: { select: { fullName: true, phone: true, gender: true } },
                    erExamination: { select: { id: true } },
                    clinicalExamination: { select: { id: true } },
                },
            }),
            prisma.prescription.findMany({
                where: { appointment: docFilter },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { appointment: { include: { patient: { select: { fullName: true } } } } },
            }),
            prisma.surgery.findMany({
                where: { surgeonId: doctor.id, status: 'PENDING', surgeryDate: { gte: new Date() } },
                orderBy: { surgeryDate: 'asc' },
                take: 5,
                include: { clinicalExam: { include: { appointment: { include: { patient: { select: { fullName: true } } } } } } },
            }),
        ]);

        res.json({
            myAppointmentsToday,
            myPendingToday,
            myCompletedToday,
            myTotalPatients,
            todaySchedule,
            recentPrescriptions,
            upcomingSurgeries,
        });
    } catch (error) {
        next(error);
    }
};

// ── Receptionist dashboard ──
export const getReceptionistDashboard = async (req, res, next) => {
    try {
        const branchFilter = req.user.branchId ? { branchId: req.user.branchId } : {};
        const today = todayRange();

        const [
            appointmentsToday,
            newPatientsToday,
            pendingToday,
            completedToday,
            todayQueue,
            recentPatients,
            unpaidBillings,
        ] = await Promise.all([
            prisma.appointment.count({ where: { ...branchFilter, appointmentDate: today } }),
            prisma.patient.count({ where: { ...branchFilter, createdAt: today } }),
            prisma.appointment.count({ where: { ...branchFilter, appointmentDate: today, status: 'PENDING' } }),
            prisma.appointment.count({ where: { ...branchFilter, appointmentDate: today, status: 'COMPLETED' } }),
            prisma.appointment.findMany({
                where: { ...branchFilter, appointmentDate: today },
                orderBy: { appointmentDate: 'asc' },
                take: 10,
                include: {
                    patient: { select: { fullName: true, phone: true } },
                    doctor: { include: { user: { select: { fullName: true } } } },
                },
            }),
            prisma.patient.findMany({ where: branchFilter, orderBy: { createdAt: 'desc' }, take: 5 }),
            prisma.billing.count({ where: { ...branchFilter, status: 'UNPAID' } }),
        ]);

        res.json({
            appointmentsToday,
            newPatientsToday,
            pendingToday,
            completedToday,
            todayQueue,
            recentPatients,
            unpaidBillings,
        });
    } catch (error) {
        next(error);
    }
};

// ── Pharmacist dashboard ──
export const getPharmacistDashboard = async (req, res, next) => {
    try {
        const branchFilter = req.user.branchId ? { branchId: req.user.branchId } : {};
        const today = todayRange();

        const allItems = await prisma.pharmacyItem.findMany({ where: { ...branchFilter, isActive: true } });
        const lowStockList = allItems.filter(i => i.stockQuantity <= i.reorderLevel);

        const [prescriptionsToday, revenueToday, recentPrescriptions] = await Promise.all([
            prisma.prescription.count({ where: { ...branchFilter, itemType: 'PHARMACY', createdAt: today } }),
            prisma.billing.aggregate({
                where: { ...branchFilter, serviceType: 'PHARMACY', createdAt: today },
                _sum: { finalAmount: true },
            }),
            prisma.prescription.findMany({
                where: { ...branchFilter, itemType: 'PHARMACY' },
                orderBy: { createdAt: 'desc' },
                take: 8,
                include: { appointment: { include: { patient: { select: { fullName: true } } } } },
            }),
        ]);

        res.json({
            prescriptionsToday,
            lowStockCount: lowStockList.length,
            totalItems: allItems.length,
            revenueToday: Number(revenueToday._sum.finalAmount || 0),
            recentPrescriptions,
            stockAlerts: lowStockList.slice(0, 8).map(i => ({
                id: i.id,
                itemName: i.itemName,
                itemType: i.itemType,
                stockQuantity: i.stockQuantity,
                reorderLevel: i.reorderLevel,
            })),
        });
    } catch (error) {
        next(error);
    }
};

// ── Optician dashboard ──
export const getOpticianDashboard = async (req, res, next) => {
    try {
        const branchFilter = req.user.branchId ? { branchId: req.user.branchId } : {};
        const today = todayRange();

        const allItems = await prisma.opticalItem.findMany({ where: { ...branchFilter, isActive: true } });
        const lowStockList = allItems.filter(i => i.stockQuantity <= i.reorderLevel);

        const [prescriptionsToday, revenueToday, recentPrescriptions] = await Promise.all([
            prisma.prescription.count({ where: { ...branchFilter, itemType: 'OPTICAL', createdAt: today } }),
            prisma.billing.aggregate({
                where: { ...branchFilter, serviceType: 'OPTICAL', createdAt: today },
                _sum: { finalAmount: true },
            }),
            prisma.prescription.findMany({
                where: { ...branchFilter, itemType: 'OPTICAL' },
                orderBy: { createdAt: 'desc' },
                take: 8,
                include: { appointment: { include: { patient: { select: { fullName: true } } } } },
            }),
        ]);

        const typeCounts = allItems.reduce((acc, item) => {
            const t = item.itemType || 'Other';
            acc[t] = (acc[t] || 0) + item.stockQuantity;
            return acc;
        }, {});

        res.json({
            prescriptionsToday,
            lowStockCount: lowStockList.length,
            totalItems: allItems.length,
            revenueToday: Number(revenueToday._sum.finalAmount || 0),
            recentPrescriptions,
            stockAlerts: lowStockList.slice(0, 8).map(i => ({
                id: i.id,
                itemName: i.itemName,
                itemType: i.itemType,
                brand: i.brand,
                stockQuantity: i.stockQuantity,
                reorderLevel: i.reorderLevel,
            })),
            inventoryByType: Object.entries(typeCounts).map(([name, value]) => ({ name, value })),
        });
    } catch (error) {
        next(error);
    }
};
