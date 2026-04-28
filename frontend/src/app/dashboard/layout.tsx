'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { Bell, Search, Moon, Sun, Maximize } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { clearSession, getDefaultDashboardPath, readStoredUser, resolveRoleName, type StoredUser } from '@/lib/auth'
import { isPathAllowedForRole } from '@/lib/permissions'

const ROLE_TITLES: Record<string, string> = {
    DOCTOR: 'Ophthalmologist',
    RECEPTIONIST: 'Receptionist',
    PHARMACIST: 'Pharmacist',
    OPTICIAN: 'Optician',
    ADMIN: 'Administrator',
    SUPERADMIN: 'Super Admin',
}

function getHttpStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') return undefined
    const maybe = error as { response?: { status?: unknown } }
    const status = maybe.response?.status
    return typeof status === 'number' ? status : undefined
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [searchFocused, setSearchFocused] = useState(false)
    const [authReady, setAuthReady] = useState(false)
    const [headerUser, setHeaderUser] = useState<StoredUser | null>(null)
    const { theme, toggleTheme } = useTheme()

    // ── 1) Verify session and load user (once); then enforce role for current path ──
    useEffect(() => {
        let cancelled = false
        const setReady = () => {
            if (!cancelled) setAuthReady(true)
        }

        const resolveCurrentPath = () => ((typeof window !== 'undefined' ? window.location.pathname : '/dashboard') || '/dashboard')

        const safetyTimer = window.setTimeout(() => {
            if (cancelled) return

            const fallbackUser = readStoredUser()
            if (fallbackUser) {
                setHeaderUser(fallbackUser)
                const fallbackRole = resolveRoleName(fallbackUser)
                const currentPath = resolveCurrentPath()

                if (fallbackRole && !isPathAllowedForRole(currentPath, fallbackRole)) {
                    router.replace(getDefaultDashboardPath(fallbackRole))
                }

                toast.error('Session check timed out. Loaded using local session.')
                setReady()
                return
            }

            clearSession()
            router.replace('/login')
            setReady()
        }, 8000)

        const token = localStorage.getItem('token')
        if (!token) {
            window.clearTimeout(safetyTimer)
            clearSession()
            router.replace('/login')
            setReady()
            return
        }
        if (!document.cookie.includes('token=')) {
            document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`
        }

        const verifyAndGuard = async () => {
            try {
                const response = await api.get('/auth/me', { timeout: 7000 })
                const userData = {
                    ...response.data,
                    role: response.data.role?.name || response.data.role
                }
                localStorage.setItem('user', JSON.stringify(userData))
                setHeaderUser(userData as StoredUser)
                const role = resolveRoleName(userData)
                const currentPath = (typeof window !== 'undefined' ? window.location.pathname : '/dashboard') || '/dashboard'

                if (!isPathAllowedForRole(currentPath, role)) {
                    toast.error('You do not have permission to view this page.')
                    router.replace(getDefaultDashboardPath(role))
                    setReady()
                    return
                }
                setReady()
            } catch (error: unknown) {
                const status = getHttpStatus(error)
                if (status === 404 || status === 401) {
                    clearSession()
                    router.replace('/login')
                    setReady()
                } else {
                    const fallbackUser = readStoredUser()
                    if (!fallbackUser) {
                        clearSession()
                        router.replace('/login')
                        setReady()
                        return
                    }

                    setHeaderUser(fallbackUser)
                    const fallbackRole = resolveRoleName(fallbackUser)
                    const currentPath = (typeof window !== 'undefined' ? window.location.pathname : '/dashboard') || '/dashboard'

                    if (!isPathAllowedForRole(currentPath, fallbackRole)) {
                        router.replace(getDefaultDashboardPath(fallbackRole))
                    }

                    toast.error('Session check failed. Recovered using stored session.')
                    setReady()
                }
            } finally {
                window.clearTimeout(safetyTimer)
            }
        }

        verifyAndGuard()

        return () => {
            cancelled = true
            window.clearTimeout(safetyTimer)
        }
    }, [router])

    // ── 2) On pathname change: re-check role access (user already in localStorage) ──
    useEffect(() => {
        if (!authReady) return
        const currentPath = pathname || '/dashboard'
        let user: unknown = null
        try {
            const raw = localStorage.getItem('user')
            if (raw) user = JSON.parse(raw)
        } catch {
            return
        }
        const role = resolveRoleName(user)
        if (!role || !currentPath.startsWith('/dashboard')) return
        if (!isPathAllowedForRole(currentPath, role)) {
            toast.error('You do not have permission to view this page.')
            router.replace(getDefaultDashboardPath(role))
        }
    }, [pathname, authReady, router])

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen mode: ${err.message}`)
            })
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
            }
        }
    }

    if (!authReady) {
        return (
            <div className="flex h-dvh w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0EA5E9] border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground">Checking access...</p>
                </div>
            </div>
        )
    }

    return (
        <SidebarProvider className="h-dvh sm:h-screen overflow-hidden flex w-full min-w-0">
            <AppSidebar />
            <SidebarInset className="bg-background flex flex-col h-dvh sm:h-screen overflow-hidden min-w-0 flex-1 relative z-10">
                <header className="flex h-[56px] sm:h-[60px] shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-background/95 px-3 sm:px-4 sticky top-0 z-30 transition-all duration-300 min-w-0">
                    <div className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
                        <SidebarTrigger className="shrink-0 -ml-1 hover:bg-[#0EA5E9]/10 hover:text-[#0EA5E9] transition-colors" />
                        <Separator orientation="vertical" className="mr-1 h-5 hidden sm:block" />
                        <div className={`relative hidden md:flex items-center flex-1 max-w-[280px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-all duration-200 focus-within:ring-1 focus-within:ring-slate-300 dark:focus-within:ring-slate-600 group ${searchFocused ? 'max-w-[320px]' : ''}`}>
                            <Search className="absolute left-3 h-4 w-4 text-slate-400 group-focus-within:text-[#0EA5E9] transition-colors pointer-events-none shrink-0" />
                            <input
                                type="text"
                                placeholder="Search patients, doctors..."
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                className="w-full min-w-0 pl-9 pr-3 py-2 text-[13px] rounded-md border-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 hover:bg-muted hover:text-[#0EA5E9] rounded-lg transition-colors hidden md:flex items-center justify-center text-muted-foreground"
                            title="Toggle fullscreen"
                        >
                            <Maximize className="h-4 w-4" />
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-4 w-4 text-amber-400" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                        </button>
                        <button
                            className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                            title="Notifications"
                        >
                            <Bell className="h-4 w-4" />
                            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            </span>
                        </button>

                        {headerUser && (
                            <>
                                <Separator orientation="vertical" className="mx-1 h-6 hidden sm:block" />
                                <div
                                    className="hidden sm:flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity pl-1"
                                    onClick={() => router.push('/dashboard/profile')}
                                >
                                    {headerUser.profileImage ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL ?? ''}${headerUser.profileImage}`}
                                            alt={headerUser.fullName || 'User'}
                                            className="h-9 w-9 rounded-full object-cover border-2 border-[#0EA5E9]/20"
                                        />
                                    ) : (
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#0EA5E9] to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {headerUser.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="text-left hidden lg:block">
                                        <p className="text-[13px] font-semibold text-foreground leading-tight truncate max-w-[120px]">
                                            {resolveRoleName(headerUser) === 'DOCTOR' ? 'Dr. ' : ''}{headerUser.fullName || 'User'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                            {ROLE_TITLES[resolveRoleName(headerUser) || ''] || resolveRoleName(headerUser) || 'User'}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-1.5 p-1.5 md:px-5 md:py-1.5 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 bg-muted/30 dark:bg-background/80 relative z-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
