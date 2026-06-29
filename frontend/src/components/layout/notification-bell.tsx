'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { useSocket } from '@/contexts/socket-context';
import {
    Bell,
    Calendar,
    CreditCard,
    Package,
    Pill,
    Activity,
    Loader2,
    CheckCheck,
    AlertTriangle,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AppNotification = {
    id: string;
    type: 'APPOINTMENT' | 'INVENTORY' | 'BILLING' | 'FOLLOWUP' | 'PRESCRIPTION' | 'ACTIVITY';
    title: string;
    message: string;
    link: string;
    createdAt: string;
    priority: 'high' | 'medium' | 'low';
};

const READ_KEY = 'eyecare-read-notifications';

const TYPE_ICONS: Record<AppNotification['type'], React.ElementType> = {
    APPOINTMENT: Calendar,
    INVENTORY: Package,
    BILLING: CreditCard,
    FOLLOWUP: AlertTriangle,
    PRESCRIPTION: Pill,
    ACTIVITY: Activity,
};

const TYPE_COLORS: Record<AppNotification['type'], string> = {
    APPOINTMENT: 'bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
    INVENTORY: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    BILLING: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    FOLLOWUP: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    PRESCRIPTION: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
    ACTIVITY: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function loadReadIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(READ_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function saveReadIds(ids: Set<string>) {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export function NotificationBell() {
    const router = useRouter();
    const { socket } = useSocket();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            setNotifications(Array.isArray(res.data?.notifications) ? res.data.notifications : []);
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setReadIds(loadReadIds());
        void fetchNotifications();
        const interval = setInterval(() => void fetchNotifications(), 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        if (!socket) return;

        const refresh = () => void fetchNotifications();
        const events = [
            'appointment:created',
            'appointment:updated',
            'appointment:deleted',
            'billing:created',
            'billing:updated',
            'inventory:updated',
            'pharmacy:updated',
            'optical:updated',
            'exam:created',
            'exam:updated',
        ];

        for (const event of events) {
            socket.on(event, refresh);
        }

        return () => {
            for (const event of events) {
                socket.off(event, refresh);
            }
        };
    }, [socket, fetchNotifications]);

    const unreadCount = useMemo(
        () => notifications.filter((n) => !readIds.has(n.id)).length,
        [notifications, readIds]
    );

    const markRead = (id: string) => {
        setReadIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            saveReadIds(next);
            return next;
        });
    };

    const markAllRead = () => {
        const next = new Set(readIds);
        for (const n of notifications) next.add(n.id);
        setReadIds(next);
        saveReadIds(next);
    };

    const handleOpen = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) void fetchNotifications();
    };

    const handleClick = (notification: AppNotification) => {
        markRead(notification.id);
        setOpen(false);
        router.push(notification.link);
    };

    return (
        <DropdownMenu open={open} onOpenChange={handleOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    title="Notifications"
                >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[360px] p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <DropdownMenuLabel className="p-0 text-sm font-bold">Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-[#0EA5E9] hover:text-[#0284C7]"
                            onClick={(e) => {
                                e.preventDefault();
                                markAllRead();
                            }}
                        >
                            <CheckCheck className="h-3.5 w-3.5 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>

                <div className="max-h-[380px] overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin text-[#0EA5E9]" />
                            <p className="text-xs">Loading alerts...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <Bell className="h-5 w-5 text-slate-400" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">All caught up</p>
                            <p className="text-xs text-slate-500">No alerts right now. New notifications appear here for appointments, stock, billing, and more.</p>
                        </div>
                    ) : (
                        notifications.map((n) => {
                            const Icon = TYPE_ICONS[n.type] || Bell;
                            const isUnread = !readIds.has(n.id);
                            return (
                                <DropdownMenuItem
                                    key={n.id}
                                    className={cn(
                                        'flex items-start gap-3 px-4 py-3 cursor-pointer rounded-none border-b border-slate-50 dark:border-slate-800/80 focus:bg-slate-50 dark:focus:bg-slate-900/60',
                                        isUnread && 'bg-sky-50/50 dark:bg-sky-950/10'
                                    )}
                                    onClick={() => handleClick(n)}
                                >
                                    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TYPE_COLORS[n.type])}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn('text-xs font-bold truncate', isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300')}>
                                                {n.title}
                                            </p>
                                            {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#0EA5E9]" />}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</p>
                                        <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
