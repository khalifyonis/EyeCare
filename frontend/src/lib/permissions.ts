import { getDefaultDashboardPath, resolveRoleName } from '@/lib/auth'

export type AllowedRoute = { prefix: string; roles: string[] }

export const ROUTE_ACCESS: AllowedRoute[] = [
    { prefix: '/dashboard/admin', roles: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATOR'] },
    { prefix: '/dashboard/doctor', roles: ['DOCTOR'] },
    { prefix: '/dashboard/receptionist', roles: ['RECEPTIONIST'] },
    { prefix: '/dashboard/pharmacist', roles: ['PHARMACIST'] },
    { prefix: '/dashboard/optician', roles: ['OPTICIAN'] },

    { prefix: '/dashboard/patients', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/appointments', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    
    // Detailed Report Routes (Must be before general /dashboard/reports)
    { prefix: '/dashboard/reports/financial', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/reports/income-by-service', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/reports/doctor-performance', roles: ['ADMIN', 'SUPERADMIN', 'DOCTOR'] },
    { prefix: '/dashboard/reports/branch-report', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/reports/operational', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/reports/clinical', roles: ['ADMIN', 'SUPERADMIN', 'DOCTOR'] },
    { prefix: '/dashboard/reports/inventory', roles: ['ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'] },
    { prefix: '/dashboard/reports', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    
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
    { prefix: '/dashboard/suppliers', roles: ['ADMIN', 'SUPERADMIN', 'PHARMACIST', 'OPTICIAN'] },
    { prefix: '/dashboard/admin/logs', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/activity-log', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/audit-log', roles: ['ADMIN', 'SUPERADMIN'] },
    { prefix: '/dashboard/profile', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
    { prefix: '/dashboard/branch-switch', roles: ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'] },
]

export function isPathAllowedForRole(pathname: string, userOrRole: any): boolean {
    if (!pathname.startsWith('/dashboard')) return true
    if (pathname === '/dashboard') return true

    let role = ''
    let specialization = ''

    if (userOrRole && typeof userOrRole === 'object') {
        role = resolveRoleName(userOrRole)
        specialization = userOrRole?.doctor?.specialization || ''
    } else {
        role = String(userOrRole || '')
    }

    const normalizedRole = (role || '').toUpperCase()
    if (!normalizedRole) return false

    // SUPERADMIN bypasses all checks
    if (normalizedRole === 'SUPERADMIN') return true

    // Check dynamic DB permissions from localStorage
    if (typeof window !== 'undefined') {
        const rawPerms = localStorage.getItem('permissions')
        if (rawPerms) {
            try {
                const permissions = JSON.parse(rawPerms)
                if (Array.isArray(permissions)) {
                    let moduleKey = ''
                    if (pathname.startsWith('/dashboard/patients')) moduleKey = 'patients'
                    else if (pathname.startsWith('/dashboard/appointments')) moduleKey = 'appointments'
                    else if (pathname.startsWith('/dashboard/eye-examinations/preliminary-exam') || pathname.startsWith('/dashboard/eye-examinations/preliminary')) moduleKey = 'preliminary_exams'
                    else if (pathname.startsWith('/dashboard/eye-examinations/clinical')) moduleKey = 'clinical_exams'
                    else if (pathname.startsWith('/dashboard/eye-examinations')) {
                        const p1 = permissions.find((p: any) => p.module === 'preliminary_exams')
                        const p2 = permissions.find((p: any) => p.module === 'clinical_exams')
                        return !!(p1?.canRead || p2?.canRead)
                    }
                    else if (pathname.startsWith('/dashboard/surgery')) moduleKey = 'surgery'
                    else if (pathname.startsWith('/dashboard/prescription/medicine')) moduleKey = 'medicine_prescriptions'
                    else if (pathname.startsWith('/dashboard/prescription/optical')) moduleKey = 'optical_prescriptions'
                    else if (pathname.startsWith('/dashboard/prescription')) {
                        const p1 = permissions.find((p: any) => p.module === 'medicine_prescriptions')
                        const p2 = permissions.find((p: any) => p.module === 'optical_prescriptions')
                        return !!(p1?.canRead || p2?.canRead)
                    }
                    else if (pathname.startsWith('/dashboard/reports/financial') || pathname.startsWith('/dashboard/reports/income-by-service')) moduleKey = 'reports_financial'
                    else if (pathname.startsWith('/dashboard/reports/clinical') || pathname.startsWith('/dashboard/reports/doctor-performance')) moduleKey = 'reports_clinical'
                    else if (pathname.startsWith('/dashboard/reports/appointments')) moduleKey = 'reports_appointments'
                    else if (pathname.startsWith('/dashboard/reports/patients')) moduleKey = 'reports_patients'
                    else if (pathname.startsWith('/dashboard/reports/inventory')) moduleKey = 'reports_inventory'
                    else if (pathname.startsWith('/dashboard/reports/operational') || pathname.startsWith('/dashboard/reports/branch-report')) moduleKey = 'reports_operational'
                    else if (pathname.startsWith('/dashboard/reports')) {
                        const p1 = permissions.find((p: any) => p.module === 'reports_financial')
                        const p2 = permissions.find((p: any) => p.module === 'reports_clinical')
                        const p3 = permissions.find((p: any) => p.module === 'reports_appointments')
                        const p4 = permissions.find((p: any) => p.module === 'reports_patients')
                        const p5 = permissions.find((p: any) => p.module === 'reports_inventory')
                        const p6 = permissions.find((p: any) => p.module === 'reports_operational')
                        return !!(p1?.canRead || p2?.canRead || p3?.canRead || p4?.canRead || p5?.canRead || p6?.canRead)
                    }
                    else if (pathname.startsWith('/dashboard/pharmacy') || pathname.startsWith('/dashboard/inventory/pharmacy')) moduleKey = 'pharmacy'
                    else if (pathname.startsWith('/dashboard/optical-shop') || pathname.startsWith('/dashboard/inventory/optical')) moduleKey = 'optical'
                    else if (pathname.startsWith('/dashboard/billing')) moduleKey = 'billing'
                    else if (pathname.startsWith('/dashboard/admin/users') || pathname.startsWith('/dashboard/admin/doctors')) moduleKey = 'users'
                    else if (pathname.startsWith('/dashboard/admin/branches')) moduleKey = 'branches'
                    else if (pathname.startsWith('/dashboard/admin/logs') || pathname.startsWith('/dashboard/activity-log') || pathname.startsWith('/dashboard/audit-log')) moduleKey = 'logs'
                    else if (pathname.startsWith('/dashboard/admin/permissions')) moduleKey = 'users'

                    if (moduleKey) {
                        const perm = permissions.find((p: any) => p.module === moduleKey)
                        if (perm) {
                            return !!perm.canRead
                        }
                        return false // Confirmed module but denied
                    }
                }
            } catch (e) {
                console.error('Failed to parse dynamic permissions:', e)
            }
        }
    }

    // Fallback: Specialized Optometrist check
    const isOptometrist = normalizedRole === 'DOCTOR' && specialization.toUpperCase() === 'OPTOMETRY'
    if (isOptometrist) {
        if (pathname.startsWith('/dashboard/surgery')) return false
        if (pathname.startsWith('/dashboard/prescription/medicine')) return false
        if (pathname.startsWith('/dashboard/eye-examinations/clinical')) return false
        if (pathname.startsWith('/dashboard/inventory/pharmacy')) return false
        if (pathname.startsWith('/dashboard/pharmacy')) return false
    }

    const matched = ROUTE_ACCESS.find(({ prefix }) => pathname === prefix || pathname.startsWith(prefix + '/'))
    if (!matched) return false

    return matched.roles.includes(normalizedRole)
}

export function hasPermission(module: string, action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete'): boolean {
    if (typeof window === 'undefined') return true

    try {
        const rawUser = localStorage.getItem('user')
        if (rawUser) {
            const user = JSON.parse(rawUser)
            const role = resolveRoleName(user)
            if (role === 'SUPERADMIN') return true
        }
    } catch {}

    const rawPerms = localStorage.getItem('permissions')
    if (!rawPerms) return true // Default to true if not loaded yet to avoid flashing UI elements

    try {
        const permissions = JSON.parse(rawPerms)
        if (Array.isArray(permissions)) {
            const perm = permissions.find((p: any) => p.module === module)
            if (perm) {
                return !!perm[action]
            }
        }
    } catch {
        return false
    }
    return false
}

export function getRoleRedirectPath(role: string) {
    return getDefaultDashboardPath(role)
}
