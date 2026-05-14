import { getDefaultDashboardPath } from '@/lib/auth'

export type AllowedRoute = { prefix: string; roles: string[] }

export const ROUTE_ACCESS: AllowedRoute[] = [
    { prefix: '/dashboard/admin', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR'] },
    { prefix: '/dashboard/doctor', roles: ['DOCTOR'] },
    { prefix: '/dashboard/receptionist', roles: ['RECEPTIONIST'] },
    { prefix: '/dashboard/pharmacist', roles: ['PHARMACIST'] },
    { prefix: '/dashboard/optician', roles: ['OPTICIAN'] },

    { prefix: '/dashboard/patients', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/appointments', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/eye-examinations', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/surgery', roles: ['ADMIN', 'SUPERADMIN', 'DOCTOR'] },
    { prefix: '/dashboard/prescription/optical', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/prescription/medicine', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST'] },
    { prefix: '/dashboard/prescription', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/billing', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/pharmacy', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'PHARMACIST'] },
    { prefix: '/dashboard/inventory/pharmacy', roles: ['ADMIN', 'SUPERADMIN', 'PHARMACIST'] },
    { prefix: '/dashboard/inventory/optical', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'OPTICIAN'] },
    { prefix: '/dashboard/optical-shop', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR', 'OPTICIAN'] },
    { prefix: '/dashboard/reports', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/suppliers', roles: ['ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'] },
    { prefix: '/dashboard/activity-log', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/profile', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/branch-switch', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
]

export function isPathAllowedForRole(pathname: string, role: string): boolean {
    if (!pathname.startsWith('/dashboard')) return true
    if (pathname === '/dashboard') return true

    const normalizedRole = (role || '').toUpperCase()
    if (!normalizedRole) return false

    const matched = ROUTE_ACCESS.find(({ prefix }) => pathname === prefix || pathname.startsWith(prefix + '/'))
    if (!matched) return false

    return matched.roles.includes(normalizedRole)
}

export function getRoleRedirectPath(role: string) {
    return getDefaultDashboardPath(role)
}
