import prisma from '../lib/prisma.js';
import { getPaginationParams, sendPaginated } from '../lib/pagination.js';

export const getAllDoctors = async (req, res, next) => {
    try {
        const { search, specialization } = req.query;

        const whereClause = {
            ...((req.user.role === 'SUPERADMIN' || !req.user.branchId) ? {} : { branchId: req.user.branchId }),
            ...(specialization ? { specialization: { contains: specialization, mode: 'insensitive' } } : {}),
            ...(search ? {
                OR: [
                    { user: { fullName: { contains: search, mode: 'insensitive' } } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                    { licenseNumber: { contains: search, mode: 'insensitive' } },
                ]
            } : {})
        };

        const { skip, take, page, limit } = getPaginationParams(req.query);

        const [doctors, total] = await Promise.all([
            prisma.doctor.findMany({
                where: whereClause,
                skip,
                take,
                include: {
                    user: {
                        include: {
                            branch: true,
                        }
                    },
                },
                orderBy: {
                    user: {
                        fullName: 'asc',
                    },
                },
            }),
            prisma.doctor.count({ where: whereClause })
        ]);

        const formattedDoctors = doctors.map((doc) => {
            if (!doc.user) {
                console.error(`Doctor record ${doc.id} is missing associated user!`);
                return null;
            }
            return {
                id: doc.userId, // User ID for the dialog
                doctorId: doc.id,
                userId: doc.userId,
                fullName: doc.user.fullName,
                username: doc.user.username,
                email: doc.user.email,
                profileImage: doc.user.profileImage,
                isActive: doc.user.isActive,
                branchName: doc.user.branch?.branchName || 'N/A',
                branchId: doc.user.branchId,
                roleName: 'DOCTOR',
                licenseNumber: doc.licenseNumber,
                specialization: doc.specialization,
                phone: doc.phone || doc.user.phone || 'N/A',
                doctor: {
                    licenseNumber: doc.licenseNumber,
                    specialization: doc.specialization
                }
            };
        }).filter(Boolean);

        sendPaginated(res, formattedDoctors, total, page, limit);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        next(error);
    }
};
