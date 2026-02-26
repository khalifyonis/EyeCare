'use client'

import * as React from 'react'
import {
    Eye,
    Users,
    Calendar,
    Package,
    FileText,
    Settings,
    LayoutDashboard,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    LogOut,
    User2,
    Stethoscope,
    Glasses,
    Pill,
    ShieldCheck,
    UserCog,
    Mail,
    MessageSquare,
    ClipboardList,
    Activity,
    Receipt,
    BarChart3,
    UserPlus,
} from 'lucide-react'
import { useRouter, useParams, usePathname } from 'next/navigation'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarRail,
    SidebarSeparator,
} from '@/components/ui/sidebar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Navigation items per role with sub-items
const roleNavigation: Record<
    string,
    {
        section: string
        items: {
            title: string
            icon: React.ElementType
            url: string
            subItems?: { title: string; url: string }[]
        }[]
    }[]
> = {
    ADMIN: [
        {
            section: 'MENU',
            items: [
                {
                    title: 'Dashboard',
                    icon: LayoutDashboard,
                    url: '/dashboard/admin',
                },
                { title: 'Users', icon: UserCog, url: '/dashboard/admin/users' },
                { title: 'Doctors', icon: Stethoscope, url: '#' },
                { title: 'Branches', icon: LayoutDashboard, url: '/dashboard/admin/branches' },
            ],
        },
        {
            section: 'CLINICAL',
            items: [
                { title: 'Patients', icon: Users, url: '#' },
                { title: 'Appointments', icon: Calendar, url: '#' },
                { title: 'Examinations', icon: Eye, url: '#' },
                { title: 'Prescriptions', icon: FileText, url: '#' },
                { title: 'Medical Reports', icon: BarChart3, url: '#' },
            ],
        },
        {
            section: 'OPERATIONS',
            items: [
                { title: 'Inventory', icon: Package, url: '#' },
                { title: 'Billing', icon: Receipt, url: '#' },
                { title: 'Messages', icon: MessageSquare, url: '#' },
                { title: 'Email', icon: Mail, url: '#' },
                { title: 'Tasks', icon: ClipboardList, url: '#' },
            ],
        },
        {
            section: 'SYSTEM',
            items: [
                { title: 'Activity Logs', icon: Activity, url: '#' },
                { title: 'Settings', icon: Settings, url: '#' },
            ],
        },
    ],
    DOCTOR: [
        {
            section: 'MENU',
            items: [
                {
                    title: 'Dashboard',
                    icon: LayoutDashboard,
                    url: '/dashboard/doctor',
                },
            ],
        },
        {
            section: 'CLINICAL',
            items: [
                { title: 'Patients', icon: Users, url: '#' },
                { title: 'Appointments', icon: Calendar, url: '#' },
                { title: 'Examinations', icon: Eye, url: '#' },
                { title: 'Prescriptions', icon: FileText, url: '#' },
                { title: 'Reports', icon: BarChart3, url: '#' },
            ],
        },
    ],
    PHARMACIST: [
        {
            section: 'MENU',
            items: [
                { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard/pharmacist' },
            ],
        },
        {
            section: 'PHARMACY',
            items: [
                { title: 'Prescriptions', icon: FileText, url: '#' },
                { title: 'Medications', icon: Pill, url: '#' },
                { title: 'Inventory', icon: Package, url: '#' },
                { title: 'Orders', icon: Receipt, url: '#' },
            ],
        },
    ],
    OPTICIAN: [
        {
            section: 'MENU',
            items: [
                { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard/optician' },
            ],
        },
        {
            section: 'OPTICAL',
            items: [
                { title: 'Orders', icon: Receipt, url: '#' },
                { title: 'Eyewear', icon: Glasses, url: '#' },
                { title: 'Inventory', icon: Package, url: '#' },
                { title: 'Fittings', icon: Calendar, url: '#' },
            ],
        },
    ],
    RECEPTIONIST: [
        {
            section: 'MENU',
            items: [
                {
                    title: 'Dashboard',
                    icon: LayoutDashboard,
                    url: '/dashboard/receptionist',
                },
                { title: 'Patients', icon: UserPlus, url: '#' },
                { title: 'Appointments', icon: Calendar, url: '#' },
            ],
        },
        {
            section: 'OFFICE',
            items: [
                { title: 'Messages', icon: MessageSquare, url: '#' },
                { title: 'Billing', icon: Receipt, url: '#' },
                { title: 'Queue', icon: Activity, url: '#' },
            ],
        },
    ],
}

const roleIcons: Record<string, React.ElementType> = {
    ADMIN: ShieldCheck,
    DOCTOR: Stethoscope,
    PHARMACIST: Pill,
    OPTICIAN: Glasses,
    RECEPTIONIST: ClipboardList,
}

function CollapsibleNavItem({
    item,
    onSelect,
}: {
    item: {
        title: string
        icon: React.ElementType
        url: string
        subItems?: { title: string; url: string }[]
    }
    onSelect: () => void
}) {
    const pathname = usePathname()

    // Check if the current path matches the item URL or any of its sub-items
    const isActive = React.useMemo(() => {
        if (item.url !== '#' && pathname === item.url) return true
        if (item.subItems) {
            return item.subItems.some(sub => sub.url !== '#' && pathname === sub.url)
        }
        return false
    }, [pathname, item])

    const [open, setOpen] = React.useState(isActive)

    // Sync open state with active path changes
    React.useEffect(() => {
        if (isActive) setOpen(true)
    }, [isActive])

    if (!item.subItems) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    onClick={() => onSelect()}
                    className={`transition-all duration-300 group/item ${isActive
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'hover:bg-blue-500/10 text-sidebar-foreground/70 hover:text-blue-400'
                        }`}
                >
                    <item.icon className={`transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover/item:text-blue-400'}`} />
                    <span className={`font-semibold transition-colors duration-300 ${isActive ? 'text-blue-400' : ''}`}>{item.title}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        )
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive}
                onClick={() => {
                    setOpen(!open)
                    if (item.url && item.url !== '#') onSelect()
                }}
                className={`transition-all duration-300 group/item ${isActive
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'hover:bg-blue-500/10 text-sidebar-foreground/70 hover:text-blue-400'
                    }`}
            >
                <item.icon className={`transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover/item:text-blue-400'}`} />
                <span className={`font-semibold transition-colors duration-300 ${isActive ? 'text-blue-400' : ''}`}>{item.title}</span>
                <ChevronDown
                    className={`ml-auto size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''} ${isActive ? 'text-blue-400' : 'text-slate-300 group-hover/item:text-blue-400'}`}
                />
            </SidebarMenuButton>
            {open && (
                <SidebarMenuSub className="border-sidebar-border/50">
                    {item.subItems.map((sub) => {
                        const isSubActive = pathname === sub.url
                        return (
                            <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton
                                    href={sub.url}
                                    className={`transition-colors duration-200 ${isSubActive
                                        ? 'text-blue-400 font-medium bg-blue-500/10'
                                        : 'text-sidebar-foreground/60 hover:text-blue-400 hover:bg-blue-500/10'
                                        }`}
                                >
                                    <span>{sub.title}</span>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        )
                    })}
                </SidebarMenuSub>
            )}
        </SidebarMenuItem>
    )
}


