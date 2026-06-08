'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ActionBadge } from '@/components/logs/action-badge';
import { ChangeComparison } from '@/components/logs/change-comparison';
import { formatLogDate, formatModuleLabel } from '@/lib/logging-utils';
import type { AuditLogRow } from '@/lib/types/logs';
import { Shield, Monitor, Globe, Building2 } from 'lucide-react';

type AuditDetailSheetProps = {
    log: AuditLogRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function AuditDetailSheet({ log, open, onOpenChange }: AuditDetailSheetProps) {
    if (!log) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-violet-500" />
                        Audit Trail Detail
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <ActionBadge action={log.action} />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{log.entityType}</span>
                        {log.entityId && <span className="text-xs text-slate-500">#{log.entityId.slice(0, 8)}</span>}
                    </div>

                    {log.summary && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">{log.summary}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-xs text-slate-500">User</span>
                            <p className="font-medium">{log.user?.fullName || log.user?.username || '—'}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500">Date & Time</span>
                            <p className="font-medium">{formatLogDate(log.createdAt)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500">Module</span>
                            <p className="font-medium">{formatModuleLabel(log.module)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500">Role</span>
                            <p className="font-medium">{log.user?.role || '—'}</p>
                        </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-500">
                        {log.ipAddress && (
                            <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5" />
                                <span>IP: {log.ipAddress}</span>
                            </div>
                        )}
                        {log.userAgent && (
                            <div className="flex items-start gap-2">
                                <Monitor className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span className="break-all">{log.userAgent}</span>
                            </div>
                        )}
                        {log.branch?.branchName && (
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5" />
                                <span>{log.branch.branchName}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Change Comparison</h3>
                        <ChangeComparison
                            oldValues={log.oldValues}
                            newValues={log.newValues}
                            changedFields={log.changedFields}
                        />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
