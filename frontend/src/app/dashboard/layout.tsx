'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { Bell, Search, Moon, Sun, Maximize } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'
import api from '@/lib/axios'
import { toast } from 'sonner'

// ── Role-based route access: path prefix → allowed roles ──
const ROLE_ROUTES: Record<string, string[]> = {
    '/dashboard/admin': ['ADMIN', 'SUPERADMIN'],
    '/dashboard/doctor': ['DOCTOR'],
    '/dashboard/receptionist': ['RECEPTIONIST'],
    '/dashboard/pharmacist': ['PHARMACIST'],
    '/dashboard/optician': ['OPTICIAN'],
}

const SHARED_PREFIXES = ['/dashboard/patients', '/dashboard/appointments', '/dashboard/profile']

function isPathAllowedForRole(pathname: string, role: string): boolean {
    const roleUpper = (role || '').toUpperCase()
    if (!roleUpper) return false
    for (const prefix of SHARED_PREFIXES) {
        if (pathname === prefix || pathname.startsWith(prefix + '/')) return true
    }
    if (pathname === '/dashboard') return true
    for (const [pathPrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
        if (pathname === pathPrefix || pathname.startsWith(pathPrefix + '/')) {
            return allowedRoles.includes(roleUpper)
        }
    }
    return true
}

function getDefaultDashboardForRole(role: string): string {
    const r = (role || 'admin').toLowerCase()
    return `/dashboard/${r}`
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
    const { theme, toggleTheme } = useTheme()

    // ── 1) Verify session and load user (once); then enforce role for current path ──
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.replace('/login')
            return
        }
        if (!document.cookie.includes('token=')) {
            document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`
        }

        const verifyAndGuard = async () => {
            try {
                const response = await api.get('/auth/me')
                const userData = {
                    ...response.data,
                    role: response.data.role?.name || response.data.role
                }
                localStorage.setItem('user', JSON.stringify(userData))
                const role = userData.role
                const currentPath = pathname || '/dashboard'

                if (!isPathAllowedForRole(currentPath, role)) {
                    toast.error('You do not have permission to view this page.')
                    router.replace(getDefaultDashboardForRole(role))
                    setAuthReady(true)
                    return
                }
                setAuthReady(true)
            } catch (error: any) {
                if (error.response?.status === 404 || error.response?.status === 401) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax'
                    router.replace('/login')
                } else {
                    toast.error('Session verification failed')
                }
            }
        }

        verifyAndGuard()
    }, [router])

    // ── 2) On pathname change: re-check role access (user already in localStorage) ──
    useEffect(() => {
        if (!authReady) return
        const currentPath = pathname || '/dashboard'
        let user: { role?: string } | null = null
        try {
            const raw = localStorage.getItem('user')
            if (raw) user = JSON.parse(raw)
        } catch {
            return
        }
        const role = user?.role
        if (!role || !currentPath.startsWith('/dashboard')) return
        if (!isPathAllowedForRole(currentPath, role)) {
            toast.error('You do not have permission to view this page.')
            router.replace(getDefaultDashboardForRole(role))
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
            <SidebarInset className="bg-background flex flex-col h-dvh sm:h-screen overflow-hidden min-w-0 flex-1">
                <header className="flex h-[56px] sm:h-[60px] shrink-0 items-center gap-2 border-b border-border bg-background backdrop-blur-md px-3 sm:px-4 sticky top-0 z-30 transition-all duration-300 min-w-0">
                    <div className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
                        <SidebarTrigger className="shrink-0 -ml-1 hover:bg-[#0EA5E9]/10 hover:text-[#0EA5E9] transition-colors" />
                        <Separator orientation="vertical" className="mr-1 h-5 hidden sm:block" />
                        <div className={`relative hidden md:flex items-center flex-1 max-w-md rounded-xl transition-all duration-300 ring-1 ring-border bg-muted/50 focus-within:ring-2 focus-within:ring-[#0EA5E9]/30 focus-within:bg-background group ${searchFocused ? 'max-w-[450px]' : ''}`}>
                            <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-[#0EA5E9] transition-colors pointer-events-none shrink-0" />
                            <input
                                type="text"
                                placeholder="Search patients, doctors..."
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                className="w-full min-w-0 pl-11 pr-4 py-2.5 text-[13px] font-medium rounded-xl border-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200"
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
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-1.5 p-1.5 md:px-5 md:py-1.5 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 bg-muted/30 dark:bg-background/80">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
