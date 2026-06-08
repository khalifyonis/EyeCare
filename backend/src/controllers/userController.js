import 'dotenv/config';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendOnboardingEmail } from '../services/emailService.js';
import { logActivity, logAudit, LOG_MODULES, ACTIVITY_ACTIONS, AUDIT_ACTIONS, ENTITY_TYPES, sanitizeForAudit } from '../lib/logging/index.js';



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
        const whereClause = (req.user.role === 'SUPERADMIN' || !req.user.branchId)
            ? {}
            : {
                OR: [
                    // Primary branch (older data + seed users)
                    { branchId: req.user.branchId },
                    // Staff assignment (newer data)
                    {
                        staffAssignments: {
                            some: {
                                branchId: req.user.branchId,
                            }
                        }
                    },
                ]
            };

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                branch: true,
                staffAssignments: { include: { branch: true } }
            },
            orderBy: { fullName: 'asc' },
        });

        const sanitizedUsers = users.map(user => {
            const { password, ...rest } = user;
            const branches = user.staffAssignments?.length
                ? user.staffAssignments.map(sa => sa.branch)
                : (user.branch ? [user.branch] : []);
            return {
                ...rest,
                roleName: user.role,
                branchName: user.branch?.branchName || '',
                branches
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
            include: { branch: true }
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
        const whereClause = {
            id,
            ...((req.user.role === 'SUPERADMIN' || !req.user.branchId)
                ? {}
                : {
                    OR: [
                        { branchId: req.user.branchId },
                        {
                            staffAssignments: {
                                some: {
                                    branchId: req.user.branchId,
                                }
                            }
                        },
                    ]
                })
        };

        const user = await prisma.user.findFirst({
            where: whereClause,
            include: {
                doctor: true,
                staffAssignments: { include: { branch: true } },
                branch: true,
            },
        });

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const { password, staffAssignments, ...sanitizedUser } = user;
        const branches = staffAssignments?.length
            ? staffAssignments.map(sa => sa.branch)
            : (user.branch ? [user.branch] : []);
        res.status(200).json({
            ...sanitizedUser,
            roleName: user.role,
            branches
        });
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
        let { fullName, username, email, password, roleName, branchId, branchIds, licenseNumber, specialization } = req.body;

        // Ensure branchIds is an array
        const finalBranchIds = Array.isArray(branchIds) ? branchIds : (branchId ? [branchId] : []);

        // Clean and Sanitize
        fullName = fullName?.trim();
        username = username?.trim();
        email = email?.trim()?.toLowerCase();

        // Rigorous Validation
        if (!fullName || !username || !email || !roleName || finalBranchIds.length === 0) {
            const error = new Error('Full name, username, email, at least one branch, and role are required');
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

        // Validate role exists in CustomRole table
        const roleExists = await prisma.customRole.findUnique({
            where: { name: roleName.toUpperCase() }
        });
        if (!roleExists) {
            const error = new Error(`Invalid role: ${roleName}. This role does not exist in the database.`);
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
                    role: roleName.toUpperCase(),
                    branch: { connect: { id: finalBranchIds[0] } }, // Default primary branch
                    staffAssignments: {
                        create: finalBranchIds.map(id => ({ branchId: id }))
                    }
                },
            });

            if (roleName.toUpperCase() === 'DOCTOR') {
                if (!specialization) {
                    throw new Error('Doctor profile requires a specialization');
                }
                await tx.doctor.create({
                    data: {
                        user: { connect: { id: user.id } },
                        licenseNumber,
                        specialization,
                        branch: { connect: { id: finalBranchIds[0] } },
                    },
                });
            }

            return user;
        });

        // Send onboarding email with the actual password used
        const emailResult = await sendOnboardingEmail(email, fullName, username, finalPassword, roleName.toUpperCase());

        if (!emailResult.success) {
            // Delete the created user so we do not have an orphaned user without credentials
            await prisma.user.delete({ where: { id: newUser.id } });
            const error = new Error(`Failed to send onboarding email to ${email}: ${emailResult.error}`);
            error.statusCode = 500;
            throw error;
        }

        const { password: _, ...sanitizedUser } = newUser;

        logActivity(req, {
            branchId: finalBranchIds[0],
            action: ACTIVITY_ACTIONS.CREATE,
            module: LOG_MODULES.USERS,
            entityType: ENTITY_TYPES.USER,
            entityId: newUser.id,
            details: `Created user ${newUser.fullName} (${newUser.role})`,
        }).catch(() => {});
        logAudit(req, {
            branchId: finalBranchIds[0],
            action: AUDIT_ACTIONS.CREATE,
            module: LOG_MODULES.USERS,
            entityType: ENTITY_TYPES.USER,
            entityId: newUser.id,
            summary: `Created user account`,
            after: sanitizeForAudit(sanitizedUser),
        }).catch(() => {});

        res.status(201).json({
            message: 'User created successfully',
            user: sanitizedUser,
            emailSent: true,
        });
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { fullName, username, email, password, roleName, branchId, branchIds, licenseNumber, specialization } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { id },
            include: { doctor: true }
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
            const roleExists = await prisma.customRole.findUnique({
                where: { name: roleName.toUpperCase() }
            });
            if (!roleExists) {
                const error = new Error(`Invalid role: ${roleName}. This role does not exist in the database.`);
                error.statusCode = 400;
                throw error;
            }
            updateData.role = roleName.toUpperCase();
        }

        if (branchIds && Array.isArray(branchIds)) {
            // We'll update the staff assignments in the transaction
        } else if (branchId) {
            updateData.branch = { connect: { id: branchId } };
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id },
                data: updateData,
            });

            // Update multi-branch assignments if provided
            if (branchIds && Array.isArray(branchIds)) {
                // Remove old assignments
                await tx.staffAssignment.deleteMany({
                    where: { userId: id }
                });
                // Create new assignments
                await tx.staffAssignment.createMany({
                    data: branchIds.map(bId => ({
                        userId: id,
                        branchId: bId
                    }))
                });

                // Also update the primary branchId if the first one changed
                if (branchIds.length > 0) {
                    await tx.user.update({
                        where: { id },
                        data: { branchId: branchIds[0] }
                    });
                }
            }

            const currentRole = existingUser.role;
            const targetRole = roleName ? roleName.toUpperCase() : currentRole;

            if (targetRole === 'DOCTOR') {
                await tx.doctor.upsert({
                    where: { userId: id },
                    update: {
                        specialization: specialization || existingUser.doctor?.specialization || 'OPHTHALMOLOGY',
                        branch: { connect: { id: branchId || existingUser.branchId } },
                    },
                    create: {
                        user: { connect: { id: id } },
                        specialization: specialization || 'OPHTHALMOLOGY',
                        branch: { connect: { id: branchId || existingUser.branchId } },
                    },
                });
            } else if (currentRole === 'DOCTOR' && targetRole !== 'DOCTOR') {
                await tx.doctor.delete({ where: { userId: id } }).catch(() => { });
            }

            return user;
        });

        const { password: _, ...sanitizedUser } = updatedUser;

        logActivity(req, {
            branchId: updatedUser.branchId,
            action: ACTIVITY_ACTIONS.UPDATE,
            module: LOG_MODULES.USERS,
            entityType: ENTITY_TYPES.USER,
            entityId: updatedUser.id,
            details: `Updated user ${updatedUser.fullName}`,
        }).catch(() => {});
        logAudit(req, {
            branchId: updatedUser.branchId,
            action: AUDIT_ACTIONS.UPDATE,
            module: LOG_MODULES.USERS,
            entityType: ENTITY_TYPES.USER,
            entityId: updatedUser.id,
            summary: `Updated user account`,
            before: sanitizeForAudit(existingUser),
            after: sanitizeForAudit(sanitizedUser),
        }).catch(() => {});

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

        logActivity(req, {
            branchId: user.branchId,
            action: ACTIVITY_ACTIONS.DELETE,
            module: LOG_MODULES.USERS,
            entityType: ENTITY_TYPES.USER,
            entityId: user.id,
            details: `Deleted user ${user.fullName}`,
        }).catch(() => {});
        logAudit(req, {
            branchId: user.branchId,
            action: AUDIT_ACTIONS.DELETE,
            module: LOG_MODULES.USERS,
            entityType: ENTITY_TYPES.USER,
            entityId: user.id,
            summary: `Deleted user account`,
            before: sanitizeForAudit(user),
        }).catch(() => {});

        await prisma.$transaction(async (tx) => {
            await tx.doctor.delete({ where: { userId: id } }).catch(() => { });
            await tx.user.delete({ where: { id } });
        });

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
};
