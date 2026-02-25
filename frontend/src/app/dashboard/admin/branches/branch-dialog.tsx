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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BranchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    branch: any;
    onSuccess: () => void;
}

export function BranchDialog({ open, onOpenChange, branch, onSuccess }: BranchDialogProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        branchName: '',
        address: '',
        phone: '',
    });

    useEffect(() => {
        if (branch) {
            setFormData({
                branchName: branch.branchName || '',
                address: branch.address || '',
                phone: branch.phone || '',
            });
        } else {
            setFormData({ branchName: '', address: '', phone: '' });
        }
    }, [branch, open]);

    const handleSave = async () => {
        if (!formData.branchName || !formData.address || !formData.phone) {
            toast.error('All fields are required');
            return;
        }

        setSaving(true);
        try {
            if (branch) {
                await api.put(`/branches/${branch.id}`, formData);
                toast.success('Branch updated');
            } else {
                await api.post('/branches', formData);
                toast.success('Branch created');
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
            <DialogContent className="sm:max-w-[450px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">{branch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
                    <DialogDescription className="font-medium">
                        {branch ? 'Update this clinic branch\'s information.' : 'Register a new clinic branch location.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Branch Name</label>
                        <Input placeholder="e.g. Main Clinic" value={formData.branchName} onChange={(e) => setFormData({ ...formData, branchName: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Address</label>
                        <Textarea placeholder="Full street address..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9] min-h-[90px] resize-none" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
                        <Input placeholder="+252 61 XXXXXXX" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-slate-500">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold px-8 rounded-xl shadow-lg shadow-blue-500/20">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {branch ? 'Save Changes' : 'Create Branch'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
