'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import {
    Pencil,
    Trash2,
    Plus,
    Search,
    RefreshCcw,
    Loader2,
    MapPin,
    Phone,
    Building2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        branchName: '',
        address: '',
        phone: '',
    });

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const response = await api.get('/branches');
            setBranches(response.data);
        } catch (error: any) {
            console.error('Error fetching branches:', error);
            toast.error('Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleOpenDialog = (branch: any = null) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                branchName: branch.branchName,
                address: branch.address,
                phone: branch.phone,
            });
        } else {
            setEditingBranch(null);
            setFormData({ branchName: '', address: '', phone: '' });
        }
        setIsDialogOpen(true);
    };

    const handleSaveBranch = async () => {
        if (!formData.branchName || !formData.address || !formData.phone) {
            toast.error('All fields are required');
            return;
        }

        setSaving(true);
        try {
            if (editingBranch) {
                await api.put(`/branches/${editingBranch.id}`, formData);
                toast.success('Branch updated successfully');
            } else {
                await api.post('/branches', formData);
                toast.success('Branch created successfully');
            }
            setIsDialogOpen(false);
            fetchBranches();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBranch = async (id: number) => {
        if (!confirm('Are you sure you want to delete this branch?')) return;
        try {
            await api.delete(`/branches/${id}`);
            toast.success('Branch deleted successfully');
            fetchBranches();
        } catch (error: any) {
            toast.error('Failed to delete branch');
        }
    };

    const filteredBranches = branches.filter((b) =>
        b.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone.includes(searchQuery)
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Branch Management</h1>
                    <p className="text-muted-foreground text-sm">Manage your clinic locations and contact information.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Branch
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-background/50 backdrop-blur pb-4 border-b">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, address or phone..."
                        className="pl-9 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="ghost" size="icon" onClick={fetchBranches} disabled={loading}>
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-[60px]">#</TableHead>
                            <TableHead className="w-[200px]">Branch Name</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead className="w-[160px]">Phone</TableHead>
                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Loading branches...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredBranches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    {searchQuery ? 'No branches found matching your search.' : 'No branches yet. Click "Add Branch" to create one.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBranches.map((branch, index) => (
                                <TableRow key={branch.id} className="hover:bg-muted/50 transition-colors group">
                                    <TableCell className="text-muted-foreground text-sm font-mono">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            {branch.branchName}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 shrink-0" />
                                            <span className="line-clamp-1">{branch.address}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="w-3 h-3" />
                                            {branch.phone}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenDialog(branch)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteBranch(branch.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add / Edit Branch Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
                        <DialogDescription>
                            {editingBranch
                                ? 'Update this clinic branch\'s information.'
                                : 'Register a new clinic branch location.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Name</label>
                            <Input
                                className="col-span-3"
                                placeholder="e.g. Main Clinic"
                                value={formData.branchName}
                                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <label className="text-right text-sm font-medium pt-2">Address</label>
                            <Textarea
                                className="col-span-3 min-h-[80px]"
                                placeholder="Full street address..."
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Phone</label>
                            <Input
                                className="col-span-3"
                                placeholder="+252 61 XXXXXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSaveBranch} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingBranch ? 'Save Changes' : 'Create Branch'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
