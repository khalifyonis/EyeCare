import { getDefaultDashboardPath, resolveRoleName } from '@/lib/auth'

/**
 * Professional Permission Architecture
 * Maps dashboard route prefixes to their corresponding backend modules.
 * This avoids giant if/else chains and makes the system easily extensible.
 */
export const MODULE_ACCESS_MAP: Record<string, string> = {
    '/dashboard/patients': 'patients',
    '/dashboard/appointments': 'appointments',
    '/dashboard/eye-examinations/preliminary': 'preliminary_exams',
    '/dashboard/eye-examinations/clinical': 'clinical_exams',
    '/dashboard/surgery': 'surgery',
    '/dashboard/prescription/medicine': 'medicine_prescriptions',
    '/dashboard/prescription/optical': 'optical_prescriptions',
    '/dashboard/reports/financial': 'reports_financial',
    '/dashboard/reports/revenue-trend': 'reports_financial',
    '/dashboard/reports/income-by-service': 'reports_financial',
    '/dashboard/reports/clinical': 'reports_clinical',
    '/dashboard/reports/doctor-performance': 'reports_clinical',
    '/dashboard/reports/appointments': 'reports_appointments',
    '/dashboard/reports/patients': 'reports_patients',
    '/dashboard/reports/inventory': 'reports_inventory',
    '/dashboard/reports/operational': 'reports_operational',
    '/dashboard/reports/branch-report': 'reports_operational',
    '/dashboard/pharmacy': 'pharmacy',
    '/dashboard/inventory/pharmacy': 'pharmacy',
    '/dashboard/optical-shop': 'optical',
    '/dashboard/inventory/optical': 'optical',
    '/dashboard/billing': 'billing',
    '/dashboard/admin/users': 'users',
    '/dashboard/admin/branches': 'branches',
    '/dashboard/admin/logs': 'logs',
    '/dashboard/activity-log': 'logs',
    '/dashboard/audit-log': 'logs',
    '/dashboard/admin/permissions': 'users',
}

// Routes that just require any dashboard access or are non-module specific
const OPEN_DASHBOARD_ROUTES = [
    '/dashboard/profile',
    '/dashboard/branch-switch',
    '/dashboard/admin',
    '/dashboard/doctor',
    '/dashboard/receptionist',
    '/dashboard/pharmacist',
    '/dashboard/optician'
]

export type AllowedRoute = { prefix: string; roles: string[] }

/**
 * Static Role-based Route Access (Fallback)
 */
export const ROUTE_ACCESS: AllowedRoute[] = [
    { prefix: '/dashboard/admin', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/doctor', roles: ['DOCTOR'] },
    { prefix: '/dashboard/receptionist', roles: ['RECEPTIONIST'] },
    { prefix: '/dashboard/pharmacist', roles: ['PHARMACIST'] },
    { prefix: '/dashboard/optician', roles: ['OPTICIAN'] },
]

export interface Permission {
    module: string
    canRead: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
}

/**
 * Core Permission Logic
 * Checks if a set of permissions allows a specific action on a module.
 */
export function can(permissions: Permission[] | null, module: string, action: keyof Omit<Permission, 'module'> = 'canRead'): boolean {
    if (!permissions || !Array.isArray(permissions)) return false
    const perm = permissions.find(p => p.module === module)
    return perm ? !!perm[action] : false
}

/**
 * Route Guard Logic
 * Determines if a user can access a specific URL based on their role and dynamic permissions.
 */
export function isPathAllowedForRole(pathname: string, user: any, dynamicPermissions: Permission[] | null = null): boolean {
    // Non-dashboard routes are always allowed
    if (!pathname.startsWith('/dashboard')) return true

    // Core dashboard landing page is allowed for any authenticated user
    if (pathname === '/dashboard') return true

    const role = resolveRoleName(user).toUpperCase()
    if (!role) return false

    // SUPERADMIN bypasses all checks
    if (role === 'SUPERADMIN') return true

    // 1. Check Open Routes
    if (OPEN_DASHBOARD_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
        return true
    }

    // 2. Check Dynamic Module Permissions (Preferred)
    const moduleKey = Object.entries(MODULE_ACCESS_MAP)
        .sort((a, b) => b[0].length - a[0].length) // Match longest path first
        .find(([path]) => pathname.startsWith(path))?.[1]

    if (moduleKey && dynamicPermissions) {
        // Special case: Eye Examinations / Prescriptions general access
        if (pathname === '/dashboard/eye-examinations' || pathname === '/dashboard/prescription' || pathname === '/dashboard/reports') {
            const subModules = Object.entries(MODULE_ACCESS_MAP)
                .filter(([path]) => path.startsWith(pathname))
                .map(([, mod]) => mod)
            return subModules.some(mod => can(dynamicPermissions, mod, 'canRead'))
        }

        if (!can(dynamicPermissions, moduleKey, 'canRead')) {
            return false
        }
    }

    // 3. Specialized Role Restrictions (ABAC)
    const specialization = user?.doctor?.specialization?.toUpperCase() || ''
    if (role === 'DOCTOR' && specialization === 'OPTOMETRY') {
        const restrictedPaths = [
            '/dashboard/surgery',
            '/dashboard/prescription/medicine',
            '/dashboard/eye-examinations/clinical',
            '/dashboard/inventory/pharmacy',
            '/dashboard/pharmacy'
        ]
        if (restrictedPaths.some(p => pathname.startsWith(p))) return false
    }

    // 4. Static Role Fallback
    const matchedStatic = ROUTE_ACCESS.find(({ prefix }) => pathname === prefix || pathname.startsWith(prefix + '/'))
    if (matchedStatic) {
        return matchedStatic.roles.includes(role)
    }

    return true // Default allow if authenticated and no restriction found
}


export function getRoleRedirectPath(role: string) {
    return getDefaultDashboardPath(role)
}
