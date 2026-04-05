'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface BranchFormProps {
    branch: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export function BranchForm({ branch, onSuccess, onCancel }: BranchFormProps) {
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
    }, [branch]);

    const handleSave = async () => {
        const branchName = formData.branchName.trim();
        const address = formData.address.trim();
        const phone = formData.phone.trim();

        if (!branchName || !address || !phone) {
            toast.error('All fields are required');
            return;
        }
        if (branchName.length < 3) {
            toast.error('Branch name must be at least 3 characters');
            return;
        }
        if (address.length < 5) {
            toast.error('Please enter a more complete address');
            return;
        }

        setSaving(true);
        try {
            const payload = { branchName, address, phone };
            if (branch) {
                await api.put(`/branches/${branch.id}`, payload);
                toast.success('Branch updated successfully');
            } else {
                await api.post('/branches', payload);
                toast.success('Branch created successfully');
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
                {branch ? 'Edit Branch' : 'Add New Branch'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                {branch ? 'Update branch location details' : 'Register a new clinic branch location'}
            </p>

            {/* Back Link */}
            <button
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-[#0EA5E9] transition-colors mb-5"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Branches
            </button>

            {/* Neutral Header */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-t-xl px-6 py-4 flex items-center gap-3 border border-slate-200 dark:border-slate-800 border-b-0">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                    <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                    <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-base">
                        {branch ? 'Edit Branch' : 'Add New Branch'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {branch ? 'Update branch location details' : 'Register a new clinic branch location'}
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-slate-900/60 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-6 space-y-5">
                    {/* Row 1: Branch Name + Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch Name</label>
                            <Input
                                placeholder="e.g. Main Clinic"
                                value={formData.branchName}
                                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                            <Input
                                placeholder="+252 61 XXXXXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="h-10 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] text-sm"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                        <Textarea
                            placeholder="Full street address..."
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] text-sm min-h-[80px] resize-none"
                        />
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
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (branch ? 'Save Changes' : 'Create Branch')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
