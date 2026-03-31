'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: any;
    onSuccess: () => void;
}

const ROLES = ['ADMIN', 'DOCTOR', 'PHARMACIST', 'OPTICIAN', 'RECEPTIONIST'];

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
    const [saving, setSaving] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        roleName: '',
        licenseNumber: '',
        specialization: '',
        branchIds: [] as string[],
    });

    const isDoctorRole = formData.roleName === 'DOCTOR';

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches?limit=1000');
                const data = res.data;
                setBranches(Array.isArray(data) ? data : (data.data || []));
            } catch (err) {
                console.error('Failed to load branches');
            }
        };
        if (open) fetchBranches();
    }, [open]);

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                username: user.username || '',
                email: user.email || '',
                password: '', // Don't pre-fill password
                roleName: user.roleName || '',
                licenseNumber: user.doctor?.licenseNumber || '',
                specialization: user.doctor?.specialization || '',
                branchIds: user.branches ? user.branches.map((b: any) => b.id) : (user.branchId ? [user.branchId.toString()] : []),
            });
        } else {
            setFormData({ fullName: '', username: '', email: '', password: '', roleName: '', licenseNumber: '', specialization: '', branchIds: [] });
        }
    }, [user, open]);

    const validateEmail = (email: string) => {
        return String(email)
            .toLowerCase()
            .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    };

    const handleSave = async () => {
        // Required Fields Validation
        if (!formData.fullName.trim()) {
            toast.error('Full name is required');
            return;
        }
        if (formData.fullName.trim().length < 3) {
            toast.error('Full name must be at least 3 characters');
            return;
        }

        if (!formData.username.trim()) {
            toast.error('Username is required');
            return;
        }
        if (formData.username.trim().includes(' ')) {
            toast.error('Username cannot contain spaces');
            return;
        }

        if (!formData.email.trim()) {
            toast.error('Email address is required');
            return;
        }
        if (!validateEmail(formData.email.trim())) {
            toast.error('Please enter a valid email address (e.g., user@gmail.com)');
            return;
        }

        if (user && formData.password && formData.password.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }

        if (!formData.roleName) {
            toast.error('Please select a role');
            return;
        }
        if (isDoctorRole) {
            if (!formData.licenseNumber.trim()) {
                toast.error('Doctor license number is required');
                return;
            }
            if (!formData.specialization.trim()) {
                toast.error('Doctor specialization is required');
                return;
            }
        }
        if (formData.branchIds.length === 0) {
            toast.error('Please select at least one branch');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                fullName: formData.fullName.trim(),
                username: formData.username.trim(),
                email: formData.email.trim().toLowerCase(),
                licenseNumber: formData.licenseNumber.trim(),
                specialization: formData.specialization.trim(),
            };
            if (user) {
                await api.put(`/users/${user.id}`, payload);
                toast.success('User updated successfully');

                // If updating current user, sync localStorage
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const currentUser = JSON.parse(storedUser);
                    if (currentUser.id === user.id) {
                        const updatedUser = {
                            ...currentUser,
                            fullName: payload.fullName,
                            username: payload.username,
                            email: payload.email,
                            roleName: payload.roleName,
                            role: payload.roleName // for compatibility
                        };
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                }
            } else {
                await api.post('/users', payload);
                toast.success('User registered successfully');
            }
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px] rounded-2xl p-0 flex flex-col max-h-[85vh] bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">{user ? 'Edit User' : 'Register New User'}</DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                        {user ? 'Update account details and access roles.' : 'Create a new staff account for the platform.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable form area */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Full Name</label>
                                <Input placeholder="Enter user's full name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Username</label>
                                <Input placeholder="Enter a unique username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus-visible:ring-[#0EA5E9]" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Email Address</label>
                            <Input type="email" placeholder="Enter user's email address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus-visible:ring-[#0EA5E9]" />
                        </div>

                        {!user ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3 flex items-start gap-3">
                                <div className="bg-emerald-500 rounded-full p-1 mt-0.5 shrink-0">
                                    <ShieldCheck className="w-3 h-3 text-white" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-400">Auto-Security Active</p>
                                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-500 leading-relaxed">
                                        A <span className="font-semibold text-emerald-800 dark:text-emerald-300">secure password</span> will be generated and emailed to the user.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#0EA5E9] dark:text-[#38bdf8]">Change Password</label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter new password to update"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="rounded-lg border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 focus-visible:ring-[#0EA5E9] pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0EA5E9] dark:hover:text-[#38bdf8] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">User Role</label>
                            <Select value={formData.roleName} onValueChange={(v) => setFormData({ ...formData, roleName: v })}>
                                <SelectTrigger className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus:ring-[#0EA5E9]">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg dark:bg-slate-900 dark:border-slate-800">
                                    {ROLES.map(r => <SelectItem key={r} value={r} className="font-medium text-sm">{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {isDoctorRole && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">License Number</label>
                                    <Input
                                        placeholder="Enter doctor license number"
                                        value={formData.licenseNumber}
                                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                        className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus-visible:ring-[#0EA5E9]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Specialization</label>
                                    <Input
                                        placeholder="Enter doctor specialization"
                                        value={formData.specialization}
                                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                        className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus-visible:ring-[#0EA5E9]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#0EA5E9] dark:text-[#38bdf8]">Assign Branches</label>
                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/40 max-h-[140px] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-2">
                                    {branches.map((b) => (
                                        <label
                                            key={b.id}
                                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${formData.branchIds.includes(b.id)
                                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 ring-1 ring-blue-100 dark:ring-blue-900/50'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-900'
                                                }`}
                                        >
                                            <div className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-all ${formData.branchIds.includes(b.id)
                                                ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white'
                                                : 'bg-white border-slate-300'
                                                }`}>
                                                {formData.branchIds.includes(b.id) && <Check className="h-3 w-3 stroke-[3]" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={formData.branchIds.includes(b.id)}
                                                onChange={() => {
                                                    const newIds = formData.branchIds.includes(b.id)
                                                        ? formData.branchIds.filter(id => id !== b.id)
                                                        : [...formData.branchIds, b.id];
                                                    setFormData({ ...formData, branchIds: newIds });
                                                }}
                                            />
                                            <span className={`text-xs font-medium truncate ${formData.branchIds.includes(b.id) ? 'text-blue-900' : 'text-slate-600'}`}>
                                                {b.branchName}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky footer — always visible */}
                <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-end gap-2 bg-white dark:bg-[#0f172a] rounded-b-2xl">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-lg font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-6 rounded-lg shadow-sm">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {user ? 'Update User' : 'Create User'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
