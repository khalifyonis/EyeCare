'use client'

export type BranchSummary = {
    id: string
    branchName?: string | null
    isPrimary?: boolean
    address?: string | null
}

export type StoredUser = {
    fullName?: string | null
    profileImage?: string | null
    role?: unknown
    roleName?: unknown
    branchId?: string | null
    branches?: BranchSummary[]
    activeBranch?: BranchSummary | null
    doctor?: { specialization?: string | null } | null
}

const ROLE_ALIASES: Record<string, string> = {
    ADMINISTRATOR: 'ADMIN',
}

export function resolveRoleName(userLike: unknown): string {
    if (!userLike || typeof userLike !== 'object') return ''

    const user = userLike as { roleName?: unknown; role?: unknown }

    if (typeof user.roleName === 'string' && user.roleName.trim()) {
        const r = user.roleName.toUpperCase()
        return ROLE_ALIASES[r] || r
    }

    if (typeof user.role === 'string' && user.role.trim()) {
        const r = user.role.toUpperCase()
        return ROLE_ALIASES[r] || r
    }

    if (user.role && typeof user.role === 'object') {
        const roleObject = user.role as { name?: unknown }
        if (typeof roleObject.name === 'string' && roleObject.name.trim()) {
            const r = roleObject.name.toUpperCase()
            return ROLE_ALIASES[r] || r
        }
    }

    return ''
}

export function getDefaultDashboardPath(role: string): string {
    const normalizedRole = (role || '').toUpperCase()

    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN' || normalizedRole === 'ADMINISTRATOR') return '/dashboard/admin'
    if (normalizedRole === 'DOCTOR') return '/dashboard/doctor'
    if (normalizedRole === 'RECEPTIONIST') return '/dashboard/receptionist'
    if (normalizedRole === 'PHARMACIST') return '/dashboard/pharmacist'
    if (normalizedRole === 'OPTICIAN') return '/dashboard/optician'

    return '/dashboard/profile'
}

export function readStoredUser(): StoredUser | null {
    if (typeof window === 'undefined') return null

    const rawUser = localStorage.getItem('user')
    if (!rawUser) return null

    try {
        return JSON.parse(rawUser) as StoredUser
    } catch {
        return null
    }
}

export function persistSession(token: string, user: StoredUser, branch?: BranchSummary | null): StoredUser {
    const nextUser: StoredUser = {
        ...user,
        activeBranch: branch ?? user.activeBranch ?? null,
        branchId: branch?.id ?? user.branchId ?? null,
    }

    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(nextUser))
        localStorage.setItem('branches', JSON.stringify(user.branches || []))

        if (branch?.id) {
            localStorage.setItem('activeBranchId', branch.id)
        } else {
            localStorage.removeItem('activeBranchId')
        }

        document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`
    }

    return nextUser
}

export function clearSession() {
    if (typeof window === 'undefined') return

    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('activeBranchId')
    localStorage.removeItem('branches')
    localStorage.removeItem('permissions')
    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax'
}
