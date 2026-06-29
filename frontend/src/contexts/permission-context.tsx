'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Permission, can, isPathAllowedForRole } from '@/lib/permissions'
import { readStoredUser, StoredUser } from '@/lib/auth'

interface PermissionContextType {
    permissions: Permission[] | null
    user: StoredUser | null
    can: (module: string, action?: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete') => boolean
    isAllowed: (path: string) => boolean
    refresh: () => void
    isLoading: boolean
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: React.ReactNode }) {
    const [permissions, setPermissions] = useState<Permission[] | null>(null)
    const [user, setUser] = useState<StoredUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const pathname = usePathname()

    const loadPermissions = useCallback(() => {
        if (typeof window === 'undefined') return

        const storedUser = readStoredUser()
        setUser(storedUser)

        const rawPerms = localStorage.getItem('permissions')
        if (rawPerms) {
            try {
                setPermissions(JSON.parse(rawPerms))
            } catch (e) {
                console.error('Failed to parse permissions from local storage', e)
                setPermissions(null)
            }
        }
        setIsLoading(false)
    }, [])

    useEffect(() => {
        loadPermissions()

        // Sync if localStorage changes (e.g. from another tab or login)
        const handleStorage = () => loadPermissions()
        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [loadPermissions])

    const checkPermission = useCallback((module: string, action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete' = 'canRead') => {
        return can(permissions, module, action)
    }, [permissions])

    const checkPath = useCallback((path: string) => {
        return isPathAllowedForRole(path, user, permissions)
    }, [user, permissions])

    return (
        <PermissionContext.Provider value={{
            permissions,
            user,
            can: checkPermission,
            isAllowed: checkPath,
            refresh: loadPermissions,
            isLoading
        }}>
            {children}
        </PermissionContext.Provider>
    )
}

export function usePermission() {
    const context = useContext(PermissionContext)
    if (context === undefined) {
        throw new Error('usePermission must be used within a PermissionProvider')
    }
    return context
}
