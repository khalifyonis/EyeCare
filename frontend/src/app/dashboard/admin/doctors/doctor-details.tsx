'use client';

import { ArrowLeft, UserRound, Mail, Building2, Shield, FileBadge2, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DoctorDetailsProps {
    doctor: any;
    onBack: () => void;
    onEdit: (doctor: any) => void;
    onDelete: (id: string) => void;
}

export function DoctorDetails({ doctor, onBack, onEdit, onDelete }: DoctorDetailsProps) {
    return (
        <div className="w-full max-w-6xl space-y-4 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-50">Doctor Details</h1>
                <p className="text-base text-slate-600 dark:text-slate-300">View doctor information</p>
            </div>

            <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-base text-slate-600 dark:text-slate-400 hover:text-[#0EA5E9] transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Doctors
            </button>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
                <div className="bg-white dark:bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <UserRound className="h-7 w-7 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                            <h2 className="text-slate-900 dark:text-slate-100 text-3xl font-semibold leading-tight">{doctor?.fullName || '—'}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-base">doctor</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => onEdit(doctor)} className="h-11 rounded-md bg-[#0EA5E9] hover:bg-[#0c96d4] text-white">Edit</Button>
                        <Button onClick={() => onDelete(doctor?.id)} className="h-11 rounded-md bg-red-500 hover:bg-red-600 text-white">Delete</Button>
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
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{doctor?.email || '—'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Building2 className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Branch</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{doctor?.branchName || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5">
                        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Professional Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Stethoscope className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Specialization</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{doctor?.specialization || '—'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <FileBadge2 className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">License Number</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{doctor?.licenseNumber || '—'}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
                                <Shield className="h-5 w-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Status</p>
                                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">{doctor?.isActive ? 'Active' : 'Inactive'}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