function CollapsibleSection({
    label,
    defaultOpen = true,
    children,
    sectionItems = [],
}: {
    label: string
    defaultOpen?: boolean
    children: React.ReactNode
    sectionItems?: any[]
}) {
    const pathname = usePathname()

    // Section is active if any item in it matches the current pathname
    const isSectionActive = React.useMemo(() => {
        return sectionItems.some(item => {
            if (item.url !== '#' && pathname === item.url) return true
            if (item.subItems) {
                return item.subItems.some((sub: any) => sub.url !== '#' && pathname === sub.url)
            }
            return false
        })
    }, [pathname, sectionItems])

    const [open, setOpen] = React.useState(defaultOpen || isSectionActive)

    // Ensure section opens if it becomes active via external navigation
    React.useEffect(() => {
        if (isSectionActive) setOpen(true)
    }, [isSectionActive])

    return (
        <SidebarGroup>
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between px-6 mt-10 mb-2 group/section outline-none transition-all duration-300"
            >
                <span className="text-[11px] font-extrabold tracking-[0.2em] uppercase transition-colors duration-300 text-slate-400 group-hover/section:text-blue-400">
                    {label}
                </span>
                <ChevronRight
                    className={`h-3 w-3 transition-all duration-300 ${open ? 'rotate-180' : ''
                        } ${open || isSectionActive ? 'text-blue-500' : 'text-slate-300 group-hover/section:text-blue-400'
                        }`}
                />
            </button>
            {open && (
                <SidebarGroupContent className="transition-all duration-500 ease-in-out">
                    {children}
                </SidebarGroupContent>
            )}
        </SidebarGroup>
    )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const router = useRouter()
    const params = useParams()
    const role = (params.role as string || 'ADMIN').toUpperCase()
    const [user, setUser] = React.useState<{ fullName: string; role: string } | null>(null)
    const [activeItem, setActiveItem] = React.useState('Dashboard')

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
                setUser(JSON.parse(storedUser))
            }
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        document.cookie = 'token=; path=/; max-age=0'
        router.push('/login')
    }

    const sections = roleNavigation[role] || roleNavigation.ADMIN
    const RoleIcon = roleIcons[role] || UserCog

    return (
        <Sidebar collapsible="icon" className="border-sidebar-border" {...props}>
            <SidebarHeader className="bg-sidebar text-sidebar-foreground">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-all duration-300 py-6"
                            onClick={() => router.push(`/dashboard/${role.toLowerCase()}`)}
                        >
                            <div className="flex aspect-square size-11 items-center justify-center rounded-xl bg-white/5 p-1 transition-transform duration-300 group-hover:scale-105 shadow-lg border border-white/10">
                                <img src="/logo.svg" alt="Logo" className="size-full object-contain filter drop-shadow-[0_0_8px_rgba(14,165,233,0.6)]" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-bold text-sidebar-foreground uppercase tracking-tight">Al-Ixsaan</span>
                                <span className="truncate text-[10px] font-black uppercase text-[#0EA5E9] tracking-widest">
                                    {role} Panel
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="bg-sidebar-border/50" />

            <SidebarContent className="bg-sidebar text-sidebar-foreground">
                {sections.map((section, sIdx) => (
                    <CollapsibleSection
                        key={section.section}
                        label={section.section}
                        defaultOpen={sIdx === 0}
                        sectionItems={section.items}
                    >
                        <SidebarMenu>
                            {section.items.map((item) => (
                                <CollapsibleNavItem
                                    key={item.title}
                                    item={item}
                                    onSelect={() => {
                                        if (item.url && item.url !== '#') {
                                            router.push(item.url)
                                        }
                                    }}
                                />
                            ))}
                        </SidebarMenu>
                    </CollapsibleSection>
                ))}
            </SidebarContent>

            <SidebarSeparator className="bg-sidebar-border/50" />

            <SidebarFooter className="bg-sidebar relative z-50">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground relative z-50 w-full"
                                >
                                    {user?.profileImage ? (
                                        <div className="flex aspect-square size-8 overflow-hidden rounded-full border border-blue-500/20">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${user.profileImage}`}
                                                alt={user.fullName}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] text-white text-xs font-bold">
                                            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {user?.fullName || 'User'}
                                        </span>
                                        <span className="truncate text-xs opacity-60">{role}</span>
                                    </div>
                                    <ChevronUp className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="top"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                                    <User2 className="mr-2 size-4" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Settings className="mr-2 size-4" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Activity className="mr-2 size-4" />
                                    Activity Log
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                                    <LogOut className="mr-2 size-4" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
