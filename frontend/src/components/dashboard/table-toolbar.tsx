import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TableToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    placeholder?: string;
    children?: React.ReactNode;
    hasActiveFilters?: boolean;
    onClearFilters?: () => void;
}

export function TableToolbar({
    search,
    onSearchChange,
    placeholder = "Search...",
    children,
    hasActiveFilters,
    onClearFilters
}: TableToolbarProps) {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#0EA5E9] transition-colors" />
                <Input
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-xl text-sm font-medium focus-visible:ring-[#0EA5E9] shadow-sm transition-all"
                />
                {search && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                {children}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        onClick={onClearFilters}
                        className="h-11 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-rose-500 hover:bg-rose-50 px-4 rounded-xl"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
