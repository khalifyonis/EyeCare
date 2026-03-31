'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { PackagePlus, Loader2 } from 'lucide-react';

interface ReceiveStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemId: string | null;
    itemName: string;
    inventoryType: 'pharmacy' | 'optical';
    currentStock?: number;
    purchasePrice?: number | string | null;
    onSuccess: () => void;
}

export function ReceiveStockDialog({
    open,
    onOpenChange,
    itemId,
    itemName,
    inventoryType,
    currentStock,
    purchasePrice,
    onSuccess,
}: ReceiveStockDialogProps) {
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setQuantity('');
            setUnitPrice(purchasePrice != null ? String(purchasePrice) : '');
        }
    }, [open, purchasePrice]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemId) return;
        const qty = parseInt(quantity, 10);
        if (!qty || qty <= 0) {
            toast.error('Quantity must be a positive number');
            return;
        }
        setSaving(true);
        try {
            const endpoint =
                inventoryType === 'pharmacy'
                    ? `/inventory/pharmacy/${itemId}/receive`
                    : `/inventory/optical/${itemId}/receive`;
            await api.post(endpoint, {
                quantity: qty,
                unitPrice: unitPrice ? Number(unitPrice) : undefined,
            });
            toast.success(`+${qty} units added to "${itemName}"`);
            onOpenChange(false);
            onSuccess();
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(msg || 'Failed to receive stock');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <PackagePlus className="w-5 h-5 text-[#0EA5E9]" />
                        Receive Stock
                    </DialogTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {itemName}
                        {currentStock !== undefined && (
                            <span className="ml-2 font-medium text-slate-600 dark:text-slate-300">
                                (current stock: {currentStock})
                            </span>
                        )}
                    </p>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                                Quantity to receive
                            </label>
                            <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder="e.g. 50"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                                autoFocus
                                className="h-10"
                            />
                            {quantity && Number(quantity) > 0 && currentStock !== undefined && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                    New stock will be: {currentStock + Number(quantity)}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                                Unit purchase price
                            </label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                className="h-10"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Leave blank to use the existing purchase price.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-4 gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                            className="h-10"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || !quantity}
                            className="h-10 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold"
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {saving ? 'Saving...' : 'Confirm receive'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
