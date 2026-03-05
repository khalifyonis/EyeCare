import prisma from '../lib/prisma.js';

export const getAllDoctors = async (req, res, next) => {
    try {
        const { search, specialization } = req.query;

        const whereClause = {
            ...(specialization ? { specialization: { contains: specialization, mode: 'insensitive' } } : {}),
            OR: search ? [
                { user: { fullName: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { licenseNumber: { contains: search, mode: 'insensitive' } },
            ] : undefined
        };

        const doctors = await prisma.doctor.findMany({
            where: whereClause,
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
        });

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

        res.status(200).json(formattedDoctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        next(error);
    }
};
