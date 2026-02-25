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
import { Loader2 } from 'lucide-react';
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

    const handleSave = async () => {
        if (!formData.fullName || !formData.username || (!user && !formData.password) || !formData.roleName) {
            toast.error('Please fill required fields');
            return;
        }

        setSaving(true);
        try {
            if (user) {
                await api.put(`/users/${user.id}`, formData);
                toast.success('User updated');
            } else {
                await api.post('/users', formData);
                toast.success('User created');
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

                    {!user && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
                            <Input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
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
