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
            include: {
                role: true,
                doctor: true,
            },
            orderBy: {
                fullName: 'asc',
            },
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

export const createUser = async (req, res, next) => {
    try {
        const { fullName, username, email, roleName, licenseNumber, specialization } = req.body;

        if (!fullName || !username || !email || !roleName) {
            const error = new Error('Full name, username, email, and role are required');
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

        // Generate a random 8-character temporary password
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    fullName,
                    username,
                    email,
                    password: hashedPassword,
                    roleId: roleRecord.id,
                },
            });

            if (roleName.toUpperCase() === 'DOCTOR') {
                if (!licenseNumber || !specialization) {
                    throw new Error('Doctor profile requires license number and specialization');
                }
                await tx.doctor.create({
                    data: {
                        userId: user.id,
                        licenseNumber,
                        specialization,
                    },
                });
            }

            return user;
        });

        // Send onboarding email (non-blocking — user creation succeeds even if email fails)
        const emailResult = await sendOnboardingEmail(email, fullName, username, temporaryPassword, roleName.toUpperCase());

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
        const { fullName, username, email, password, roleName, licenseNumber, specialization } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { id },
            include: { role: true, doctor: true }
        });

        if (!existingUser) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        let updateData = { fullName, username };

        // Handle email update
        if (email) {
            updateData.email = email;
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
                updateData.roleId = roleRecord.id;
            }
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
                    },
                    create: {
                        userId: id,
                        licenseNumber: licenseNumber || '',
                        specialization: specialization || '',
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
