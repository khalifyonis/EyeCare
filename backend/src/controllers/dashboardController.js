import prisma from '../lib/prisma.js';
import moment from 'moment';

export const getDashboardStats = async (req, res, next) => {
    try {
        const branchFilter = (req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId };

        const now = moment();
        const startOfToday = now.clone().startOf('day').toDate();

        const [
            totalPatients,
            appointmentsToday,
            totalDoctors,
            totalExams,
            recentPatients,
            recentAppointments
        ] = await Promise.all([
            prisma.patient.count({ where: branchFilter }),
            prisma.appointment.count({
                where: {
                    ...branchFilter,
                    appointmentDate: {
                        gte: startOfToday,
                        lte: now.clone().endOf('day').toDate()
                    }
                }
            }),
            prisma.doctor.count({ where: branchFilter }),
            prisma.clinicalExamination.count({
                where: {
                    appointment: {
                        ...branchFilter
                    }
                }
            }),
            prisma.patient.findMany({
                where: branchFilter,
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.appointment.findMany({
                where: branchFilter,
                orderBy: { appointmentDate: 'desc' },
                take: 5,
                include: {
                    patient: { select: { fullName: true } },
                    doctor: { include: { user: { select: { fullName: true } } } }
                }
            })
        ]);

        res.status(200).json({
            totalPatients,
            appointmentsToday,
            totalDoctors,
            totalExams,
            recentPatients,
            recentAppointments
        });
    } catch (error) {
        next(error);
    }
};
