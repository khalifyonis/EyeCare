'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Check, ShieldCheck, Eye, EyeOff, Lock, ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface UserFormProps {
    user: any;
    onSuccess: () => void;
    onCancel: () => void;
}

// Removed static ROLES array, fetching dynamically from database instead
const SPECIALIZATIONS = [
    { value: 'OPHTHALMOLOGY', label: 'Ophthalmology' },
    { value: 'OPTOMETRY', label: 'Optometry' },
    { value: 'PEDIATRIC_OPHTHALMOLOGY', label: 'Pediatric Ophthalmology' },
    { value: 'RETINA_SPECIALIST', label: 'Retina Specialist' },
    { value: 'GLAUCOMA_SPECIALIST', label: 'Glaucoma Specialist' },
    { value: 'CORNEA_SPECIALIST', label: 'Cornea Specialist' },
    { value: 'OCULOPLASTICS', label: 'Oculoplastics' },
];


export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
    const [saving, setSaving] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [rolesList, setRolesList] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        roleName: '',
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
        const fetchRoles = async () => {
            try {
                const res = await api.get('/roles');
                const names = res.data
                    .map((r: any) => r.name)
                    .filter((name: string) => name !== 'SUPERADMIN');
                setRolesList(names.length > 0 ? names : ['ADMIN', 'DOCTOR', 'PHARMACIST', 'OPTICIAN', 'RECEPTIONIST']);
            } catch (err) {
                setRolesList(['ADMIN', 'DOCTOR', 'PHARMACIST', 'OPTICIAN', 'RECEPTIONIST']);
            }
        };
        fetchBranches();
        fetchRoles();
    }, []);

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                username: user.username || '',
                email: user.email || '',
                password: '',
                roleName: user.roleName || '',
                specialization: user.doctor?.specialization || '',
                branchIds: user.branches ? user.branches.map((b: any) => b.id) : (user.branchId ? [user.branchId.toString()] : []),
            });
        } else {
            setFormData({ fullName: '', username: '', email: '', password: '', roleName: '', specialization: '', branchIds: [] });
        }
    }, [user]);

    const validateEmail = (email: string) => {
        return String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    };

    const handleSave = async () => {
        if (!formData.fullName.trim()) { toast.error('Full name is required'); return; }
        if (formData.fullName.trim().length < 3) { toast.error('Full name must be at least 3 characters'); return; }
        if (!formData.username.trim()) { toast.error('Username is required'); return; }
        if (formData.username.trim().includes(' ')) { toast.error('Username cannot contain spaces'); return; }
        if (!formData.email.trim()) { toast.error('Email address is required'); return; }
        if (!validateEmail(formData.email.trim())) { toast.error('Please enter a valid email address'); return; }
        if (user && formData.password && formData.password.length < 6) { toast.error('New password must be at least 6 characters'); return; }
        if (!formData.roleName) { toast.error('Please select a role'); return; }
        if (isDoctorRole && !formData.specialization.trim()) { toast.error('Doctor specialization is required'); return; }
        if (formData.branchIds.length === 0) { toast.error('Please select at least one branch'); return; }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                fullName: formData.fullName.trim(),
                username: formData.username.trim(),
                email: formData.email.trim().toLowerCase(),
                specialization: formData.specialization.trim(),
            };
            if (user) {
                await api.put(`/users/${user.id}`, payload);
                toast.success('User updated successfully');
            } else {
                await api.post('/users', payload);
                toast.success('User registered successfully');
            }
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-300">
            {/* Page Title */}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">
                {user ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                {user ? 'Update staff member account details' : 'Create a new staff member account'}
            </p>

            {/* Back Link */}
            <button
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-[#0EA5E9] transition-colors mb-5"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Users
            </button>

            {/* Neutral Header */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-t-xl px-6 py-4 flex items-center gap-3 border border-slate-200 dark:border-slate-800 border-b-0">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                    <UserPlus className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                    <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                        {user ? 'Edit Staff Member' : 'Add New Staff Member'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {user ? 'Update staff member account details' : 'Create a new staff member account'}
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-slate-900/60 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-6 space-y-5">
                    {/* Row 1: Full Name + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                            <Input
                                placeholder="Enter full name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                            <Input
                                type="email"
                                placeholder="doctor@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] text-sm"
                            />
                            <p className="text-xs text-slate-400">This will be used for login</p>
                        </div>
                    </div>

                    {/* Row 2: Username + Role */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                            <Input
                                placeholder="Choose a unique username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                            <Select value={formData.roleName} onValueChange={(v) => setFormData({ ...formData, roleName: v })}>
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-[#0EA5E9] text-sm">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    {rolesList.map(r => <SelectItem key={r} value={r} className="text-sm">{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Conditional: Doctor Specialization */}
                    {isDoctorRole && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Specialization</label>
                                <Select 
                                    value={formData.specialization} 
                                    onValueChange={(v) => setFormData({ ...formData, specialization: v })}
                                >
                                    <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-[#0EA5E9] text-sm">
                                        <SelectValue placeholder="Select Specialization..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                        {SPECIALIZATIONS.map(spec => (
                                            <SelectItem key={spec.value} value={spec.value} className="text-sm">
                                                {spec.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Password section */}
                    {!user ? (
                        <div className="flex items-center gap-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg px-4 py-3">
                            <div className="bg-[#0EA5E9] rounded-full p-1.5 shrink-0">
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Auto-Security Active</p>
                                <p className="text-xs text-blue-700/80 dark:text-blue-400">
                                    A <span className="font-semibold">secure password</span> will be generated and emailed to the user.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5 text-[#0EA5E9]" /> New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Leave blank to keep current"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] pr-10 text-sm"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Branch Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch</label>
                        <div className="grid grid-cols-2 gap-2.5">
                            {branches.map((b) => (
                                <div
                                    key={b.id}
                                    onClick={() => {
                                        const isSelected = formData.branchIds.includes(b.id);
                                        const newIds = isSelected
                                            ? formData.branchIds.filter(id => id !== b.id)
                                            : [...formData.branchIds, b.id];
                                        setFormData({ ...formData, branchIds: newIds });
                                    }}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${formData.branchIds.includes(b.id)
                                        ? 'bg-[#0EA5E9]/5 border-[#0EA5E9] text-slate-900 dark:text-slate-100'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    <Checkbox
                                        checked={formData.branchIds.includes(b.id)}
                                        onChange={() => {}} // Controlled by div onClick
                                    />
                                    <span className="font-medium">{b.branchName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="h-10 px-6 rounded-lg text-sm font-medium border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-10 px-8 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-medium rounded-lg text-sm shadow-sm transition-all active:scale-[0.98]"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (user ? 'Update User' : 'Create User')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
