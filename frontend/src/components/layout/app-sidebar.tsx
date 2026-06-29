'use client'

import * as React from 'react'
import {
    Eye,
    Users,
    Calendar,
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
    ClipboardList,
    Activity,
    Scissors,
    Receipt,
    BarChart3,
    UserPlus,
    Package,
    ArrowDownToLine,
    Store,
    ShieldCheck,
    Shield,
    ScrollText,
    TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
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
import { usePermission } from '@/contexts/permission-context'


type NavSubItem = { title: string; url: string; icon?: React.ElementType }
type NavItem = {
    title: string
    icon: React.ElementType
    url: string
    subItems?: NavSubItem[]
    comingSoon?: boolean
}
type NavSection = {
    section: string
    items: NavItem[]
}

const ADMIN_NAV_ITEMS: NavItem[] = [
    { title: 'Users', icon: UserCog, url: '/dashboard/admin/users' },
    { title: 'Permissions', icon: ShieldCheck, url: '/dashboard/admin/permissions' },
    { title: 'Doctors', icon: Stethoscope, url: '/dashboard/admin/doctors' },
    { title: 'Branches', icon: Building2, url: '/dashboard/admin/branches' },
    {
        title: 'Logs & Compliance',
        icon: ScrollText,
        url: '/dashboard/admin/logs',
        subItems: [
            { title: 'Overview', url: '/dashboard/admin/logs' },
            { title: 'Activity Logs', url: '/dashboard/activity-log' },
            { title: 'Audit Trail', url: '/dashboard/audit-log' },
        ],
    },
]

const ADMIN_REPORTS_ITEM: NavItem = {
    title: 'Reports',
    icon: BarChart3,
    url: '/dashboard/reports',
    subItems: [
        { title: 'Financial Summary', url: '/dashboard/reports/financial', icon: Receipt },
        { title: 'Revenue Trend', url: '/dashboard/reports/revenue-trend', icon: TrendingUp },
        { title: 'Income by Service', url: '/dashboard/reports/income-by-service', icon: ArrowDownToLine },
        { title: 'Doctor Performance', url: '/dashboard/reports/doctor-performance', icon: Stethoscope },
        { title: 'Branch Report', url: '/dashboard/reports/branch-report', icon: Building2 },
        { title: 'Clinical Analytics', url: '/dashboard/reports/clinical', icon: Activity },
        { title: 'Appointments', url: '/dashboard/reports/appointments', icon: Calendar },
        { title: 'Patients', url: '/dashboard/reports/patients', icon: Users },
        { title: 'Inventory', url: '/dashboard/reports/inventory', icon: Package },
        { title: 'Operational', url: '/dashboard/reports/operational', icon: Settings },
    ],
}

const FULL_ACCESS_ROLES = new Set(['SUPERADMIN', 'ADMIN'])

const roleNavigation: Record<string, NavSection[]> = {
    SUPERADMIN: [
        {
            section: 'OVERVIEW',
            items: [
                { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard/admin' },
            ],
        },
        {
            section: 'CLINICAL',
            items: [
                { title: 'Patients', icon: Users, url: '/dashboard/patients' },
                {
                    title: 'Appointments',
                    icon: Calendar,
                    url: '/dashboard/appointments',
                    subItems: [
                        { title: 'All Appointments', url: '/dashboard/appointments' },
                        { title: 'Calendar', url: '/dashboard/appointments/calendar' },
                    ],
                },
                {
                    title: 'Eye Examinations',
                    icon: Eye,
                    url: '/dashboard/eye-examinations/preliminary-exam',
                    subItems: [
                        { title: 'Preliminary Exam', url: '/dashboard/eye-examinations/preliminary-exam' },
                        { title: 'Clinical Exam', url: '/dashboard/eye-examinations/clinical' },
                    ],
                },
                {
                    title: 'Eye Surgery',
                    icon: Scissors,
                    url: '/dashboard/surgery',
                    subItems: [
                        { title: 'All Surgeries', url: '/dashboard/surgery' },
                    ],
                },
                {
                    title: 'Prescriptions',
                    icon: FileText,
                    url: '/dashboard/prescription',
                    subItems: [
                        { title: 'Optical Prescriptions', url: '/dashboard/prescription/optical' },
                        { title: 'Medicine Prescriptions', url: '/dashboard/prescription/medicine' },
                    ],
                },
            ],
        },
        {
            section: 'INVENTORY',
            items: [
                {
                    title: 'Pharmacy',
                    icon: Pill,
                    url: '/dashboard/pharmacy',
                    subItems: [
                        { title: 'Sales', url: '/dashboard/pharmacy' },
                        { title: 'Medicines', url: '/dashboard/pharmacy/inventory' },
                    ],
                },
                {
                    title: 'Optical Shop',
                    icon: Glasses,
                    url: '/dashboard/optical-shop',
                    subItems: [
                        { title: 'Orders', url: '/dashboard/optical-shop' },
                        { title: 'Frames', url: '/dashboard/optical-shop/frames' },
                        { title: 'Lens Inventory', url: '/dashboard/optical-shop/lenses' },
                    ],
                },
            ],
        },
        {
            section: 'OPERATIONS',
            items: [
                { title: 'Billing', icon: Receipt, url: '/dashboard/billing' },
            ],
        },
        {
            section: 'REPORTS',
            items: [ADMIN_REPORTS_ITEM],
        },
        {
            section: 'ADMINISTRATION',
            items: ADMIN_NAV_ITEMS,
        },
        {
            section: 'SYSTEM',
            items: [
                { title: 'Tasks', icon: ClipboardList, url: '#', comingSoon: true },
                { title: 'Settings', icon: Settings, url: '#', comingSoon: true },
            ],
        },
    ],
    ADMIN: [
        {
            section: 'OVERVIEW',
            items: [
                { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard/admin' },
            ],
        },
        {
            section: 'CLINICAL',
            items: [
                { title: 'Patients', icon: Users, url: '/dashboard/patients' },
                {
                    title: 'Appointments',
                    icon: Calendar,
                    url: '/dashboard/appointments',
                    subItems: [
                        { title: 'All Appointments', url: '/dashboard/appointments' },
                        { title: 'Calendar', url: '/dashboard/appointments/calendar' },
                    ],
                },
                {
                    title: 'Eye Examinations',
                    icon: Eye,
                    url: '/dashboard/eye-examinations/preliminary-exam',
                    subItems: [
                        { title: 'Preliminary Exam', url: '/dashboard/eye-examinations/preliminary-exam' },
                        { title: 'Clinical Exam', url: '/dashboard/eye-examinations/clinical' },
                    ],
                },
                {
                    title: 'Eye Surgery',
                    icon: Scissors,
                    url: '/dashboard/surgery',
                    subItems: [
                        { title: 'All Surgeries', url: '/dashboard/surgery' },
                    ],
                },
                {
                    title: 'Prescriptions',
                    icon: FileText,
                    url: '/dashboard/prescription',
                    subItems: [
                        { title: 'Optical Prescriptions', url: '/dashboard/prescription/optical' },
                        { title: 'Medicine Prescriptions', url: '/dashboard/prescription/medicine' },
                    ],
                },
            ],
        },
        {
            section: 'INVENTORY',
            items: [
                {
                    title: 'Pharmacy',
                    icon: Pill,
                    url: '/dashboard/pharmacy',
                    subItems: [
                        { title: 'Sales', url: '/dashboard/pharmacy' },
                        { title: 'Medicines', url: '/dashboard/pharmacy/inventory' },
                    ],
                },
                {
                    title: 'Optical Shop',
                    icon: Glasses,
                    url: '/dashboard/optical-shop',
                    subItems: [
                        { title: 'Orders', url: '/dashboard/optical-shop' },
                        { title: 'Frames', url: '/dashboard/optical-shop/frames' },
                        { title: 'Lens Inventory', url: '/dashboard/optical-shop/lenses' },
                    ],
                },
            ],
        },
        {
            section: 'OPERATIONS',
            items: [
                { title: 'Billing', icon: Receipt, url: '/dashboard/billing' },
            ],
        },
        {
            section: 'REPORTS',
            items: [ADMIN_REPORTS_ITEM],
        },
        {
            section: 'ADMINISTRATION',
            items: ADMIN_NAV_ITEMS,
        },
        {
            section: 'SYSTEM',
            items: [
                { title: 'Tasks', icon: ClipboardList, url: '#', comingSoon: true },
                { title: 'Settings', icon: Settings, url: '#', comingSoon: true },
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
                {
                    title: 'Appointments',
                    icon: Calendar,
                    url: '/dashboard/appointments',
                    subItems: [
                        { title: 'All Appointments', url: '/dashboard/appointments' },
                        { title: 'Calendar', url: '/dashboard/appointments/calendar' },
                    ],
                },
                {
                    title: 'Eye Examinations',
                    icon: Eye,
                    url: '/dashboard/eye-examinations/preliminary-exam',
                    subItems: [
                        { title: 'Preliminary Exam', url: '/dashboard/eye-examinations/preliminary-exam' },
                        { title: 'Clinical Exam', url: '/dashboard/eye-examinations/clinical' },
                    ],
                },
                {
                    title: 'Eye Surgery',
                    icon: Scissors,
                    url: '/dashboard/surgery',
                    subItems: [
                        { title: 'All Surgeries', url: '/dashboard/surgery' },
                    ],
                },
                {
                    title: 'Prescriptions',
                    icon: FileText,
                    url: '/dashboard/prescription',
                    subItems: [
                        { title: 'Optical Prescriptions', url: '/dashboard/prescription/optical' },
                        { title: 'Medicine Prescriptions', url: '/dashboard/prescription/medicine' },
                    ],
                },
                {
                    title: 'Reports',
                    icon: BarChart3,
                    url: '/dashboard/reports',
                    subItems: [
                        { title: 'Financial Summary', url: '/dashboard/reports/financial', icon: Receipt },
                        { title: 'Income by Service', url: '/dashboard/reports/income-by-service', icon: ArrowDownToLine },
                        { title: 'Doctor Performance', url: '/dashboard/reports/doctor-performance', icon: Stethoscope },
                        { title: 'Clinical Analytics', url: '/dashboard/reports/clinical', icon: Activity },
                        { title: 'Appointments', url: '/dashboard/reports/appointments', icon: Calendar },
                        { title: 'Patients', url: '/dashboard/reports/patients', icon: Users },
                    ],
                },
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
            section: 'INVENTORY',
            items: [
                {
                    title: 'Pharmacy',
                    icon: Pill,
                    url: '/dashboard/pharmacy',
                    subItems: [
                        { title: 'Sales', url: '/dashboard/pharmacy' },
                        { title: 'Medicines', url: '/dashboard/pharmacy/inventory' },
                    ],
                },
            ],
        },
        {
            section: 'DISPENSING',
            items: [
                {
                    title: 'Prescriptions',
                    icon: FileText,
                    url: '/dashboard/prescription',
                    subItems: [
                        { title: 'Optical Prescriptions', url: '/dashboard/prescription/optical' },
                        { title: 'Medicine Prescriptions', url: '/dashboard/prescription/medicine' },
                    ],
                },
                { title: 'Billing (Sales)', icon: Receipt, url: '/dashboard/billing' },
                { title: 'Patients', icon: Users, url: '/dashboard/patients' },
            ],
        },
        {
            section: 'REPORTS',
            items: [
                {
                    title: 'Reports',
                    icon: BarChart3,
                    url: '/dashboard/reports',
                    subItems: [
                        { title: 'Financial Summary', url: '/dashboard/reports/financial', icon: Receipt },
                        { title: 'Income by Service', url: '/dashboard/reports/income-by-service', icon: ArrowDownToLine },
                        { title: 'Doctor Performance', url: '/dashboard/reports/doctor-performance', icon: Stethoscope },
                        { title: 'Clinical Analytics', url: '/dashboard/reports/clinical', icon: Activity },
                        { title: 'Appointments', url: '/dashboard/reports/appointments', icon: Calendar },
                        { title: 'Patients', url: '/dashboard/reports/patients', icon: Users },
                    ],
                },
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
            section: 'INVENTORY',
            items: [
                {
                    title: 'Optical Shop',
                    icon: Store,
                    url: '/dashboard/optical-shop',
                    subItems: [
                        { title: 'Orders', url: '/dashboard/optical-shop' },
                        { title: 'Frames', url: '/dashboard/optical-shop/frames' },
                        { title: 'Lens Inventory', url: '/dashboard/optical-shop/lenses' },
                    ],
                },
            ],
        },
        {
            section: 'DISPENSING',
            items: [
                {
                    title: 'Prescriptions',
                    icon: FileText,
                    url: '/dashboard/prescription',
                    subItems: [
                        { title: 'Optical Prescriptions', url: '/dashboard/prescription/optical' },
                        { title: 'Medicine Prescriptions', url: '/dashboard/prescription/medicine' },
                    ],
                },
                { title: 'Billing (Sales)', icon: Receipt, url: '/dashboard/billing' },
                { title: 'Patients', icon: Users, url: '/dashboard/patients' },
            ],
        },
        {
            section: 'REPORTS',
            items: [
                {
                    title: 'Reports',
                    icon: BarChart3,
                    url: '/dashboard/reports',
                    subItems: [
                        { title: 'Financial Summary', url: '/dashboard/reports/financial', icon: Receipt },
                        { title: 'Income by Service', url: '/dashboard/reports/income-by-service', icon: ArrowDownToLine },
                        { title: 'Doctor Performance', url: '/dashboard/reports/doctor-performance', icon: Stethoscope },
                        { title: 'Clinical Analytics', url: '/dashboard/reports/clinical', icon: Activity },
                        { title: 'Appointments', url: '/dashboard/reports/appointments', icon: Calendar },
                        { title: 'Patients', url: '/dashboard/reports/patients', icon: Users },
                    ],
                },
            ],
        },
    ],
    RECEPTIONIST: [
        {
            section: 'OVERVIEW',
            items: [
                { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard/receptionist' },
            ],
        },
        {
            section: 'FRONT DESK',
            items: [
                { title: 'Patients', icon: UserPlus, url: '/dashboard/patients' },
                {
                    title: 'Appointments',
                    icon: Calendar,
                    url: '/dashboard/appointments',
                    subItems: [
                        { title: 'All Appointments', url: '/dashboard/appointments' },
                        { title: 'Calendar', url: '/dashboard/appointments/calendar' },
                    ],
                },
                {
                    title: 'Eye Examinations',
                    icon: Eye,
                    url: '/dashboard/eye-examinations/preliminary-exam',
                    subItems: [
                        { title: 'Preliminary Exam', url: '/dashboard/eye-examinations/preliminary-exam' },
                        { title: 'Clinical Exam', url: '/dashboard/eye-examinations/clinical' },
                    ],
                },
                { title: 'Billing', icon: Receipt, url: '/dashboard/billing' },
            ],
        },
        {
            section: 'REPORTS',
            items: [
                {
                    title: 'Reports',
                    icon: BarChart3,
                    url: '/dashboard/reports',
                    subItems: [
                        { title: 'Financial Summary', url: '/dashboard/reports/financial', icon: Receipt },
                        { title: 'Income by Service', url: '/dashboard/reports/income-by-service', icon: ArrowDownToLine },
                        { title: 'Doctor Performance', url: '/dashboard/reports/doctor-performance', icon: Stethoscope },
                        { title: 'Clinical Analytics', url: '/dashboard/reports/clinical', icon: Activity },
                        { title: 'Appointments', url: '/dashboard/reports/appointments', icon: Calendar },
                        { title: 'Patients', url: '/dashboard/reports/patients', icon: Users },
                    ],
                },
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
        const isComingSoon = item.comingSoon === true
        const canNavigate = item.url !== '#' && !isComingSoon
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip={isComingSoon ? `${item.title} (Coming soon)` : item.title}
                    isActive={isActive}
                    onClick={() => { if (canNavigate) onSelect() }}
                    className={`h-[42px] px-3.5 transition-all duration-200 group/item rounded-lg ${isActive
                        ? '!bg-[#0EA5E9] !text-white shadow-[0_4px_12px_rgba(14,165,233,0.3)]'
                        : 'hover:bg-sidebar-accent text-sidebar-foreground hover:text-[#0EA5E9] dark:text-sidebar-foreground dark:hover:bg-sidebar-accent dark:hover:text-[#0EA5E9]'
                        } ${isComingSoon ? 'cursor-default' : ''}`}
                >
                    <item.icon className={`h-[21px] w-[21px] shrink-0 transition-colors duration-200 ${isActive ? '!text-white' : 'text-sidebar-foreground/70 group-hover/item:text-[#0EA5E9] dark:text-sidebar-foreground/80'}`} />
                    <span className={`text-[15px] font-semibold tracking-tight transition-colors duration-200 ml-1 ${isActive ? '!text-white' : ''}`}>{item.title}</span>
                    {isComingSoon && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">Coming soon</span>
                    )}
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
                }}
                className={`h-[42px] px-3.5 transition-all duration-300 group/item rounded-lg ${isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0EA5E9] font-semibold'
                    : 'hover:bg-sidebar-accent text-sidebar-foreground hover:text-[#0EA5E9] dark:text-sidebar-foreground dark:hover:bg-sidebar-accent font-semibold'
                    }`}
            >
                <item.icon className={`transition-colors duration-300 ${isActive ? 'text-[#0EA5E9]' : 'text-sidebar-foreground/70 group-hover/item:text-[#0EA5E9] dark:text-sidebar-foreground/60'}`} />
                <span className={`text-[15px] font-semibold tracking-tight transition-colors duration-300 truncate min-w-0 ${isActive ? 'text-[#0EA5E9]' : ''}`}>{item.title}</span>
                <ChevronDown
                    className={`ml-auto size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''} ${isActive ? 'text-[#0EA5E9]' : 'text-sidebar-foreground/60 group-hover/item:text-[#0EA5E9]'}`}
                />
            </SidebarMenuButton>
            {open && (
                <SidebarMenuSub className="border-none ml-1">
                    {item.subItems.map((subItem) => {
                        const isSubActive = pathname === subItem.url
                        return (
                            <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                    <Link
                                        href={subItem.url}
                                        className={`flex items-center w-full rounded-lg px-4 py-2.5 text-[14px] leading-5 font-semibold transition-colors duration-200 whitespace-normal break-words ${isSubActive
                                            ? 'text-[#0EA5E9] bg-sidebar-accent'
                                            : 'text-sidebar-foreground hover:text-[#0EA5E9] hover:bg-sidebar-accent'
                                            }`}
                                    >
                                        {subItem.title}
                                    </Link>
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
                type="button"
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

function NavSectionGroup({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <SidebarGroup className="p-0">
            <div className="px-5 mt-5 mb-1.5">
                <span className="text-[12px] font-black tracking-[0.15em] uppercase text-sidebar-foreground/70 dark:text-sidebar-foreground/60">
                    {label}
                </span>
            </div>
            <SidebarGroupContent>{children}</SidebarGroupContent>
        </SidebarGroup>
    )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const router = useRouter()
    const params = useParams<{ role?: string }>()
    const roleParam = typeof params?.role === 'string' ? params.role : ''

    const { isAllowed, user, permissions, isLoading } = usePermission()
    const role = resolveRoleName(user).toUpperCase() || 'USER'

    const handleLogout = () => {
        clearSession()
        router.push('/login')
    }

    const rawSections = roleNavigation[role] ?? roleNavigation['ADMIN'] ?? []

    // Helper to filter items based on permissions
    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items
            .map(item => {
                if (item.subItems) {
                    const filteredSubItems = item.subItems.filter(sub => isAllowed(sub.url))
                    return { ...item, subItems: filteredSubItems }
                }
                return item
            })
            .filter(item => {
                // If it has subitems, only show if at least one subitem is allowed
                if (item.subItems) return item.subItems.length > 0
                // Otherwise check the item itself
                return isAllowed(item.url)
            })
    }

    const sections = rawSections
        .map(section => ({
            ...section,
            items: filterNavItems(section.items)
        }))
        .filter(section => section.items.length > 0)


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
                {sections.map((section, sectionIndex) => {
                    const menu = (
                        <SidebarMenu>
                            {section.items.map((item) => (
                                <CollapsibleNavItem
                                    key={`${section.section}-${item.title}`}
                                    item={item}
                                    onSelect={() => {
                                        if (item.url && item.url !== '#' && !item.comingSoon) {
                                            router.push(item.url)
                                        }
                                    }}
                                />
                            ))}
                        </SidebarMenu>
                    )

                    if (FULL_ACCESS_ROLES.has(role)) {
                        return (
                            <CollapsibleSection
                                key={section.section}
                                label={section.section}
                                defaultOpen={sectionIndex === 0}
                                sectionItems={section.items}
                            >
                                {menu}
                            </CollapsibleSection>
                        )
                    }

                    return (
                        <NavSectionGroup key={section.section} label={section.section}>
                            {menu}
                        </NavSectionGroup>
                    )
                })}
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
                                                src={`${process.env.NEXT_PUBLIC_API_URL ?? ''}${user.profileImage}`}
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
                                {isAllowed('/dashboard/admin/logs') && (
                                    <DropdownMenuItem onClick={() => router.push('/dashboard/admin/logs')}>
                                        <ScrollText className="mr-2 size-4" />
                                        Logs & Compliance
                                    </DropdownMenuItem>
                                )}
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
