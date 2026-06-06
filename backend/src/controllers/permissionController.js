import prisma from '../lib/prisma.js';

/**
 * Fetch all role permissions grouped by role
 */
export const getAllPermissions = async (req, res, next) => {
    try {
        const permissions = await prisma.rolePermission.findMany({
            orderBy: { roleName: 'asc' }
        });

        // Group by roleName
        const grouped = permissions.reduce((acc, curr) => {
            const role = curr.roleName;
            if (!acc[role]) {
                acc[role] = [];
            }
            acc[role].push({
                id: curr.id,
                module: curr.module,
                canRead: curr.canRead,
                canCreate: curr.canCreate,
                canUpdate: curr.canUpdate,
                canDelete: curr.canDelete
            });
            return acc;
        }, {});

        res.status(200).json(grouped);
    } catch (error) {
        next(error);
    }
};

/**
 * Fetch permissions for the currently authenticated user's role
 */
export const getMyPermissions = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized.' });
        }

        const role = req.user.role;

        // SUPERADMIN gets full access dynamically
        if (role === 'SUPERADMIN') {
            const modules = [
                'patients', 'appointments', 'eye_exams', 'surgery', 
                'prescriptions', 'reports', 'pharmacy', 'optical', 
                'billing', 'users', 'logs', 'branches'
            ];
            const superadminPerms = modules.map(m => ({
                module: m,
                canRead: true,
                canCreate: true,
                canUpdate: true,
                canDelete: true
            }));
            return res.status(200).json(superadminPerms);
        }

        const permissions = await prisma.rolePermission.findMany({
            where: { roleName: role }
        });

        const formatted = permissions.map(p => ({
            module: p.module,
            canRead: p.canRead,
            canCreate: p.canCreate,
            canUpdate: p.canUpdate,
            canDelete: p.canDelete
        }));

        res.status(200).json(formatted);
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk update/upsert permissions for a role
 */
export const updateRolePermissions = async (req, res, next) => {
    try {
        const { role, permissions } = req.body; // permissions: [{ module: 'patients', canRead: true, ... }]

        if (!role || !Array.isArray(permissions)) {
            const error = new Error('Role name and permissions array are required');
            error.statusCode = 400;
            throw error;
        }

        // Validate role exists in CustomRole table
        const roleExists = await prisma.customRole.findUnique({
            where: { name: role.toUpperCase() }
        });
        if (!roleExists) {
            const error = new Error(`Invalid role: ${role}. This role does not exist in the database.`);
            error.statusCode = 400;
            throw error;
        }

        if (role.toUpperCase() === 'SUPERADMIN') {
            const error = new Error('Superadmin permissions are hardcoded and cannot be modified');
            error.statusCode = 400;
            throw error;
        }

        const updated = await prisma.$transaction(
            permissions.map(perm => {
                return prisma.rolePermission.upsert({
                    where: {
                        roleName_module: {
                            roleName: role.toUpperCase(),
                            module: perm.module
                        }
                    },
                    update: {
                        canRead: !!perm.canRead,
                        canCreate: !!perm.canCreate,
                        canUpdate: !!perm.canUpdate,
                        canDelete: !!perm.canDelete
                    },
                    create: {
                        roleName: role.toUpperCase(),
                        module: perm.module,
                        canRead: !!perm.canRead,
                        canCreate: !!perm.canCreate,
                        canUpdate: !!perm.canUpdate,
                        canDelete: !!perm.canDelete
                    }
                });
            })
        );

        res.status(200).json({
            message: `Permissions updated successfully for role ${role}`,
            updated
        });
    } catch (error) {
        next(error);
    }
};
