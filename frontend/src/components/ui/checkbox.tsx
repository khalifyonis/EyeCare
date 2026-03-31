'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, indeterminate, checked, ...props }, ref) => {
        const innerRef = React.useRef<HTMLInputElement>(null);

        React.useImperativeHandle(ref, () => innerRef.current!);

        React.useEffect(() => {
            if (innerRef.current) {
                innerRef.current.indeterminate = !!indeterminate;
            }
        }, [indeterminate]);

        const isChecked = indeterminate || checked;

        return (
            <label
                className={cn(
                    'relative inline-flex items-center justify-center h-4 w-4 shrink-0 cursor-pointer',
                    className
                )}
            >
                <input
                    type="checkbox"
                    ref={innerRef}
                    checked={checked}
                    className="peer sr-only"
                    {...props}
                />
                <span
                    className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-[3px] border border-slate-300/90 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150',
                        isChecked && 'border-[#0EA5E9] bg-[#0EA5E9] text-white'
                    )}
                >
                    {indeterminate ? (
                        <Minus className="size-3 stroke-[3]" />
                    ) : checked ? (
                        <Check className="size-3 stroke-[3]" />
                    ) : null}
                </span>
            </label>
        );
    }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
