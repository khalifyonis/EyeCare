const ACTION_COLORS: Record<string, string> = {
    LOGIN: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    LOGOUT: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    VIEW: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    CREATED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    UPDATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    PERMISSION_CHANGE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    ROLE_CHANGE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    STATUS_CHANGE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    EXPORT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    PRINT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

export function getActionBadgeClass(action: string): string {
    return ACTION_COLORS[action] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
}

export function formatLogDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

export function formatModuleLabel(module: string | null | undefined): string {
    if (!module) return '—';
    return module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function formatFieldLabel(field: string): string {
    return field
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
}

export function formatFieldValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
}

export const DEFAULT_ENTITY_TYPES = ['User', 'Patient', 'Appointment', 'Billing', 'Permission', 'Role', 'PharmacyItem'];
export const DEFAULT_ACTIONS = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'PERMISSION_CHANGE'];
