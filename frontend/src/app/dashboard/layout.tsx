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
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-1 items-center gap-4">
                        <div className={`relative w-full max-w-sm transition-all duration-200 ${searchFocused ? 'max-w-md' : ''}`}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="h-9 w-full rounded-lg border border-border/50 bg-muted/50 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                    </div>

                    {/* Right-side actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={toggleFullscreen}
                            className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/80 transition-colors"
                            title="Toggle Fullscreen"
                        >
                            <Maximize className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/80 transition-colors"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-4 w-4 text-amber-400" />
                            ) : (
                                <Moon className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/80 transition-colors">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                            </span>
                        </button>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
