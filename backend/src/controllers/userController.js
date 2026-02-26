import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendOnboardingEmail } from '../services/emailService.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Generate a random 8-character temporary password.
 */
function generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    const randomBytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
        password += chars[randomBytes[i] % chars.length];
    }
    return password;
}

export const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            include: { role: true, branch: true },
            orderBy: { fullName: 'asc' },
        });

        const sanitizedUsers = users.map(user => {
            const { password, ...rest } = user;
            return {
                ...rest,
                roleName: user.role.name,
            };
        });

        res.status(200).json(sanitizedUsers);
    } catch (error) {
        next(error);
    }
};

export const uploadProfileImage = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            const error = new Error('No image file provided');
            error.statusCode = 400;
            throw error;
        }

        const profileImage = `/uploads/profiles/${req.file.filename}`;

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { profileImage },
            include: { role: true }
        });

        res.status(200).json({
            message: 'Profile image updated successfully',
            profileImage,
            user: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                role: true,
                doctor: true,
            },
        });

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const { password, ...sanitizedUser } = user;
        res.status(200).json({ ...sanitizedUser, roleName: user.role.name });
    } catch (error) {
        next(error);
    }
};

const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

export const createUser = async (req, res, next) => {
    try {
        let { fullName, username, email, password, roleName, branchId, licenseNumber, specialization } = req.body;

        // Clean and Sanitize
        fullName = fullName?.trim();
        username = username?.trim();
        email = email?.trim()?.toLowerCase();

        // Rigorous Validation
        if (!fullName || !username || !email || !roleName || !branchId) {
            const error = new Error('Full name, username, email, branch, and role are required');
            error.statusCode = 400;
            throw error;
        }

        if (fullName.length < 3) {
            const error = new Error('Full name must be at least 3 characters long');
            error.statusCode = 400;
            throw error;
        }

        if (username.length < 3 || username.includes(' ')) {
            const error = new Error('Username must be at least 3 characters and cannot contain spaces');
            error.statusCode = 400;
            throw error;
        }

        if (!validateEmail(email)) {
            const error = new Error('Invalid email address format');
            error.statusCode = 400;
            throw error;
        }

        const roleRecord = await prisma.role.findUnique({
            where: { name: roleName.toUpperCase() },
        });

        if (!roleRecord) {
            const error = new Error(`Invalid role: ${roleName}`);
            error.statusCode = 400;
            throw error;
        }

        // Use provided password or generate one
        const finalPassword = password || generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(finalPassword, 10);

        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    fullName,
                    username,
                    email,
                    password: hashedPassword,
                    role: { connect: { id: roleRecord.id } },
                    branch: { connect: { id: branchId } },
                },
            });

            if (roleName.toUpperCase() === 'DOCTOR') {
                if (!licenseNumber || !specialization) {
                    throw new Error('Doctor profile requires license number and specialization');
                }
                await tx.doctor.create({
                    data: {
                        user: { connect: { id: user.id } },
                        licenseNumber,
                        specialization,
                        branch: { connect: { id: branchId } },
                    },
                });
            }

            return user;
        });

        // Send onboarding email with the actual password used
        const emailResult = await sendOnboardingEmail(email, fullName, username, finalPassword, roleName.toUpperCase());

        const { password: _, ...sanitizedUser } = newUser;
        res.status(201).json({
            message: 'User created successfully',
            user: sanitizedUser,
            emailSent: emailResult.success,
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { fullName, username, email, password, roleName, branchId, licenseNumber, specialization } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { id },
            include: { role: true, doctor: true }
        });

        if (!existingUser) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        let updateData = {};

        // Validate and Sanitize inputs
        if (fullName !== undefined) {
            const trimmedName = fullName.trim();
            if (trimmedName.length < 3) {
                const error = new Error('Full name must be at least 3 characters long');
                error.statusCode = 400;
                throw error;
            }
            updateData.fullName = trimmedName;
        }

        if (username !== undefined) {
            const trimmedUsername = username.trim();
            if (trimmedUsername.length < 3 || trimmedUsername.includes(' ')) {
                const error = new Error('Username must be at least 3 characters and cannot contain spaces');
                error.statusCode = 400;
                throw error;
            }
            updateData.username = trimmedUsername;
        }

        if (email !== undefined) {
            const trimmedEmail = email.trim().toLowerCase();
            if (!validateEmail(trimmedEmail)) {
                const error = new Error('Invalid email address format');
                error.statusCode = 400;
                throw error;
            }
            updateData.email = trimmedEmail;
        }

        // Enforce 6-character minimum for manual password updates
        if (password) {
            if (password.length < 6) {
                const error = new Error('Password must be at least 6 characters long');
                error.statusCode = 400;
                throw error;
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (roleName) {
            const roleRecord = await prisma.role.findUnique({
                where: { name: roleName.toUpperCase() },
            });
            if (roleRecord) {
                updateData.role = { connect: { id: roleRecord.id } };
            }
        }

        if (branchId) {
            updateData.branch = { connect: { id: branchId } };
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id },
                data: updateData,
            });

            const currentRole = existingUser.role.name;
            const targetRole = roleName ? roleName.toUpperCase() : currentRole;

            if (targetRole === 'DOCTOR') {
                await tx.doctor.upsert({
                    where: { userId: id },
                    update: {
                        licenseNumber: licenseNumber || existingUser.doctor?.licenseNumber,
                        specialization: specialization || existingUser.doctor?.specialization,
                        branch: { connect: { id: branchId || existingUser.branchId } },
                    },
                    create: {
                        user: { connect: { id: id } },
                        licenseNumber: licenseNumber || '',
                        specialization: specialization || '',
                        branch: { connect: { id: branchId || existingUser.branchId } },
                    },
                });
            } else if (currentRole === 'DOCTOR' && targetRole !== 'DOCTOR') {
                await tx.doctor.delete({ where: { userId: id } }).catch(() => { });
            }

            return user;
        });

        const { password: _, ...sanitizedUser } = updatedUser;
        res.status(200).json({ message: 'User updated successfully', user: sanitizedUser });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        await prisma.$transaction(async (tx) => {
            await tx.doctor.delete({ where: { userId: id } }).catch(() => { });
            await tx.user.delete({ where: { id } });
        });

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
};
