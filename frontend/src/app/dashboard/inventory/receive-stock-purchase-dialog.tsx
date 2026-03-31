'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowDownToLine, Loader2 } from 'lucide-react';

type ItemOption = { id: string; itemName: string; category?: string | null; brand?: string | null; stockQuantity: number };

interface ReceiveStockPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inventoryType: 'pharmacy' | 'optical';
    onSuccess: () => void;
}

export function ReceiveStockPurchaseDialog({ open, onOpenChange, inventoryType, onSuccess }: ReceiveStockPurchaseDialogProps) {
    const [items, setItems] = useState<ItemOption[]>([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [saving, setSaving] = useState(false);
    const base = inventoryType === 'pharmacy' ? '/inventory/pharmacy' : '/inventory/optical';

    useEffect(() => {
        if (open) {
            setSelectedItemId('');
            setQuantity('');
            setUnitPrice('');
            api.get(base + '?limit=500').then((r) => setItems(r.data?.data ?? [])).catch(() => {});
        }
    }, [open, base]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId) { toast.error('Select an item'); return; }
        const qty = parseInt(quantity, 10);
        const price = parseFloat(unitPrice);
        if (!qty || qty < 1) { toast.error('Quantity must be at least 1'); return; }
        if (isNaN(price) || price < 0) { toast.error('Enter a valid unit price'); return; }
        setSaving(true);
        try {
            await api.post(base + '/' + selectedItemId + '/receive', { quantity: qty, unitPrice: price });
            toast.success('Stock received successfully');
            onOpenChange(false);
            onSuccess();
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
            toast.error(msg || 'Failed to receive stock');
        } finally { setSaving(false); }
    };

    const selectedItem = items.find((i) => i.id === selectedItemId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] rounded-2xl p-0 overflow-hidden bg-background border border-slate-200 dark:border-slate-800">
                <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <ArrowDownToLine className="w-5 h-5 text-[#0EA5E9]" />
                        Receive stock
                    </DialogTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select an existing item and enter quantity received. Stock will increase.</p>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Item *</label>
                            <Select value={selectedItemId || 'none'} onValueChange={(v) => setSelectedItemId(v === 'none' ? '' : v)}>
                                <SelectTrigger className="h-10"><SelectValue placeholder={inventoryType === 'pharmacy' ? 'Select pharmacy item' : 'Select optical item'} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— Select —</SelectItem>
                                    {items.map((i) => (
                                        <SelectItem key={i.id} value={i.id}>{i.itemName} {i.category ? '(' + i.category + ')' : i.brand ? '(' + i.brand + ')' : ''} — Stock: {i.stockQuantity}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedItem && <p className="text-xs text-slate-500 mt-1">Current stock: {selectedItem.stockQuantity}</p>}
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Quantity *</label>
                            <Input type="number" min={1} placeholder="e.g. 100" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="h-10" />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Unit price *</label>
                            <Input type="number" min={0} step="0.01" placeholder="0.00" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required className="h-10" />
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-4 gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-10">Cancel</Button>
                        <Button type="submit" disabled={saving || !selectedItemId || !quantity} className="h-10 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {saving ? 'Saving...' : 'Receive stock'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
