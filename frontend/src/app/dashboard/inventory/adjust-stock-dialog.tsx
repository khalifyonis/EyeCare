'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SlidersHorizontal, Loader2 } from 'lucide-react';

interface AdjustStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemId: string | null;
    itemName: string;
    inventoryType: 'pharmacy' | 'optical';
    currentStock?: number;
    purchasePrice?: number | string | null;
    onSuccess: () => void;
}

export function AdjustStockDialog(props: AdjustStockDialogProps) {
    const { open, onOpenChange, itemId, itemName, inventoryType, onSuccess } = props;
    const currentStock = props.currentStock ?? 0;
    const purchasePrice = props.purchasePrice;
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setQuantity('');
            setUnitPrice(purchasePrice != null ? String(purchasePrice) : '');
        }
    }, [open, purchasePrice]);

    const delta = parseInt(quantity, 10);
    const isValid = !Number.isNaN(delta) && delta !== 0;
    const newStock = isValid ? Math.max(0, currentStock + delta) : currentStock;
    const wouldGoNegative = isValid && currentStock + delta < 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemId) return;
        const d = parseInt(quantity, 10);
        if (Number.isNaN(d) || d === 0) {
            toast.error('Enter a non-zero quantity (+ to add, - to reduce)');
            return;
        }
        if (currentStock + d < 0) {
            toast.error('Stock cannot go below zero');
            return;
        }
        setSaving(true);
        try {
            const endpoint = inventoryType === 'pharmacy'
                ? '/inventory/pharmacy/' + itemId + '/adjust'
                : '/inventory/optical/' + itemId + '/adjust';
            await api.post(endpoint, { quantity: d, unitPrice: unitPrice ? Number(unitPrice) : undefined });
            toast.success('Stock adjusted');
            onOpenChange(false);
            onSuccess();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
            toast.error(msg || 'Failed to adjust stock');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <SlidersHorizontal className="w-5 h-5 text-amber-500" />
                        Adjust Stock
                    </DialogTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{itemName} (current: {currentStock})</p>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Adjustment (+ add, - reduce)</label>
                            <Input type="number" step={1} placeholder="e.g. -5 or +10" value={quantity} onChange={(e) => setQuantity(e.target.value)} required autoFocus className="h-10" />
                            {isValid && <p className={wouldGoNegative ? 'text-xs mt-1 text-red-600' : 'text-xs mt-1 text-emerald-600'}>New stock: {newStock}{wouldGoNegative ? ' (cannot be negative)' : ''}</p>}
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Unit price (for record)</label>
                            <Input type="number" min={0} step="0.01" placeholder="0.00" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-10" />
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-4 gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-10">Cancel</Button>
                        <Button type="submit" disabled={saving || !quantity || wouldGoNegative} className="h-10 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {saving ? 'Saving...' : 'Apply adjustment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}