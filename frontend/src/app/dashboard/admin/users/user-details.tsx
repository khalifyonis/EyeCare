'use client';

import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    UserCheck,
    Mail,
    UserCircle2,
    Shield,
    Building2,
    Phone,
    MapPin,
    Calendar,
    CalendarClock,
    Trash2,
} from 'lucide-react';
import type { User } from './columns';

interface UserDetailsProps {
    user: User;
    onBack: () => void;
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
}

export function UserDetails({ user, onBack, onEdit, onDelete }: UserDetailsProps) {
    const branches = user.branches || [];
    const createdAt = (user as any)?.createdAt;
    const updatedAt = (user as any)?.updatedAt;
    const phone = (user as any)?.phone;
    const gender = (user as any)?.gender;
    const address = (user as any)?.address;
    const dateOfBirth = (user as any)?.dateOfBirth;

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
        <div className="w-full max-w-6xl animate-in fade-in duration-300 space-y-4">
            <div>
                <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-50">Staff Details</h1>
                <p className="text-base text-slate-600 dark:text-slate-300">View staff member information</p>
            </div>

            <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-base text-slate-600 dark:text-slate-400 hover:text-[#0EA5E9] transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Staff
            </button>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
                <div className="bg-white dark:bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <UserCheck className="h-7 w-7 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                            <h2 className="text-slate-900 dark:text-slate-100 text-3xl font-semibold leading-tight">{user.fullName}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-base">{(user.roleName || 'Staff').toLowerCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => onEdit(user)}
                            className="h-11 rounded-md bg-[#0EA5E9] hover:bg-[#0c96d4] text-white"
                        >
                            Edit
                        </Button>
                        <Button
                            onClick={() => onDelete(user.id)}
                            className="h-11 rounded-md bg-red-500 hover:bg-red-600 text-white"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <section className="space-y-3">
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Mail className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Email</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{user.email || '—'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Phone className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Phone</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{phone || '—'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
                            <div>
                                <p className="text-xs text-slate-500">Address</p>
                                <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{address || '—'}</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5">
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Date of Birth</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{dateOfBirth || '—'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <UserCircle2 className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Gender</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{gender || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5">
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Account Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Shield className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Role</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{user.roleName || '—'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Building2 className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Assigned Branches</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                                        {branches.length > 0 ? branches.map((b) => b.branchName).join(', ') : (user.branchName || 'No branches')}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <CalendarClock className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Created At</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{formatDateTime(createdAt)}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <CalendarClock className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Last Updated</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{formatDateTime(updatedAt)}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
