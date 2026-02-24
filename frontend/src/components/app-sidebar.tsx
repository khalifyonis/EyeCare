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
                    subItems: [
                        { title: 'Analytics', url: '#' },
                        { title: 'Overview', url: '#' },
                    ],
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
                    url: '#',
                    subItems: [
                        { title: 'Overview', url: '#' },
                        { title: 'Analytics', url: '#' },
                    ],
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
                { title: 'Dashboard', icon: LayoutDashboard, url: '#' },
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
                { title: 'Dashboard', icon: LayoutDashboard, url: '#' },
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
                    subItems: [
                        { title: 'Overview', url: '#' },
                        { title: 'Schedule', url: '#' },
                    ],
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
    isActive,
    onSelect,
}: {
    item: {
        title: string
        icon: React.ElementType
        url: string
        subItems?: { title: string; url: string }[]
    }
    isActive: boolean
    onSelect: () => void
}) {
    const [open, setOpen] = React.useState(isActive)

    if (!item.subItems) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    onClick={() => onSelect()}
                >
                    <item.icon />
                    <span>{item.title}</span>
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
                    onSelect()
                }}
            >
                <item.icon />
                <span>{item.title}</span>
                <ChevronDown
                    className={`ml-auto size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </SidebarMenuButton>
            {open && (
                <SidebarMenuSub>
                    {item.subItems.map((sub) => (
                        <SidebarMenuSubItem key={sub.title}>
                            <SidebarMenuSubButton href={sub.url}>
                                <span>{sub.title}</span>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    ))}
                </SidebarMenuSub>
            )}
        </SidebarMenuItem>
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
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                                <Eye className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-bold">EyeCare</span>
                                <span className="truncate text-xs opacity-60">
                                    {role} Panel
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator />

            <SidebarContent>
                {sections.map((section) => (
                    <SidebarGroup key={section.section}>
                        <SidebarGroupLabel>{section.section}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {section.items.map((item) => (
                                    <CollapsibleNavItem
                                        key={item.title}
                                        item={item}
                                        isActive={activeItem === item.title}
                                        onSelect={() => {
                                            setActiveItem(item.title)
                                            if (item.url && item.url !== '#') {
                                                router.push(item.url)
                                            }
                                        }}
                                    />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                                        {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
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
                                <DropdownMenuItem>
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
