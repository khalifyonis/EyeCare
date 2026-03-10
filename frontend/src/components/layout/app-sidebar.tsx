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
    Building2,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    LogOut,
    User2,
    Stethoscope,
    Glasses,
    Pill,
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
import { clearSession, getDefaultDashboardPath, readStoredUser, resolveRoleName, type StoredUser } from '@/lib/auth'

type NavSubItem = { title: string; url: string }
type NavItem = {
    title: string
    icon: React.ElementType
    url: string
    subItems?: NavSubItem[]
}
type NavSection = {
    section: string
    items: NavItem[]
}

const roleNavigation: Record<string, NavSection[]> = {
    ADMIN: [
        {
            section: 'OVERVIEW',
            items: [
                {
                    title: 'Dashboard',
                    icon: LayoutDashboard,
                    url: '/dashboard/admin',
                },
                { title: 'Users', icon: UserCog, url: '/dashboard/admin/users' },
                { title: 'Doctors', icon: Stethoscope, url: '/dashboard/admin/doctors' },
                { title: 'Branches', icon: LayoutDashboard, url: '/dashboard/admin/branches' },
            ],
        },
        {
            section: 'CLINICAL',
            items: [
                { title: 'Patients', icon: Users, url: '/dashboard/patients' },
                { title: 'Appointments', icon: Calendar, url: '/dashboard/appointments' },
                { title: 'ER Examinations', icon: Eye, url: '/dashboard/examinations/er' },
                { title: 'Clinical Examinations', icon: Eye, url: '/dashboard/examinations/clinical' },
                { title: 'Surgeries', icon: Activity, url: '/dashboard/surgeries' },
                { title: 'Prescriptions', icon: FileText, url: '/dashboard/prescriptions' },
                { title: 'Medical Reports', icon: BarChart3, url: '/dashboard/reports' },
            ],
        },
        {
            section: 'OPERATIONS',
            items: [
                { title: 'Pharmacy Inventory', icon: Pill, url: '/dashboard/inventory/pharmacy' },
                { title: 'Optical Inventory', icon: Glasses, url: '/dashboard/inventory/optical' },
                { title: 'Billing', icon: Receipt, url: '/dashboard/billing' },
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
            section: 'OVERVIEW',
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
                { title: 'Patients', icon: Users, url: '/dashboard/patients' },
                { title: 'Appointments', icon: Calendar, url: '/dashboard/appointments' },
                { title: 'ER Examinations', icon: Eye, url: '/dashboard/examinations/er' },
                { title: 'Clinical Examinations', icon: Eye, url: '/dashboard/examinations/clinical' },
                { title: 'Surgeries', icon: Activity, url: '/dashboard/surgeries' },
                { title: 'Prescriptions', icon: FileText, url: '/dashboard/prescriptions' },
                { title: 'Reports', icon: BarChart3, url: '/dashboard/reports' },
            ],
        },
    ],
    PHARMACIST: [
        {
            section: 'OVERVIEW',
            items: [
                { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard/pharmacist' },
            ],
        },
        {
            section: 'PHARMACY',
            items: [
                { title: 'Prescriptions', icon: FileText, url: '/dashboard/prescriptions' },
                { title: 'Medications', icon: Pill, url: '#' },
                { title: 'Pharmacy Inventory', icon: Package, url: '/dashboard/inventory/pharmacy' },
                { title: 'Orders', icon: Receipt, url: '#' },
            ],
        },
    ],
    OPTICIAN: [
        {
            section: 'OVERVIEW',
            items: [
                { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard/optician' },
            ],
        },
        {
            section: 'OPTICAL',
            items: [
                { title: 'Orders', icon: Receipt, url: '#' },
                { title: 'Eyewear', icon: Glasses, url: '#' },
                { title: 'Optical Inventory', icon: Package, url: '/dashboard/inventory/optical' },
                { title: 'Fittings', icon: Calendar, url: '#' },
            ],
        },
    ],
    RECEPTIONIST: [
        {
            section: 'OVERVIEW',
            items: [
                {
                    title: 'Dashboard',
                    icon: LayoutDashboard,
                    url: '/dashboard/receptionist',
                },
                { title: 'Patients', icon: UserPlus, url: '/dashboard/patients' },
                { title: 'Appointments', icon: Calendar, url: '/dashboard/appointments' },
                { title: 'ER Examinations', icon: Eye, url: '/dashboard/examinations/er' },
            ],
        },
        {
            section: 'OPERATIONS',
            items: [
                { title: 'Messages', icon: MessageSquare, url: '#' },
                { title: 'Billing', icon: Receipt, url: '/dashboard/billing' },
                { title: 'Queue', icon: Activity, url: '#' },
            ],
        },
    ],
}

function CollapsibleNavItem({
    item,
    onSelect,
}: {
    item: NavItem
    onSelect: () => void
}) {
    const pathname = usePathname()

    const isActive = React.useMemo(() => {
        if (item.url !== '#' && pathname === item.url) return true
        if (item.subItems) {
            return item.subItems.some((subItem) => subItem.url !== '#' && pathname === subItem.url)
        }
        return false
    }, [pathname, item])

    const [open, setOpen] = React.useState(isActive)

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
                    className={`h-[42px] px-3.5 transition-all duration-200 group/item rounded-lg ${isActive
                        ? '!bg-[#0EA5E9] !text-white shadow-[0_4px_12px_rgba(14,165,233,0.3)]'
                        : 'hover:bg-sidebar-accent text-sidebar-foreground hover:text-[#0EA5E9] dark:text-sidebar-foreground dark:hover:bg-sidebar-accent dark:hover:text-[#0EA5E9]'
                        }`}
                >
                    <item.icon className={`h-[21px] w-[21px] shrink-0 transition-colors duration-200 ${isActive ? '!text-white' : 'text-sidebar-foreground/70 group-hover/item:text-[#0EA5E9] dark:text-sidebar-foreground/80'}`} />
                    <span className={`text-[15px] font-semibold tracking-tight transition-colors duration-200 ml-1 ${isActive ? '!text-white' : ''}`}>{item.title}</span>
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
                    ? 'bg-sidebar-accent text-[#0EA5E9]'
                    : 'hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-[#0EA5E9] dark:text-sidebar-foreground/80'
                    }`}
            >
                <item.icon className={`transition-colors duration-300 ${isActive ? 'text-[#0EA5E9]' : 'text-sidebar-foreground/70 group-hover/item:text-[#0EA5E9] dark:text-sidebar-foreground/60'}`} />
                <span className={`font-semibold transition-colors duration-300 ${isActive ? 'text-[#0EA5E9]' : ''}`}>{item.title}</span>
                <ChevronDown
                    className={`ml-auto size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''} ${isActive ? 'text-[#0EA5E9]' : 'text-sidebar-foreground/60 group-hover/item:text-[#0EA5E9]'}`}
                />
            </SidebarMenuButton>
            {open && (
                <SidebarMenuSub className="border-sidebar-border/50">
                    {item.subItems.map((subItem) => {
                        const isSubActive = pathname === subItem.url
                        return (
                            <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                    href={subItem.url}
                                    className={`transition-colors duration-200 ${isSubActive
                                        ? 'text-[#0EA5E9] font-medium bg-sidebar-accent'
                                        : 'text-sidebar-foreground/60 hover:text-[#0EA5E9] hover:bg-sidebar-accent'
                                        }`}
                                >
                                    <span>{subItem.title}</span>
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
    sectionItems?: NavItem[]
}) {
    const pathname = usePathname()

    const isSectionActive = React.useMemo(() => {
        return sectionItems.some((item) => {
            if (item.url !== '#' && pathname === item.url) return true
            if (item.subItems) {
                return item.subItems.some((subItem) => subItem.url !== '#' && pathname === subItem.url)
            }
            return false
        })
    }, [pathname, sectionItems])

    const [open, setOpen] = React.useState(defaultOpen || isSectionActive)

    React.useEffect(() => {
        if (isSectionActive) setOpen(true)
    }, [isSectionActive])

    return (
        <SidebarGroup className="p-0">
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between px-5 mt-5 mb-1.5 group/section outline-none rounded-md hover:bg-sidebar-accent/50 transition-colors"
            >
                <span className="text-[12px] font-black tracking-[0.15em] uppercase text-sidebar-foreground/70 group-hover/section:text-[#0EA5E9] transition-all dark:text-sidebar-foreground/60">
                    {label}
                </span>
                <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-90' : ''} ${open || isSectionActive ? 'text-[#0EA5E9]' : 'text-sidebar-foreground/50 group-hover/section:text-[#0EA5E9]'}`}
                />
            </button>
            {open && <SidebarGroupContent>{children}</SidebarGroupContent>}
        </SidebarGroup>
    )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const router = useRouter()
    const params = useParams<{ role?: string }>()
    const roleParam = typeof params?.role === 'string' ? params.role : ''

    const [role, setRole] = React.useState<string>(() => {
        const storedUser = readStoredUser()
        const roleFromUser = resolveRoleName(storedUser)
        return roleFromUser || roleParam.toUpperCase()
    })
    const [user, setUser] = React.useState<StoredUser | null>(null)

    React.useEffect(() => {
        const storedUser = readStoredUser()
        if (!storedUser) return

        setUser(storedUser)
        const roleFromUser = resolveRoleName(storedUser)
        if (roleFromUser) setRole(roleFromUser)
        else if (roleParam) setRole(roleParam.toUpperCase())
    }, [roleParam])

    const handleLogout = () => {
        clearSession()
        router.push('/login')
    }

    const sections = roleNavigation[role] || []

    return (
        <Sidebar collapsible="icon" className="border-sidebar-border shrink-0" {...props}>
            <SidebarHeader className="bg-sidebar border-b border-sidebar-border px-4 sm:px-5 py-4 shrink-0">
                <div
                    className="flex items-center gap-3.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
                    onClick={() => router.push(getDefaultDashboardPath(role))}
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent border border-sidebar-border overflow-hidden">
                        <img src="/logo-icon.svg" alt="Logo" className="h-7 w-7 object-contain" />
                    </div>
                    <div className="flex flex-col text-left leading-none min-w-0">
                        <span className="text-[19px] font-black text-sidebar-foreground tracking-tight uppercase truncate">Al-Ixsaan</span>
                        <span className="text-[9px] font-bold uppercase text-[#0EA5E9] tracking-[0.2em] mt-0.5">{(role || 'USER')} PANEL</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarSeparator className="bg-sidebar-border/50" />

            <SidebarContent className="bg-sidebar text-sidebar-foreground overflow-y-auto overflow-x-hidden flex-1 min-h-0">
                {sections.map((section, sectionIndex) => (
                    <CollapsibleSection
                        key={section.section}
                        label={section.section}
                        defaultOpen={sectionIndex === 0}
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

            <SidebarFooter className="bg-sidebar border-t border-sidebar-border relative z-50 shrink-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground relative z-50 w-full min-w-0"
                                >
                                    {user?.profileImage ? (
                                        <div className="flex aspect-square size-8 overflow-hidden rounded-full border border-blue-500/20">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${user.profileImage}`}
                                                alt={user?.fullName || 'User'}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0c96d4] text-white text-xs font-bold">
                                            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {user?.fullName || 'User'}
                                        </span>
                                        <span className="truncate text-xs opacity-60">
                                            {user?.activeBranch?.branchName || role}
                                        </span>
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
                                {(user?.branches?.length ?? 0) > 1 && (
                                    <DropdownMenuItem onClick={() => router.push('/dashboard/branch-switch')}>
                                        <Building2 className="mr-2 size-4" />
                                        Switch Branch
                                    </DropdownMenuItem>
                                )}
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
