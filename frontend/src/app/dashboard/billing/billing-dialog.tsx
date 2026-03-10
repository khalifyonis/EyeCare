'use client';

import { useEffect, useState, useCallback } from 'react';
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

type ServiceType = 'APPOINTMENT' | 'PHARMACY' | 'OPTICAL' | 'SURGERY';

type FormData = {
    patientId: string;
    serviceType: ServiceType;
    appointmentId: string;
    surgeryId: string;
    prescriptionId: string;
    totalAmount: string;
    discount: string;
};

type PatientOption = { id: string; fullName?: string | null; phone?: string | null };

export function BillingDialog({
    open,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState<FormData>({
        patientId: '',
        serviceType: 'APPOINTMENT',
        appointmentId: '',
        surgeryId: '',
        prescriptionId: '',
        totalAmount: '',
        discount: '0',
    });
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadPatients = useCallback(async () => {
        setLoadingPatients(true);
        try {
            const res = await api.get('/patients?limit=500');
            const body = res.data as { data?: PatientOption[] };
            setPatients(Array.isArray(body?.data) ? body.data : []);
        } catch {
            toast.error('Failed to load patients');
        } finally {
            setLoadingPatients(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            loadPatients();
            setFormData({
                patientId: '',
                serviceType: 'APPOINTMENT',
                appointmentId: '',
                surgeryId: '',
                prescriptionId: '',
                totalAmount: '',
                discount: '0',
            });
        }
    }, [open, loadPatients]);

    const finalAmount = (() => {
        const total = parseFloat(formData.totalAmount) || 0;
        const disc = parseFloat(formData.discount) || 0;
        return Math.max(0, total - disc);
    })();

    const handleSave = async () => {
        if (!formData.patientId) {
            toast.error('Select a patient');
            return;
        }
        const total = parseFloat(formData.totalAmount);
        if (isNaN(total) || total < 0) {
            toast.error('Enter a valid total amount');
            return;
        }
        setSaving(true);
        try {
            await api.post('/billing', {
                patientId: formData.patientId,
                serviceType: formData.serviceType,
                appointmentId: formData.appointmentId || undefined,
                surgeryId: formData.surgeryId || undefined,
                prescriptionId: formData.prescriptionId || undefined,
                totalAmount: total,
                discount: parseFloat(formData.discount) || 0,
                status: 'UNPAID',
            });
            toast.success('Invoice created');
            onOpenChange(false);
            onSuccess();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(typeof msg === 'string' ? msg : 'Failed to create invoice');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>New Invoice</DialogTitle>
                    <DialogDescription>Create a billing record for a patient.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Patient</label>
                        <Select
                            value={formData.patientId}
                            onValueChange={(v) => setFormData((p) => ({ ...p, patientId: v }))}
                            disabled={loadingPatients}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select patient" />
                            </SelectTrigger>
                            <SelectContent>
                                {patients.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.fullName || 'Unknown'} {p.phone ? `(${p.phone})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Service type</label>
                        <Select
                            value={formData.serviceType}
                            onValueChange={(v) =>
                                setFormData((p) => ({ ...p, serviceType: v as ServiceType }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                                <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                                <SelectItem value="OPTICAL">Optical</SelectItem>
                                <SelectItem value="SURGERY">Surgery</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Total amount ($)</label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={formData.totalAmount}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, totalAmount: e.target.value }))
                                }
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Discount ($)</label>
                            <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={formData.discount}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, discount: e.target.value }))
                                }
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Final amount: <strong>${finalAmount.toFixed(2)}</strong>
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Creating…' : 'Create invoice'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
