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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Activity Logs</CardTitle>
                        <Activity className="h-4 w-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.activity.total.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">{data.activity.last7Days} in last 7 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Audit Logs</CardTitle>
                        <Shield className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.audit.total.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">{data.audit.last7Days} in last 7 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Active Users (7d)</CardTitle>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.topActiveUsers.length}</div>
                        <p className="text-xs text-slate-500 truncate">
                            Top: {data.topActiveUsers[0]?.user?.fullName || '—'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Compliance Events (7d)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.audit.last7Days.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">Sensitive changes tracked</p>
                    </CardContent>
                </Card>
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
