'use client';

import { formatFieldLabel, formatFieldValue } from '@/lib/logging-utils';

type ChangeComparisonProps = {
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    changedFields?: string[] | null;
};

export function ChangeComparison({ oldValues, newValues, changedFields }: ChangeComparisonProps) {
    const fields = changedFields?.length
        ? changedFields.filter(f => !f.startsWith('+') && !f.startsWith('-') && !f.startsWith('~'))
        : [...new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])];

    if (!fields.length && !changedFields?.length) {
        return <p className="text-sm text-slate-500">No field changes recorded.</p>;
    }

    if (changedFields?.some(f => f.startsWith('+') || f.startsWith('-') || f.startsWith('~'))) {
        const added = changedFields.filter(f => f.startsWith('+')).map(f => f.slice(1));
        const removed = changedFields.filter(f => f.startsWith('-')).map(f => f.slice(1));
        const modified = changedFields.filter(f => f.startsWith('~')).map(f => f.slice(1));

        return (
            <div className="space-y-4">
                {added.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-2">Added</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {added.map(m => (
                                <span key={m} className="rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">{m}</span>
                            ))}
                        </div>
                    </div>
                )}
                {removed.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">Removed</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {removed.map(m => (
                                <span key={m} className="rounded-md bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 text-xs font-medium">{m}</span>
                            ))}
                        </div>
                    </div>
                )}
                {modified.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">Modified</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {modified.map(m => (
                                <span key={m} className="rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">{m}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {fields.map(field => {
                const oldVal = oldValues?.[field];
                const newVal = newValues?.[field];
                const changed = formatFieldValue(oldVal) !== formatFieldValue(newVal);
                if (!changed && changedFields?.length) return null;

                return (
                    <div key={field} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {formatFieldLabel(field)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700">
                            <div className="p-3">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Before</span>
                                <pre className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-sans">{formatFieldValue(oldVal)}</pre>
                            </div>
                            <div className="p-3">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">After</span>
                                <pre className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-sans">{formatFieldValue(newVal)}</pre>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
