import prisma from '../lib/prisma.js';

const getBranchFilter = (req) => {
    return (req.user.role === 'SUPERADMIN' || !req.user.branchId)
        ? {}
        : { branchId: req.user.branchId };
};

const getDateFilter = (from, to, dateField = 'createdAt') => {
    if (from && to) {
        const fromStart = new Date(from);
        fromStart.setHours(0, 0, 0, 0);
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        return { [dateField]: { gte: fromStart, lte: toEnd } };
    }
    return {};
};

const getDaysInRange = (from, to) => {
    if (!from || !to) return 30; // Default to 30 days if not provided
    const start = new Date(from);
    const end = new Date(to);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // Prevent division by zero
};

export const getFinancialReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const branchFilter = getBranchFilter(req);
        const dateFilter = getDateFilter(from, to);

        const billings = await prisma.billing.findMany({
            where: {
                ...branchFilter,
                ...dateFilter,
            },
            select: {
                id: true,
                createdAt: true,
                status: true,
                finalAmount: true,
                serviceType: true,
                invoiceNumber: true,
                patient: { select: { fullName: true } },
                discount: true,
                totalAmount: true,
                paymentMethod: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        const kpis = {
            totalRevenue: 0,
            outstanding: 0,
            totalInvoices: billings.length,
            avgInvoice: 0,
        };

        const revenueByDate = {};
        const revenueByService = {};

        let totalPaid = 0;
        let countPaid = 0;

        for (const b of billings) {
            const amount = Number(b.finalAmount) || 0;
            if (b.status === 'PAID') {
                kpis.totalRevenue += amount;
                totalPaid += amount;
                countPaid++;

                const dateStr = b.createdAt.toISOString().slice(0, 10);
                revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + amount;

                revenueByService[b.serviceType] = (revenueByService[b.serviceType] || 0) + amount;
            } else if (b.status === 'UNPAID' || b.status === 'PARTIALLY_PAID') {
                kpis.outstanding += amount;
            }
        }

        kpis.avgInvoice = countPaid > 0 ? totalPaid / countPaid : 0;

        const chart1 = Object.keys(revenueByDate).sort().map(date => ({
            name: date,
            value: revenueByDate[date]
        }));

        const chart2 = Object.keys(revenueByService).map(service => ({
            name: service,
            value: revenueByService[service]
        }));

        res.json({ kpis, chart1, chart2, tableData: billings });
    } catch (error) {
        next(error);
    }
};

export const getClinicalReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const branchFilter = getBranchFilter(req);
        const dateFilter = getDateFilter(from, to);

        const [exams, surgeries, prescriptions, followUps] = await Promise.all([
            prisma.eyeExamination.findMany({
                where: { ...branchFilter, ...dateFilter },
                include: { patient: { select: { fullName: true } }, doctor: { select: { user: { select: { fullName: true } } } } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.surgery.findMany({
                where: { ...branchFilter, ...getDateFilter(from, to, 'date') },
                include: { patient: { select: { fullName: true } }, surgeon: { select: { user: { select: { fullName: true } } } } },
                orderBy: { date: 'desc' }
            }),
            prisma.prescription.count({
                where: { ...branchFilter, ...dateFilter }
            }),
            prisma.followUp.findMany({
                where: { ...branchFilter, ...dateFilter }
            })
        ]);

        const kpis = {
            totalExaminations: exams.length,
            surgeriesDone: surgeries.filter(s => s.status === 'completed' || s.status === 'COMPLETED').length,
            prescriptions: prescriptions,
            followUpRate: 0
        };

        let followUpDone = 0;
        for (const f of followUps) {
            if (f.status === 'DONE') followUpDone++;
        }
        kpis.followUpRate = followUps.length > 0 ? (followUpDone / followUps.length) * 100 : 0;

        const trendByDate = {};
        const stageDist = { PRELIMINARY: 0, CLINICAL: 0, COMPLETED: 0 };

        for (const e of exams) {
            const dateStr = e.createdAt.toISOString().slice(0, 10);
            trendByDate[dateStr] = trendByDate[dateStr] || { name: dateStr, exams: 0, surgeries: 0 };
            trendByDate[dateStr].exams++;
            if (stageDist[e.stage] !== undefined) stageDist[e.stage]++;
        }

        const surgeryTypes = {};
        for (const s of surgeries) {
            const dateStr = s.date.toISOString().slice(0, 10);
            trendByDate[dateStr] = trendByDate[dateStr] || { name: dateStr, exams: 0, surgeries: 0 };
            trendByDate[dateStr].surgeries++;
            
            surgeryTypes[s.surgeryType] = (surgeryTypes[s.surgeryType] || 0) + 1;
        }

        const chart1 = Object.values(trendByDate).sort((a, b) => a.name.localeCompare(b.name));
        const chart2 = Object.keys(surgeryTypes).map(type => ({ name: type, value: surgeryTypes[type] }));

        const tableData = [
            ...exams.map(e => ({
                id: e.id,
                date: e.createdAt,
                patient: e.patient?.fullName,
                doctor: e.doctor?.user?.fullName,
                type: 'Eye Examination',
                details: e.diagnosis || '—',
                status: e.stage
            })),
            ...surgeries.map(s => ({
                id: s.id,
                date: s.date,
                patient: s.patient?.fullName,
                doctor: s.surgeon?.user?.fullName,
                type: 'Surgery',
                details: s.surgeryType,
                status: s.status
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json({ kpis, chart1, chart2, tableData });
    } catch (error) {
        next(error);
    }
};

export const getAppointmentReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const branchFilter = getBranchFilter(req);
        const dateFilter = getDateFilter(from, to, 'appointmentDate');

        const appointments = await prisma.appointment.findMany({
            where: { ...branchFilter, ...dateFilter },
            include: {
                patient: { select: { fullName: true } },
                doctor: { select: { user: { select: { fullName: true } } } }
            },
            orderBy: { appointmentDate: 'desc' }
        });

        const kpis = {
            totalAppointments: appointments.length,
            completionRate: 0,
            cancellationRate: 0,
            avgPerDay: 0,
        };

        const days = getDaysInRange(from, to);
        kpis.avgPerDay = appointments.length / days;

        let completed = 0;
        let cancelled = 0;
        
        const trendByDate = {};
        const statusDist = {};

        for (const a of appointments) {
            if (a.status === 'COMPLETED') completed++;
            if (a.status === 'CANCELLED') cancelled++;

            const dateStr = a.appointmentDate.toISOString().slice(0, 10);
            trendByDate[dateStr] = trendByDate[dateStr] || { name: dateStr, total: 0, completed: 0, cancelled: 0 };
            trendByDate[dateStr].total++;
            if (a.status === 'COMPLETED') trendByDate[dateStr].completed++;
            if (a.status === 'CANCELLED') trendByDate[dateStr].cancelled++;

            statusDist[a.status] = (statusDist[a.status] || 0) + 1;
        }

        kpis.completionRate = appointments.length > 0 ? (completed / appointments.length) * 100 : 0;
        kpis.cancellationRate = appointments.length > 0 ? (cancelled / appointments.length) * 100 : 0;

        const chart1 = Object.values(trendByDate).sort((a, b) => a.name.localeCompare(b.name));
        const chart2 = Object.keys(statusDist).map(status => ({ name: status, value: statusDist[status] }));

        res.json({ kpis, chart1, chart2, tableData: appointments });
    } catch (error) {
        next(error);
    }
};

export const getPatientReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const branchFilter = getBranchFilter(req);
        const dateFilter = getDateFilter(from, to);

        const allPatients = await prisma.patient.findMany({
            where: { ...branchFilter },
            select: { id: true, createdAt: true, gender: true, dateOfBirth: true }
        });

        const newPatients = await prisma.patient.findMany({
            where: { ...branchFilter, ...dateFilter },
            orderBy: { createdAt: 'desc' }
        });

        const kpis = {
            totalPatients: allPatients.length,
            newInPeriod: newPatients.length,
            genderDist: '0M / 0F',
            avgAge: 0
        };

        let male = 0;
        let female = 0;
        let totalAge = 0;
        let ageCount = 0;
        
        const ageDist = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };

        for (const p of allPatients) {
            const g = (p.gender || '').toUpperCase();
            if (g === 'MALE') male++;
            else if (g === 'FEMALE') female++;

            if (p.dateOfBirth) {
                const ageDifMs = Date.now() - new Date(p.dateOfBirth).getTime();
                const ageDate = new Date(ageDifMs);
                const age = Math.abs(ageDate.getUTCFullYear() - 1970);
                totalAge += age;
                ageCount++;

                if (age <= 18) ageDist['0-18']++;
                else if (age <= 30) ageDist['19-30']++;
                else if (age <= 45) ageDist['31-45']++;
                else if (age <= 60) ageDist['46-60']++;
                else ageDist['60+']++;
            }
        }

        kpis.genderDist = `${male}M / ${female}F`;
        kpis.avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;

        const trendByDate = {};
        for (const p of newPatients) {
            const dateStr = p.createdAt.toISOString().slice(0, 10);
            trendByDate[dateStr] = (trendByDate[dateStr] || 0) + 1;
        }

        const chart1 = Object.keys(trendByDate).sort().map(date => ({ name: date, value: trendByDate[date] }));
        const chart2 = Object.keys(ageDist).map(group => ({ name: group, value: ageDist[group] }));

        res.json({ kpis, chart1, chart2, tableData: newPatients });
    } catch (error) {
        next(error);
    }
};

export const getInventoryReport = async (req, res, next) => {
    try {
        const branchFilter = getBranchFilter(req);

        const [pharmacyItems, opticalItems] = await Promise.all([
            prisma.pharmacyItem.findMany({ where: branchFilter }),
            prisma.opticalItem.findMany({ where: branchFilter })
        ]);

        const kpis = {
            totalItems: pharmacyItems.length + opticalItems.length,
            stockValue: 0,
            lowStockAlerts: 0,
            expiringSoon: 0
        };

        const now = new Date();
        const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        const categoryValue = { Pharmacy: 0, Optical: 0 };
        const expiryTimeline = { 'Expired': 0, 'This Month': 0, 'Next 30 Days': 0, 'Next 90 Days': 0 };

        for (const p of pharmacyItems) {
            const stock = p.stockQuantity || 0;
            const price = Number(p.sellingPrice) || 0;
            const rl = p.reorderLevel || 0;
            
            kpis.stockValue += stock * price;
            categoryValue.Pharmacy += stock * price;

            if (rl > 0 && stock <= rl) kpis.lowStockAlerts++;

            if (p.expiryDate) {
                const ed = new Date(p.expiryDate);
                if (ed <= ninetyDaysFromNow) {
                    kpis.expiringSoon++;
                    if (ed < now) expiryTimeline['Expired']++;
                    else {
                        const diffTime = Math.abs(ed - now);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 30) expiryTimeline['Next 30 Days']++;
                        else expiryTimeline['Next 90 Days']++;
                    }
                }
            }
        }

        for (const o of opticalItems) {
            const stock = o.stockQuantity || 0;
            const price = Number(o.sellingPrice) || 0;
            const rl = o.reorderLevel || 0;

            kpis.stockValue += stock * price;
            categoryValue.Optical += stock * price;

            if (rl > 0 && stock <= rl) kpis.lowStockAlerts++;
        }

        const chart1 = Object.keys(categoryValue).map(cat => ({ name: cat, value: categoryValue[cat] }));
        const chart2 = Object.keys(expiryTimeline).map(time => ({ name: time, value: expiryTimeline[time] }));

        const tableData = [
            ...pharmacyItems.map(p => ({
                id: p.id,
                name: p.itemName,
                category: p.category,
                type: 'Pharmacy',
                stock: p.stockQuantity,
                reorderLevel: p.reorderLevel,
                purchasePrice: Number(p.purchasePrice),
                sellingPrice: Number(p.sellingPrice),
                expiryDate: p.expiryDate,
                status: p.stockQuantity <= p.reorderLevel ? 'LOW STOCK' : 'OK'
            })),
            ...opticalItems.map(o => ({
                id: o.id,
                name: o.itemName,
                category: o.brand,
                type: 'Optical',
                stock: o.stockQuantity,
                reorderLevel: o.reorderLevel,
                purchasePrice: Number(o.purchasePrice),
                sellingPrice: Number(o.sellingPrice),
                expiryDate: null,
                status: o.stockQuantity <= o.reorderLevel ? 'LOW STOCK' : 'OK'
            }))
        ];

        res.json({ kpis, chart1, chart2, tableData });
    } catch (error) {
        next(error);
    }
};

