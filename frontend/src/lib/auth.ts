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
}

export function resolveRoleName(userLike: unknown): string {
    if (!userLike || typeof userLike !== 'object') return ''

    const user = userLike as { roleName?: unknown; role?: unknown }

    if (typeof user.roleName === 'string' && user.roleName.trim()) {
        return user.roleName.toUpperCase()
    }

    if (typeof user.role === 'string' && user.role.trim()) {
        return user.role.toUpperCase()
    }

    if (user.role && typeof user.role === 'object') {
        const roleObject = user.role as { name?: unknown }
        if (typeof roleObject.name === 'string' && roleObject.name.trim()) {
            return roleObject.name.toUpperCase()
        }
    }

    return ''
}

export function getDefaultDashboardPath(role: string): string {
    const normalizedRole = (role || '').toUpperCase()

    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN') return '/dashboard/admin'
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
    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax'
}
