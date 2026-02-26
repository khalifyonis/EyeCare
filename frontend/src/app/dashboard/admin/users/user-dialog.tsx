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
        branchId: '',
    });

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches');
                setBranches(res.data);
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
                branchId: user.branchId?.toString() || '',
            });
        } else {
            setFormData({ fullName: '', username: '', email: '', password: '', roleName: '', branchId: '' });
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
        if (!formData.branchId) {
            toast.error('Please select a branch');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                fullName: formData.fullName.trim(),
                username: formData.username.trim(),
                email: formData.email.trim().toLowerCase(),
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
            <DialogContent className="sm:max-w-[500px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">{user ? 'Edit User' : 'Register New User'}</DialogTitle>
                    <DialogDescription className="font-medium">
                        {user ? 'Update account details and access roles.' : 'Create a new staff account for the platform.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                            <Input placeholder="John Doe" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username</label>
                            <Input placeholder="johndoe" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                        <Input type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                    </div>

                    {!user ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 shadow-sm shadow-emerald-500/5">
                            <div className="bg-emerald-500 rounded-full p-1 mt-0.5">
                                <ShieldCheck className="w-3 h-3 text-white" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Auto-Security Active</p>
                                <p className="text-[11px] font-medium text-emerald-700/80 leading-relaxed">
                                    The system will automatically generate a <span className="font-bold text-emerald-800">secret password</span> and deliver it to the user's Gmail address immediately.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 text-blue-500">Change Password</label>
                            <div className="relative group">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter new password to update"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="rounded-xl border-blue-100 focus-visible:ring-blue-500 bg-blue-50/30 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Role</label>
                            <Select value={formData.roleName} onValueChange={(v) => setFormData({ ...formData, roleName: v })}>
                                <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0EA5E9]">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {ROLES.map(r => <SelectItem key={r} value={r} className="font-bold text-xs">{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Branch</label>
                            <Select value={formData.branchId} onValueChange={(v) => setFormData({ ...formData, branchId: v })}>
                                <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0EA5E9]">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {branches.map(b => <SelectItem key={b.id} value={b.id.toString()} className="font-bold text-xs">{b.branchName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-slate-500">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold px-8 rounded-xl shadow-lg shadow-blue-500/20">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {user ? 'Update User' : 'Create User'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
