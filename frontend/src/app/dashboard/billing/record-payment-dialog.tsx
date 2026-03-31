'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/axios';
import { toast } from 'sonner';
import type { BillingRow } from './columns';

type FormData = {
    paymentMethod: string;
    referenceNumber: string;
    status: string;
};

export function RecordPaymentDialog({
    open,
    onOpenChange,
    billing,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    billing: BillingRow | null;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState<FormData>({
        paymentMethod: '',
        referenceNumber: '',
        status: 'UNPAID',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (billing && open) {
            setFormData({
                paymentMethod: (billing as { paymentMethod?: string }).paymentMethod || '',
                referenceNumber: (billing as { referenceNumber?: string }).referenceNumber || '',
                status: billing.status || 'UNPAID',
            });
        }
    }, [billing, open]);

    const handleSave = async () => {
        if (!billing) return;
        setSaving(true);
        try {
            await api.put(`/billing/${billing.id}`, {
                paymentMethod: formData.paymentMethod || undefined,
                referenceNumber: formData.referenceNumber || undefined,
                status: formData.status,
            });
            toast.success('Payment updated');
            onOpenChange(false);
            onSuccess();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(typeof msg === 'string' ? msg : 'Failed to update payment');
        } finally {
            setSaving(false);
        }
    };

    if (!billing) return null;

    const finalAmount = billing.finalAmount;
    const num = typeof finalAmount === 'number' ? finalAmount : parseFloat(String(finalAmount || 0));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] bg-background">
                <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
                    <DialogTitle>Record payment</DialogTitle>
                    <DialogDescription>
                        Update payment for invoice — {billing.patient?.fullName || 'Patient'} · $
                        {num.toFixed(2)}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Status</label>
                        <Select
                            value={formData.status}
                            onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UNPAID">Unpaid</SelectItem>
                                <SelectItem value="PARTIAL">Partial</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Payment method</label>
                        <Input
                            value={formData.paymentMethod}
                            onChange={(e) =>
                                setFormData((p) => ({ ...p, paymentMethod: e.target.value }))
                            }
                            placeholder="e.g. Cash, Card"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Reference number</label>
                        <Input
                            value={formData.referenceNumber}
                            onChange={(e) =>
                                setFormData((p) => ({ ...p, referenceNumber: e.target.value }))
                            }
                            placeholder="Optional"
                        />
                    </div>
                </div>
                <DialogFooter className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
