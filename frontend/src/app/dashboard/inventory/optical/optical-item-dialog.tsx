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
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { toast } from 'sonner';
import type { OpticalRow } from './columns';

type FormData = {
    itemName: string;
    itemType: string;
    brand: string;
    manufacturer: string;
    supplierName: string;
    stockQuantity: string;
    reorderLevel: string;
    purchasePrice: string;
    sellingPrice: string;
};

function toStr(v: number | string | null | undefined): string {
    if (v == null) return '';
    if (typeof v === 'number') return String(v);
    return String(v);
}

export function OpticalItemDialog({
    open,
    onOpenChange,
    item,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: OpticalRow | null;
    onSuccess: () => void;
}) {
    const isEdit = !!item?.id;
    const [formData, setFormData] = useState<FormData>({
        itemName: '',
        itemType: '',
        brand: '',
        manufacturer: '',
        supplierName: '',
        stockQuantity: '0',
        reorderLevel: '5',
        purchasePrice: '0',
        sellingPrice: '0',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (item) {
                setFormData({
                    itemName: item.itemName || '',
                    itemType: item.itemType || '',
                    brand: item.brand || '',
                    manufacturer: item.manufacturer || '',
                    supplierName: '',
                    stockQuantity: toStr(item.stockQuantity),
                    reorderLevel: toStr(item.reorderLevel),
                    purchasePrice: toStr(item.purchasePrice),
                    sellingPrice: toStr(item.sellingPrice),
                });
            } else {
                setFormData({
                    itemName: '',
                    itemType: '',
                    brand: '',
                    manufacturer: '',
                    supplierName: '',
                    stockQuantity: '0',
                    reorderLevel: '5',
                    purchasePrice: '0',
                    sellingPrice: '0',
                });
            }
        }
    }, [open, item]);

    const handleSave = async () => {
        const name = formData.itemName?.trim();
        if (!name) {
            toast.error('Item name is required');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                itemName: name,
                itemType: formData.itemType || null,
                brand: formData.brand || null,
                manufacturer: formData.manufacturer || null,
                supplierName: formData.supplierName || null,
                stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
                reorderLevel: parseInt(formData.reorderLevel, 10) ?? 5,
                purchasePrice: parseFloat(formData.purchasePrice) || 0,
                sellingPrice: parseFloat(formData.sellingPrice) || 0,
            };
            if (isEdit) {
                await api.put(`/inventory/optical/${item!.id}`, payload);
                toast.success('Optical item updated');
            } else {
                await api.post('/inventory/optical', payload);
                toast.success('Optical item created');
            }
            onOpenChange(false);
            onSuccess();
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast.error(typeof msg === 'string' ? msg : (isEdit ? 'Update failed' : 'Create failed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit optical item' : 'Add optical item'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update item details below.' : 'Add a new item to optical inventory.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label htmlFor="itemName">Item name *</Label>
                            <Input
                                id="itemName"
                                value={formData.itemName}
                                onChange={(e) => setFormData((p) => ({ ...p, itemName: e.target.value }))}
                                placeholder="e.g. Reading glasses"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="itemType">Type</Label>
                            <Input
                                id="itemType"
                                value={formData.itemType}
                                onChange={(e) => setFormData((p) => ({ ...p, itemType: e.target.value }))}
                                placeholder="Frame, Lens, Solution..."
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="brand">Brand</Label>
                            <Input
                                id="brand"
                                value={formData.brand}
                                onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="manufacturer">Manufacturer</Label>
                            <Input
                                id="manufacturer"
                                value={formData.manufacturer}
                                onChange={(e) => setFormData((p) => ({ ...p, manufacturer: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="supplierName">Supplier</Label>
                            <Input
                                id="supplierName"
                                value={formData.supplierName}
                                onChange={(e) => setFormData((p) => ({ ...p, supplierName: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="stockQuantity">Stock quantity</Label>
                            <Input
                                id="stockQuantity"
                                type="number"
                                min={0}
                                value={formData.stockQuantity}
                                onChange={(e) => setFormData((p) => ({ ...p, stockQuantity: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="reorderLevel">Reorder level</Label>
                            <Input
                                id="reorderLevel"
                                type="number"
                                min={0}
                                value={formData.reorderLevel}
                                onChange={(e) => setFormData((p) => ({ ...p, reorderLevel: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="purchasePrice">Purchase price</Label>
                            <Input
                                id="purchasePrice"
                                type="number"
                                min={0}
                                step={0.01}
                                value={formData.purchasePrice}
                                onChange={(e) => setFormData((p) => ({ ...p, purchasePrice: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="sellingPrice">Selling price</Label>
                            <Input
                                id="sellingPrice"
                                type="number"
                                min={0}
                                step={0.01}
                                value={formData.sellingPrice}
                                onChange={(e) => setFormData((p) => ({ ...p, sellingPrice: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4]">
                        {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
