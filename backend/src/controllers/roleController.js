import prisma from '../lib/prisma.js';

/**
 * Get all custom roles
 */
export const getAllRoles = async (req, res, next) => {
    try {
        const roles = await prisma.customRole.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json(roles);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new custom role
 */
export const createRole = async (req, res, next) => {
    try {
        let { name, description } = req.body;
        name = name?.trim()?.toUpperCase();

        if (!name) {
            const error = new Error('Role name is required');
            error.statusCode = 400;
            throw error;
        }

        // Verify alphanumeric name
        if (!/^[A-Z0-9_]+$/.test(name)) {
            const error = new Error('Role name can only contain letters, numbers, and underscores');
            error.statusCode = 400;
            throw error;
        }

        const existing = await prisma.customRole.findUnique({
            where: { name }
        });

        if (existing) {
            const error = new Error(`Role "${name}" already exists`);
            error.statusCode = 400;
            throw error;
        }

        const newRole = await prisma.$transaction(async (tx) => {
            const role = await tx.customRole.create({
                data: {
                    name,
                    description,
                    isSystem: false
                }
            });

            // Automatically seed default blank permissions for all system modules
            const modules = [
                'patients', 'appointments', 'eye_exams', 'surgery',
                'prescriptions', 'reports', 'pharmacy', 'optical',
                'billing', 'users', 'logs', 'branches'
            ];

            await tx.rolePermission.createMany({
                data: modules.map(mod => ({
                    roleName: name,
                    module: mod,
                    canRead: false,
                    canCreate: false,
                    canUpdate: false,
                    canDelete: false
                }))
            });

            return role;
        });

        res.status(201).json({
            message: 'Custom role created successfully',
            role: newRole
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update a custom role description
 */
export const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { description } = req.body;

        const role = await prisma.customRole.findUnique({
            where: { id }
        });

        if (!role) {
            const error = new Error('Role not found');
            error.statusCode = 404;
            throw error;
        }

        const updated = await prisma.customRole.update({
            where: { id },
            data: { description }
        });

        res.status(200).json({
            message: 'Role updated successfully',
            role: updated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a custom role
 */
export const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;

        const role = await prisma.customRole.findUnique({
            where: { id }
        });

        if (!role) {
            const error = new Error('Role not found');
            error.statusCode = 404;
            throw error;
        }

        if (role.name === 'SUPERADMIN') {
            const error = new Error('The SUPERADMIN role cannot be deleted');
            error.statusCode = 400;
            throw error;
        }

        // Verify if any users are assigned to this role in the system
        const activeUsersCount = await prisma.user.count({
            where: { role: role.name }
        });

        if (activeUsersCount > 0) {
            const error = new Error(`Cannot delete role. There are ${activeUsersCount} active staff members currently assigned to the "${role.name}" role.`);
            error.statusCode = 400;
            throw error;
        }

        // Clean up role permissions and delete role in transaction
        await prisma.$transaction(async (tx) => {
            // Delete associated permissions
            await tx.rolePermission.deleteMany({
                where: { roleName: role.name }
            });

            // Delete custom role definition
            await tx.customRole.delete({
                where: { id }
            });
        });

        res.status(200).json({
            message: `Role "${role.name}" deleted successfully`
        });
    } catch (error) {
        next(error);
    }
};
