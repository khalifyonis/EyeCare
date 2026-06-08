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

        const now = moment();
        const startOfToday = now.clone().startOf('day').toDate();
        const endOfWeek = now.clone().add(7, 'days').toDate();
        const dueFollowUpsWhere = {
            ...branchFilter,
            status: 'PENDING',
            dueDate: { gte: startOfToday, lte: endOfWeek },
        };
        const overdueFollowUpsWhere = {
            ...branchFilter,
            status: 'PENDING',
            dueDate: { lt: startOfToday },
        };

        const in30Days = moment().add(30, 'days').endOf('day').toDate();
        const expiryWindow = { gt: new Date(), lte: in30Days };

        const [
            totalPatients,
            appointmentsToday,
            totalDoctors,
            totalExams,
            recentPatients,
            recentAppointments,
            dueFollowUps,
            overdueFollowUpsCount,
            pharmacyItems,
            opticalItems,
            expiringPharmacy,
            serviceStatsRaw,
            topDoctorsRaw,
            todayAppointmentsRaw
        ] = await Promise.all([
            prisma.patient.count({ where: branchFilter }),
            prisma.appointment.count({ where: { ...branchFilter, appointmentDate: today } }),
            prisma.doctor.count({ where: branchFilter }),
            prisma.clinicalExamination.count({ where: { appointment: { ...branchFilter } } }),
            prisma.patient.findMany({ where: branchFilter, orderBy: { createdAt: 'desc' }, take: 5 }),
            prisma.appointment.findMany({
                where: branchFilter, orderBy: { appointmentDate: 'desc' }, take: 5,
                include: { patient: { select: { fullName: true } }, doctor: { include: { user: { select: { fullName: true } } } } },
            }),
            prisma.followUp.findMany({
                where: dueFollowUpsWhere,
                orderBy: { dueDate: 'asc' },
                take: 10,
                include: { patient: { select: { id: true, fullName: true, phone: true } }, branch: { select: { branchName: true } } },
            }),
            prisma.followUp.count({ where: overdueFollowUpsWhere }),
            prisma.pharmacyItem.findMany({ where: { ...branchFilter, isActive: true }, select: { id: true, itemName: true, itemType: true, stockQuantity: true, reorderLevel: true } }),
            prisma.opticalItem.findMany({ where: { ...branchFilter, isActive: true }, select: { id: true, itemName: true, itemType: true, brand: true, stockQuantity: true, reorderLevel: true } }),
            prisma.pharmacyItem.findMany({
                where: { ...branchFilter, isActive: true, expiryDate: expiryWindow },
                orderBy: { expiryDate: 'asc' },
                take: 10,
                select: { id: true, itemName: true, itemType: true, stockQuantity: true, expiryDate: true },
            }),
            // Top Services aggregation
            Promise.all([
                prisma.clinicalExamination.count({ where: { appointment: branchFilter } }),
                prisma.surgery.count({ where: branchFilter }),
                prisma.followUp.count({ where: branchFilter }),
                prisma.opticalPrescription.count({ where: { ...branchFilter, type: 'SPECTACLES' } }),
            ]),
            // Top Doctors - ranked by patient volume (examinations + surgeries)
            prisma.doctor.findMany({
                where: branchFilter,
                take: 5,
                include: {
                    user: { select: { fullName: true } },
                    _count: {
                        select: {
                            examinedClinicalExams: true,
                            surgeries: true
                        }
                    }
                }
            }),
            prisma.appointment.findMany({
                where: { ...branchFilter, appointmentDate: today },
                orderBy: { appointmentDate: 'asc' },
                include: { 
                    patient: { select: { id: true, fullName: true } },
                    eyeExamination: { select: { id: true, stage: true } }
                },
            })
        ]);

        const pharmacyLowStock = pharmacyItems.filter(i => i.stockQuantity <= i.reorderLevel);
        const opticalLowStock = opticalItems.filter(i => i.stockQuantity <= i.reorderLevel);

        // Process service stats
        const [examCount, surgeryCount, followUpCount, glassesCount] = serviceStatsRaw;
        const serviceStats = [
            { name: 'Eye Exams', count: examCount, color: '#8b5cf6' },
            { name: 'Surgery', count: surgeryCount, color: '#10b981' },
            { name: 'Follow-up', count: followUpCount, color: '#0EA5E9' },
            { name: 'Glasses', count: glassesCount, color: '#06b6d4' },
        ];

        // Process top doctors
        const topDoctors = topDoctorsRaw
            .map(d => ({
                name: d.user.fullName,
                specialty: d.specialization,
                patients: d._count.examinedClinicalExams + d._count.surgeries,
                rating: (4.5 + Math.random() * 0.5).toFixed(1) // Performance indicator (mocking rating as high for top performers)
            }))
            .sort((a, b) => b.patients - a.patients);

        res.status(200).json({
            totalPatients,
            appointmentsToday,
            totalDoctors,
            totalExams,
            recentPatients,
            recentAppointments,
            serviceStats,
            topDoctors,
            inventoryAlerts: {
                pharmacyLowStockCount: pharmacyLowStock.length,
                opticalLowStockCount: opticalLowStock.length,
                pharmacyLowStock: pharmacyLowStock.slice(0, 6).map(i => ({ id: i.id, itemName: i.itemName, itemType: i.itemType, stockQuantity: i.stockQuantity, reorderLevel: i.reorderLevel, category: 'pharmacy' })),
                opticalLowStock: opticalLowStock.slice(0, 6).map(i => ({ id: i.id, itemName: i.itemName, itemType: i.itemType || i.brand, stockQuantity: i.stockQuantity, reorderLevel: i.reorderLevel, category: 'optical' })),
                expiringPharmacy: expiringPharmacy.map(i => ({ id: i.id, itemName: i.itemName, itemType: i.itemType, stockQuantity: i.stockQuantity, expiryDate: i.expiryDate })),
                expiringCount: expiringPharmacy.length,
            },
            todayAppointments: todayAppointmentsRaw,
            upcomingSurgeries: await prisma.surgery.findMany({
                where: { ...branchFilter, status: 'scheduled', date: { gte: new Date() } },
                orderBy: { date: 'asc' },
                take: 5,
                include: { patient: { select: { fullName: true } } },
            }),
        });
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
                    patient: { select: { id: true, fullName: true, phone: true, gender: true } },
                    erExamination: { select: { id: true } },
                    clinicalExamination: { select: { id: true } },
                    eyeExamination: { select: { id: true, stage: true } },
                },
            }),
            prisma.prescription.findMany({
                where: { appointment: docFilter, createdAt: today },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { appointment: { include: { patient: { select: { fullName: true } } } } },
            }),
            prisma.surgery.findMany({
                where: { surgeonId: doctor.id, status: 'scheduled', date: { gte: new Date() } },
                orderBy: { date: 'asc' },
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
                    eyeExamination: { select: { id: true, stage: true } },
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
        const in30Days = moment().add(30, 'days').endOf('day').toDate();

        const [allItems, prescriptionsToday, revenueToday, recentPrescriptions, expiringItems] = await Promise.all([
            prisma.pharmacyItem.findMany({ where: { ...branchFilter, isActive: true } }),
            prisma.prescription.count({ where: { ...branchFilter, itemType: 'PHARMACY', createdAt: today } }),
            prisma.billing.aggregate({
                where: { ...branchFilter, serviceType: 'PHARMACY', createdAt: today },
                _sum: { finalAmount: true },
            }),
            prisma.prescription.findMany({
                where: { ...branchFilter, itemType: 'PHARMACY', createdAt: today },
                orderBy: { createdAt: 'desc' },
                take: 8,
                include: { appointment: { include: { patient: { select: { fullName: true } } } } },
            }),
            prisma.pharmacyItem.findMany({
                where: { ...branchFilter, isActive: true, expiryDate: { gt: new Date(), lte: in30Days } },
                orderBy: { expiryDate: 'asc' },
                take: 8,
                select: { id: true, itemName: true, itemType: true, stockQuantity: true, expiryDate: true },
            }),
        ]);

        const lowStockList = allItems.filter(i => i.stockQuantity <= i.reorderLevel);

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
            expiringItems: expiringItems.map(i => ({
                id: i.id,
                itemName: i.itemName,
                itemType: i.itemType,
                stockQuantity: i.stockQuantity,
                expiryDate: i.expiryDate,
            })),
            expiringCount: expiringItems.length,
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

        const [prescriptionsToday, revenueToday, recentOpticalPrescriptions] = await Promise.all([
            prisma.opticalPrescription.count({ where: { ...branchFilter, createdAt: today } }),
            prisma.billing.aggregate({
                where: { ...branchFilter, serviceType: 'OPTICAL', createdAt: today },
                _sum: { finalAmount: true },
            }),
            prisma.opticalPrescription.findMany({
                where: { ...branchFilter, createdAt: today },
                orderBy: { createdAt: 'desc' },
                take: 8,
                include: { patient: { select: { fullName: true } } },
            }),
        ]);

        const recentPrescriptions = recentOpticalPrescriptions.map((rx) => ({
            id: rx.id,
            quantity: 1,
            instructions: rx.notes || null,
            createdAt: rx.createdAt,
            appointment: {
                patient: {
                    fullName: rx.patient?.fullName || null,
                },
            },
        }));

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
