'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { Bell, Search, Moon, Sun, Maximize } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'
import api from '@/lib/axios'
import { toast } from 'sonner'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const [searchFocused, setSearchFocused] = useState(false)
    const { theme, toggleTheme } = useTheme()

    // ── Auth Guard & Session Sync ─────────────────────────────────────────────
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('token')
            if (!token) {
                router.push('/login')
                return
            }

            // Ensure cookie exists for middleware
            if (!document.cookie.includes('token=')) {
                document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`
            }

            try {
                // Verify user still exists in DB and get fresh data
                const response = await api.get('/auth/me')
                const userData = {
                    ...response.data,
                    role: response.data.role?.name || response.data.role
                }
                localStorage.setItem('user', JSON.stringify(userData))
            } catch (error: any) {
                console.error('Session verification failed', error)
                if (error.response?.status === 404 || error.response?.status === 401) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax'
                    router.push('/login')
                }
            }
        }

        verifySession()
    }, [router])

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

    return (
        <SidebarProvider className="h-screen overflow-hidden">
            <AppSidebar />
            <SidebarInset className="bg-background flex flex-col h-screen overflow-hidden">
                <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-sidebar-border bg-white dark:bg-slate-950 backdrop-blur-md px-4 sticky top-0 z-30 transition-all duration-300">
                    {/* Left: Toggle + Search */}
                    <div className="flex flex-1 items-center gap-4">
                        <SidebarTrigger className="-ml-1 hover:bg-[#0EA5E9]/10 hover:text-[#0EA5E9] transition-colors scale-110" />
                        <Separator orientation="vertical" className="mr-1 h-5" />
                        {/* Global Search Bar (Enlarged) */}
                        <div className={`relative hidden md:flex items-center rounded-xl shadow-sm transition-all duration-300 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#0EA5E9]/30 group ${searchFocused ? 'w-[450px]' : 'w-[400px]'}`}>
                            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 group-focus-within:text-[#0EA5E9] transition-colors pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search patients, doctors..."
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                className="w-full pl-11 pr-4 py-2.5 text-[13px] font-medium rounded-xl border-none bg-slate-50/50 text-slate-600 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all duration-200"
                            />
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 hover:bg-[#0EA5E9]/10 hover:text-[#0EA5E9] rounded-lg transition-colors hidden md:flex items-center justify-center"
                            title="Toggle fullscreen"
                        >
                            <Maximize className="h-4 w-4" />
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/80 transition-colors"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-4 w-4 text-amber-400" />
                            ) : (
                                <Moon className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                        {/* Notification Bell */}
                        <button
                            className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/80 transition-colors"
                            title="Notifications"
                        >
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                            </span>
                        </button>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-1.5 p-1.5 md:px-5 md:py-1.5 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-transparent">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
