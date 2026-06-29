'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { LogsOverviewStats } from '@/components/logs/logs-overview-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Shield, ArrowRight, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import type { LogsOverview } from '@/lib/types/logs';
import { usePermission } from '@/contexts/permission-context';

export default function AdminLogsPage() {
    const [overview, setOverview] = useState<LogsOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const { can } = usePermission();
    const canRead = can('logs', 'canRead');

    useEffect(() => {
        if (!canRead) return;
        const fetchOverview = async () => {
            setLoading(true);
            try {
                const res = await api.get('/audit-logs/overview');
                setOverview(res.data);
            } catch {
                toast.error('Failed to load logs overview');
            } finally {
                setLoading(false);
            }
        };
        fetchOverview();
    }, [canRead]);

    if (!canRead) {
        return (
            <div className="p-6">
                <p className="text-slate-500">You do not have permission to view system logs.</p>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <ScrollText className="h-7 w-7 text-[#0EA5E9]" />
                    Administration — Logs & Compliance
                </h1>
                <PageBreadcrumb current="Logs & Compliance" />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                    Monitor user activity, investigate sensitive changes, and maintain accountability across the Eye Care platform.
                </p>
            </div>

            <LogsOverviewStats data={overview} loading={loading} />

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="hover:border-sky-300 dark:hover:border-sky-700 transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="h-5 w-5 text-sky-500" />
                            Activity Logs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Track general user actions — logins, record views, creations, exports, and daily system usage.
                        </p>
                        <p className="text-xs text-slate-400 italic">
                            &quot;What happened?&quot;
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/activity-log">
                                Open Activity Logs <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Shield className="h-5 w-5 text-violet-500" />
                            Audit Trail
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Security-focused change history with before/after values for patients, permissions, billing, and inventory.
                        </p>
                        <p className="text-xs text-slate-400 italic">
                            &quot;What happened, who did it, and exactly what changed?&quot;
                        </p>
                        <Button asChild variant="outline">
                            <Link href="/dashboard/audit-log">
                                Open Audit Trail <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
