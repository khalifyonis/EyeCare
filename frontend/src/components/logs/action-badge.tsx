import { getActionBadgeClass } from '@/lib/logging-utils';

export function ActionBadge({ action }: { action: string }) {
    return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getActionBadgeClass(action)}`}>
            {action}
        </span>
    );
}