export const getIncomeByServiceReport = async (req, res, next) => {
    try {
        const { from, to, branchId: qBranch } = req.query;
        const branchFilter = getBranchFilter(req);
        if (req.user.role === 'SUPERADMIN' && qBranch) branchFilter.branchId = qBranch;
        const dateFilter = getDateFilter(from, to);

        const billings = await prisma.billing.findMany({
            where: { ...branchFilter, ...dateFilter },
            select: {
                id: true,
                createdAt: true,
                status: true,
                finalAmount: true,
                totalAmount: true,
                discount: true,
                serviceType: true,
                paymentMethod: true,
                patient: { select: { fullName: true, patientNumber: true } },
                appointment: { select: { doctor: { select: { user: { select: { fullName: true } } } } } },
                surgery: { select: { surgeon: { select: { user: { select: { fullName: true } } } } } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const serviceGroups = {
            APPOINTMENT: { label: 'Appointments', count: 0, revenue: 0, outstanding: 0, rows: [] },
            SURGERY: { label: 'Surgeries', count: 0, revenue: 0, outstanding: 0, rows: [] },
            PHARMACY: { label: 'Medicines (Pharmacy)', count: 0, revenue: 0, outstanding: 0, rows: [] },
            OPTICAL: { label: 'Optical Services', count: 0, revenue: 0, outstanding: 0, rows: [] },
        };

        let totalRevenue = 0;
        let totalOutstanding = 0;
        let totalInvoices = 0;

        for (const b of billings) {
            const amount = Number(b.finalAmount) || 0;
            const grp = serviceGroups[b.serviceType] || serviceGroups.APPOINTMENT;
            grp.count++;
            totalInvoices++;
            if (b.status === 'PAID') {
                grp.revenue += amount;
                totalRevenue += amount;
            } else if (b.status === 'UNPAID' || b.status === 'PARTIALLY_PAID') {
                grp.outstanding += amount;
                totalOutstanding += amount;
            }
            grp.rows.push(b);
        }

        const chart1 = Object.entries(serviceGroups).map(([key, g]) => ({
            name: g.label,
            revenue: g.revenue,
            outstanding: g.outstanding,
            count: g.count,
        }));

        const chart2 = Object.entries(serviceGroups)
            .filter(([, g]) => g.revenue > 0)
            .map(([, g]) => ({ name: g.label, value: g.revenue }));

        const dailyRevenue = {};
        for (const b of billings) {
            if (b.status === 'PAID') {
                const dateStr = b.createdAt.toISOString().slice(0, 10);
                dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + (Number(b.finalAmount) || 0);
            }
        }
        const trendChart = Object.keys(dailyRevenue).sort().map(d => ({ name: d, value: dailyRevenue[d] }));

        const summary = Object.entries(serviceGroups).map(([key, g]) => ({
            serviceType: key,
            label: g.label,
            count: g.count,
            revenue: g.revenue,
            outstanding: g.outstanding,
            share: totalRevenue > 0 ? ((g.revenue / totalRevenue) * 100).toFixed(1) : '0',
        }));

        res.json({
            kpis: { totalRevenue, totalOutstanding, totalInvoices, totalServices: Object.keys(serviceGroups).length },
            chart1,
            chart2,
            trendChart,
            summary,
            tableData: billings,
        });
    } catch (error) {
        next(error);
    }
};

export const getDoctorPerformanceReport = async (req, res, next) => {
    try {
        const { from, to, doctorId } = req.query;
        const branchFilter = getBranchFilter(req);
        const dateFilter = getDateFilter(from, to);
        const appointmentDateFilter = getDateFilter(from, to, 'appointmentDate');
        const surgeryDateFilter = getDateFilter(from, to, 'date');

        const doctorWhere = {
            ...branchFilter,
            ...(doctorId ? { id: doctorId } : {}),
        };

        const [doctors, appointments, surgeries, exams, clinicalExams] = await Promise.all([
            prisma.doctor.findMany({
                where: doctorWhere,
                include: { user: { select: { id: true, fullName: true, role: true } }, branch: { select: { branchName: true } } },
            }),
            prisma.appointment.findMany({
                where: { ...branchFilter, ...appointmentDateFilter, ...(doctorId ? { doctorId } : {}) },
                select: { id: true, doctorId: true, status: true, patientId: true, billings: { select: { finalAmount: true, status: true, serviceType: true } } },
            }),
            prisma.surgery.findMany({
                where: { ...branchFilter, ...surgeryDateFilter, ...(doctorId ? { surgeonId: doctorId } : {}) },
                select: { id: true, surgeonId: true, status: true, patientId: true, surgeryType: true, cost: true, billings: { select: { finalAmount: true, status: true } } },
            }),
            prisma.eyeExamination.findMany({
                where: { ...branchFilter, ...dateFilter, ...(doctorId ? { doctorId } : {}) },
                select: { id: true, doctorId: true, patientId: true, stage: true },
            }),
            prisma.clinicalExamination.findMany({
                where: { ...branchFilter, ...dateFilter, ...(doctorId ? { examinedById: doctorId } : {}) },
                select: { id: true, examinedById: true, patientId: true },
            }),
        ]);

        const performanceMap = {};
        for (const doc of doctors) {
            performanceMap[doc.id] = {
                doctorId: doc.id,
                name: doc.user.fullName,
                specialization: doc.specialization,
                branch: doc.branch?.branchName || '—',
                appointments: 0,
                completedAppointments: 0,
                surgeries: 0,
                completedSurgeries: 0,
                exams: 0,
                clinicalExams: 0,
                uniquePatients: new Set(),
                revenue: 0,
                outstanding: 0,
                surgeryTypes: {},
            };
        }

        for (const a of appointments) {
            const perf = performanceMap[a.doctorId];
            if (!perf) continue;
            perf.appointments++;
            if (a.status === 'COMPLETED' || a.status === 'DONE') perf.completedAppointments++;
            perf.uniquePatients.add(a.patientId);
            for (const b of a.billings) {
                const amt = Number(b.finalAmount) || 0;
                if (b.status === 'PAID') perf.revenue += amt;
                else if (b.status === 'UNPAID' || b.status === 'PARTIALLY_PAID') perf.outstanding += amt;
            }
        }

        for (const s of surgeries) {
            const perf = performanceMap[s.surgeonId];
            if (!perf) continue;
            perf.surgeries++;
            if (s.status === 'completed' || s.status === 'COMPLETED') perf.completedSurgeries++;
            perf.uniquePatients.add(s.patientId);
            perf.surgeryTypes[s.surgeryType] = (perf.surgeryTypes[s.surgeryType] || 0) + 1;
            for (const b of s.billings) {
                const amt = Number(b.finalAmount) || 0;
                if (b.status === 'PAID') perf.revenue += amt;
                else if (b.status === 'UNPAID' || b.status === 'PARTIALLY_PAID') perf.outstanding += amt;
            }
        }

        for (const e of exams) {
            const perf = performanceMap[e.doctorId];
            if (!perf) continue;
            perf.exams++;
            perf.uniquePatients.add(e.patientId);
        }

        for (const ce of clinicalExams) {
            const perf = performanceMap[ce.examinedById];
            if (!perf) continue;
            perf.clinicalExams++;
            perf.uniquePatients.add(ce.patientId);
        }

        const tableData = Object.values(performanceMap).map(p => ({
            ...p,
            uniquePatients: p.uniquePatients.size,
        }));

        const chart1 = tableData.map(d => ({ name: d.name, appointments: d.appointments, surgeries: d.surgeries, exams: d.exams }));
        const chart2 = tableData.map(d => ({ name: d.name, value: d.revenue }));

        const kpis = {
            totalDoctors: tableData.length,
            totalAppointments: tableData.reduce((s, d) => s + d.appointments, 0),
            totalSurgeries: tableData.reduce((s, d) => s + d.surgeries, 0),
            totalRevenue: tableData.reduce((s, d) => s + d.revenue, 0),
        };

        res.json({ kpis, chart1, chart2, tableData, doctors: doctors.map(d => ({ id: d.id, name: d.user.fullName })) });
    } catch (error) {
        next(error);
    }
};

export const getBranchReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const branchFilter = getBranchFilter(req);
        const dateFilter = getDateFilter(from, to);
        const appointmentDateFilter = getDateFilter(from, to, 'appointmentDate');
        const surgeryDateFilter = getDateFilter(from, to, 'date');

        const branches = await prisma.branch.findMany({
            where: req.user.role === 'SUPERADMIN' ? {} : { id: req.user.branchId },
            select: { id: true, branchName: true, isActive: true },
        });

        const branchIds = branches.map(b => b.id);
        const bFilter = branchIds.length ? { branchId: { in: branchIds } } : {};

        const [billings, appointments, surgeries, patients, exams] = await Promise.all([
            prisma.billing.findMany({
                where: { ...bFilter, ...dateFilter },
                select: { branchId: true, finalAmount: true, status: true, serviceType: true },
            }),
            prisma.appointment.findMany({
                where: { ...bFilter, ...appointmentDateFilter },
                select: { branchId: true, status: true },
            }),
            prisma.surgery.findMany({
                where: { ...bFilter, ...surgeryDateFilter },
                select: { branchId: true, status: true, surgeryType: true },
            }),
            prisma.patient.findMany({
                where: { ...bFilter, ...dateFilter },
                select: { branchId: true },
            }),
            prisma.eyeExamination.findMany({
                where: { ...bFilter, ...dateFilter },
                select: { branchId: true },
            }),
        ]);

        const branchMap = {};
        for (const b of branches) {
            branchMap[b.id] = {
                branchId: b.id,
                branchName: b.branchName,
                isActive: b.isActive,
                revenue: 0,
                outstanding: 0,
                totalInvoices: 0,
                appointments: 0,
                surgeries: 0,
                patients: 0,
                exams: 0,
            };
        }

        for (const billing of billings) {
            const bm = branchMap[billing.branchId];
            if (!bm) continue;
            const amt = Number(billing.finalAmount) || 0;
            bm.totalInvoices++;
            if (billing.status === 'PAID') bm.revenue += amt;
            else if (billing.status === 'UNPAID' || billing.status === 'PARTIALLY_PAID') bm.outstanding += amt;
        }

        for (const a of appointments) { if (branchMap[a.branchId]) branchMap[a.branchId].appointments++; }
        for (const s of surgeries) { if (branchMap[s.branchId]) branchMap[s.branchId].surgeries++; }
        for (const p of patients) { if (branchMap[p.branchId]) branchMap[p.branchId].patients++; }
        for (const e of exams) { if (branchMap[e.branchId]) branchMap[e.branchId].exams++; }

        const tableData = Object.values(branchMap);

        const kpis = {
            totalBranches: tableData.length,
            totalRevenue: tableData.reduce((s, b) => s + b.revenue, 0),
            totalAppointments: tableData.reduce((s, b) => s + b.appointments, 0),
            totalPatients: tableData.reduce((s, b) => s + b.patients, 0),
        };

        const chart1 = tableData.map(b => ({ name: b.branchName, revenue: b.revenue, appointments: b.appointments }));
        const chart2 = tableData.map(b => ({ name: b.branchName, value: b.revenue }));

        res.json({ kpis, chart1, chart2, tableData });
    } catch (error) {
        next(error);
    }
};

export const getFinancialReportEnhanced = async (req, res, next) => {
    try {
        const { from, to, doctorId, userId, paymentMethod, status: statusFilter } = req.query;
        const branchFilter = getBranchFilter(req);
        const dateFilter = getDateFilter(from, to);

        const where = { ...branchFilter, ...dateFilter };
        if (paymentMethod) where.paymentMethod = paymentMethod;
        if (statusFilter) where.status = statusFilter;
        if (userId) where.createdById = userId;

        const billings = await prisma.billing.findMany({
            where,
            select: {
                id: true,
                createdAt: true,
                status: true,
                finalAmount: true,
                serviceType: true,
                invoiceNumber: true,
                patient: { select: { fullName: true, patientNumber: true } },
                appointment: { select: { doctor: { select: { id: true, user: { select: { fullName: true } } } } } },
                surgery: { select: { surgeon: { select: { id: true, user: { select: { fullName: true } } } } } },
                discount: true,
                totalAmount: true,
                paymentMethod: true,
                createdBy: { select: { id: true, fullName: true } },
                branch: { select: { branchName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        let filtered = billings;
        if (doctorId) {
            filtered = filtered.filter(b => {
                const apptDoctor = b.appointment?.doctor?.id;
                const surgDoctor = b.surgery?.surgeon?.id;
                return apptDoctor === doctorId || surgDoctor === doctorId;
            });
        }

        const kpis = { totalRevenue: 0, outstanding: 0, totalInvoices: filtered.length, avgInvoice: 0 };
        const revenueByDate = {};
        const revenueByService = {};
        const revenueByPaymentMethod = {};
        let totalPaid = 0, countPaid = 0;

        for (const b of filtered) {
            const amount = Number(b.finalAmount) || 0;
            if (b.status === 'PAID') {
                kpis.totalRevenue += amount;
                totalPaid += amount;
                countPaid++;
                const dateStr = b.createdAt.toISOString().slice(0, 10);
                revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + amount;
                revenueByService[b.serviceType] = (revenueByService[b.serviceType] || 0) + amount;
                const pm = b.paymentMethod || 'Unspecified';
                revenueByPaymentMethod[pm] = (revenueByPaymentMethod[pm] || 0) + amount;
            } else if (b.status === 'UNPAID' || b.status === 'PARTIALLY_PAID') {
                kpis.outstanding += amount;
            }
        }

        kpis.avgInvoice = countPaid > 0 ? totalPaid / countPaid : 0;
        const chart1 = Object.keys(revenueByDate).sort().map(d => ({ name: d, value: revenueByDate[d] }));
        const chart2 = Object.keys(revenueByService).map(s => ({ name: s, value: revenueByService[s] }));
        const chart3 = Object.keys(revenueByPaymentMethod).map(m => ({ name: m, value: revenueByPaymentMethod[m] }));

        const doctors = await prisma.doctor.findMany({
            where: branchFilter,
            select: { id: true, user: { select: { fullName: true } } },
        });
        const users = await prisma.user.findMany({
            where: branchFilter,
            select: { id: true, fullName: true, role: true },
        });

        res.json({ kpis, chart1, chart2, chart3, tableData: filtered, doctors, users });
    } catch (error) {
        next(error);
    }
};

export const getOperationalReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const branchFilter = getBranchFilter(req);
        const dateFilter = getDateFilter(from, to, 'dueDate');

        const [followUps, appointments] = await Promise.all([
            prisma.followUp.findMany({
                where: { ...branchFilter, ...dateFilter },
                include: { patient: { select: { fullName: true } }, branch: { select: { branchName: true } } },
                orderBy: { dueDate: 'asc' }
            }),
            prisma.appointment.findMany({
                where: { ...branchFilter, ...getDateFilter(from, to, 'appointmentDate') },
                include: { doctor: { select: { user: { select: { fullName: true } } } } }
            })
        ]);

        const kpis = {
            avgAppointmentsPerDay: 0,
            followUpCompliance: 0,
            overdueFollowUps: 0,
            activeDoctors: 0
        };

        const days = getDaysInRange(from, to);
        kpis.avgAppointmentsPerDay = appointments.length / days;

        let followUpDone = 0;
        const statusDist = {};

        for (const f of followUps) {
            if (f.status === 'DONE') followUpDone++;
            if (f.status === 'OVERDUE') kpis.overdueFollowUps++;
            statusDist[f.status] = (statusDist[f.status] || 0) + 1;
        }
        kpis.followUpCompliance = followUps.length > 0 ? (followUpDone / followUps.length) * 100 : 0;

        const doctorWorkload = {};
        for (const a of appointments) {
            const docName = a.doctor?.user?.fullName || 'Unknown';
            doctorWorkload[docName] = (doctorWorkload[docName] || 0) + 1;
        }
        kpis.activeDoctors = Object.keys(doctorWorkload).length;

        const chart1 = Object.keys(doctorWorkload).map(doc => ({ name: doc, value: doctorWorkload[doc] }));
        const chart2 = Object.keys(statusDist).map(status => ({ name: status, value: statusDist[status] }));

        res.json({ kpis, chart1, chart2, tableData: followUps });
    } catch (error) {
        next(error);
    }
};
