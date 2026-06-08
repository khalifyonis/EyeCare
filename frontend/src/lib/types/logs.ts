export type LogUser = {
    id: string;
    fullName: string;
    username: string;
    role?: string;
};

export type LogBranch = {
    id: string;
    branchName: string;
};

export type ActivityLogRow = {
    id: string;
    action: string;
    module: string | null;
    entityType: string;
    entityId: string | null;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user?: LogUser;
    branch?: LogBranch | null;
};

export type AuditLogRow = {
    id: string;
    action: string;
    module: string | null;
    entityType: string;
    entityId: string | null;
    summary: string | null;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    changedFields: string[] | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user?: LogUser;
    branch?: LogBranch | null;
};

export type LogFilters = {
    entityTypes: string[];
    actions: string[];
    modules: string[];
    users: LogUser[];
};

export type LogStats = {
    total: number;
    last7Days: number;
    recent: (ActivityLogRow | AuditLogRow)[];
    topUsers: { user: LogUser; count: number }[];
    topModules: { module: string; count: number }[];
    byAction: { action: string; count: number }[];
};

export type LogsOverview = {
    activity: { total: number; last7Days: number };
    audit: { total: number; last7Days: number };
    recentActivity: ActivityLogRow[];
    recentAudit: AuditLogRow[];
    topActiveUsers: { user: LogUser; count: number }[];
};

export type PaginatedResponse<T> = {
    data?: T[];
    total?: number;
    totalPages?: number;
    page?: number;
    limit?: number;
};
