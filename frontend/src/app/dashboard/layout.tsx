'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { Bell, Search, Moon, Sun, Maximize } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/components/theme-provider'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [searchFocused, setSearchFocused] = useState(false)
    const { theme, toggleTheme } = useTheme()

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
                <header className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar/5 backdrop-blur-md px-4 sticky top-0 z-30 transition-all duration-300">
                    {/* Left: Toggle + Search */}
                    <div className="flex flex-1 items-center gap-2">
                        <SidebarTrigger className="-ml-1 hover:bg-[#0EA5E9]/10 hover:text-[#0EA5E9] transition-colors" />
                        <Separator orientation="vertical" className="mr-1 h-4" />
                        {/* Global Search Bar */}
                        <div className={`relative hidden md:flex items-center rounded-md shadow-sm transition-all duration-300 focus-within:ring-1 focus-within:ring-blue-500/50 ${searchFocused ? 'w-72' : 'w-52'}`}>
                            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search patients, doctors..."
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border/60 bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/60 focus:bg-background focus:ring-1 focus:ring-[#0EA5E9]/30 transition-all duration-200"
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
