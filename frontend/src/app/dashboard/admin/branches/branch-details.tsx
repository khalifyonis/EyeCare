'use client';

import { ArrowLeft, Building2, MapPin, Phone, Shield, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Branch } from './columns';

interface BranchDetailsProps {
    branch: Branch;
    onBack: () => void;
    onEdit: (branch: Branch) => void;
    onDelete: (id: string) => void;
}

export function BranchDetails({ branch, onBack, onEdit, onDelete }: BranchDetailsProps) {
    const formatDateTime = (value?: string) => {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    return (
        <div className="w-full max-w-6xl space-y-4 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-50">Branch Details</h1>
                <p className="text-base text-slate-600 dark:text-slate-300">View branch information</p>
            </div>

            <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-base text-slate-600 dark:text-slate-400 hover:text-[#0EA5E9] transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Branches
            </button>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
                <div className="bg-white dark:bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Building2 className="h-7 w-7 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                            <h2 className="text-slate-900 dark:text-slate-100 text-3xl font-semibold leading-tight">{branch.branchName}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-base">branch</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => onEdit(branch)} className="h-11 rounded-md bg-[#0EA5E9] hover:bg-[#0c96d4] text-white">Edit</Button>
                        <Button onClick={() => onDelete(branch.id)} className="h-11 rounded-md bg-red-500 hover:bg-red-600 text-white">Delete</Button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <section className="space-y-3">
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Branch Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Address</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{branch.address || '—'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Phone className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Phone</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{branch.phone || '—'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Shield className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Status</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{branch.isActive === false ? 'Inactive' : 'Active'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <CalendarClock className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Created At</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{formatDateTime(branch.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
