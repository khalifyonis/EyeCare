'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Supplier } from './columns';

interface SupplierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: Supplier | null;
    onSuccess: () => void;
}

export function SupplierDialog({ open, onOpenChange, supplier, onSuccess }: SupplierDialogProps) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

    useEffect(() => {
        if (open) {
            setForm({
                name: supplier?.name || '',
                phone: supplier?.phone || '',
                email: supplier?.email || '',
                address: supplier?.address || '',
            });
        }
    }, [open, supplier]);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
        setSaving(true);
        try {
            let branchId: string | undefined;
            if (typeof window !== 'undefined') {
                branchId = localStorage.getItem('activeBranchId') || undefined;
                if (!branchId) {
                    try { branchId = JSON.parse(localStorage.getItem('user') || '{}')?.activeBranch?.id; } catch {}
                }
            }
            const payload = { name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, address: form.address.trim() || null, branchId };
            if (supplier) {
                await api.put('/suppliers/' + supplier.id, payload);
                toast.success('Supplier updated');
            } else {
                await api.post('/suppliers', payload);
                toast.success('Supplier created');
            }
            onOpenChange(false);
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save supplier');
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] rounded-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
                        <Building2 className="h-5 w-5 text-[#0EA5E9]" />
                        {supplier ? 'Edit Supplier' : 'Add Supplier'}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-4">
                    <div><label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Supplier name</label><Input value={form.name} onChange={set('name')} placeholder="e.g. MedSupply Co." className="h-10" autoFocus /></div>
                    <div><label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Phone</label><Input value={form.phone} onChange={set('phone')} placeholder="+252 ..." className="h-10" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Email</label><Input type="email" value={form.email} onChange={set('email')} placeholder="supplier@example.com" className="h-10" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Address</label><Input value={form.address} onChange={set('address')} placeholder="Street, City" className="h-10" /></div>
                </div>
                <DialogFooter className="p-6 pt-4 gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-10">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="h-10 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {saving ? 'Saving...' : supplier ? 'Save changes' : 'Add supplier'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
