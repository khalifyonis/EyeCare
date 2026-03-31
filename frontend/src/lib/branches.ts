'use client'

import type { BranchSummary, StoredUser } from '@/lib/auth'

export function getStoredBranches(): BranchSummary[] {
    if (typeof window === 'undefined') return []

    try {
        return JSON.parse(localStorage.getItem('branches') || '[]') as BranchSummary[]
    } catch {
        return []
    }
}

export function resolveActiveBranch(user: StoredUser | null): BranchSummary | null {
    if (!user) return null
    if (user.activeBranch?.id) return user.activeBranch

    const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('activeBranchId') : null
    const knownBranches = user.branches?.length ? user.branches : getStoredBranches()

    if (activeBranchId) {
        const matched = knownBranches.find((branch) => branch.id === activeBranchId)
        if (matched) return matched
    }

    if (user.branchId) {
        const matched = knownBranches.find((branch) => branch.id === user.branchId)
        if (matched) return matched
    }

    return knownBranches[0] || null
}

export function persistActiveBranch(user: StoredUser, branchId: string) {
    const branches = user.branches?.length ? user.branches : getStoredBranches()
    const selectedBranch = branches.find((branch) => branch.id === branchId) || null

    const nextUser: StoredUser = {
        ...user,
        activeBranch: selectedBranch,
        branchId: selectedBranch?.id ?? branchId,
    }

    if (typeof window !== 'undefined') {
        localStorage.setItem('activeBranchId', branchId)
        localStorage.setItem('user', JSON.stringify(nextUser))
    }

    return {
        nextUser,
        selectedBranch,
    }
}
