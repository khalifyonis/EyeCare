'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Shield, Users, TrendingUp } from 'lucide-react';
import type { LogsOverview } from '@/lib/types/logs';
import { formatLogDate } from '@/lib/logging-utils';
import { ActionBadge } from '@/components/logs/action-badge';
import Link from 'next/link';

type LogsOverviewStatsProps = {
    data: LogsOverview | null;
    loading?: boolean;
};

export function LogsOverviewStats({ data, loading }: LogsOverviewStatsProps) {
    if (loading || !data) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="h-24" />
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Activity Logs — sky blue */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-5 text-white shadow-lg shadow-sky-500/25">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-sky-100">Activity Logs</p>
                            <p className="mt-1 text-3xl font-bold tracking-tight">{data.activity.total.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-sky-200">{data.activity.last7Days} in last 7 days</p>
                        </div>
                        <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
                </div>

                {/* Audit Logs — violet */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/25">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-violet-100">Audit Trail</p>
                            <p className="mt-1 text-3xl font-bold tracking-tight">{data.audit.total.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-violet-200">{data.audit.last7Days} in last 7 days</p>
                        </div>
                        <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
                </div>

                {/* Active Users — emerald */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/25">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-emerald-100">Active Users (7d)</p>
                            <p className="mt-1 text-3xl font-bold tracking-tight">{data.topActiveUsers.length}</p>
                            <p className="mt-1 text-xs text-emerald-200 truncate max-w-[140px]">
                                Top: {data.topActiveUsers[0]?.user?.fullName || '—'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
                </div>

                {/* Compliance Events — amber */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-amber-500/25">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-amber-100">Compliance Events (7d)</p>
                            <p className="mt-1 text-3xl font-bold tracking-tight">{data.audit.last7Days.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-amber-200">Sensitive changes tracked</p>
                        </div>
                        <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                        <Link href="/dashboard/activity-log" className="text-xs text-sky-600 hover:underline">View all</Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.recentActivity.length === 0 ? (
                            <p className="text-sm text-slate-500">No activity recorded yet.</p>
                        ) : data.recentActivity.map(log => (
                            <div key={log.id} className="flex items-start justify-between gap-2 text-sm">
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{log.user?.fullName || 'System'}</p>
                                    <p className="text-slate-500 truncate">{log.details || `${log.action} ${log.entityType}`}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <ActionBadge action={log.action} />
                                    <p className="text-[10px] text-slate-400 mt-1">{formatLogDate(log.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Recent Audits</CardTitle>
                        <Link href="/dashboard/audit-log" className="text-xs text-violet-600 hover:underline">View all</Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.recentAudit.length === 0 ? (
                            <p className="text-sm text-slate-500">No audit events recorded yet.</p>
                        ) : data.recentAudit.map(log => (
                            <div key={log.id} className="flex items-start justify-between gap-2 text-sm">
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{log.user?.fullName || 'System'}</p>
                                    <p className="text-slate-500 truncate">{log.summary || `${log.action} ${log.entityType}`}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <ActionBadge action={log.action} />
                                    <p className="text-[10px] text-slate-400 mt-1">{formatLogDate(log.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {data.topActiveUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Most Active Users (7 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {data.topActiveUsers.map((item, i) => (
                                <div key={item.user.id} className="flex items-center justify-between text-sm">
                                    <span className="font-medium">
                                        <span className="text-slate-400 mr-2">#{i + 1}</span>
                                        {item.user.fullName || item.user.username}
                                    </span>
                                    <span className="text-slate-500">{item.count} actions</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
