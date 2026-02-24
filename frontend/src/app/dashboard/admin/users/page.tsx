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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Pencil,
    Trash2,
    Plus,
    Search,
    RefreshCcw,
    ShieldCheck,
    Stethoscope,
    Pill,
    Glasses,
    UserCog,
    Loader2,
    Mail,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        roleName: 'RECEPTIONIST',
        licenseNumber: '',
        specialization: '',
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenDialog = (user: any = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                fullName: user.fullName,
                username: user.username,
                email: user.email || '',
                password: '',
                roleName: user.roleName,
                licenseNumber: user.doctor?.licenseNumber || '',
                specialization: user.doctor?.specialization || '',
            });
        } else {
            setEditingUser(null);
            setFormData({
                fullName: '',
                username: '',
                email: '',
                password: '',
                roleName: 'RECEPTIONIST',
                licenseNumber: '',
                specialization: '',
            });
        }
        setIsDialogOpen(true);
    };

    const handleSaveUser = async () => {
        try {
            // Validate common fields
            if (!formData.fullName || !formData.username) {
                toast.error('Full name and username are required');
                return;
            }

            // For new users, email is required (password is auto-generated)
            if (!editingUser && !formData.email) {
                toast.error('Email is required for new users');
                return;
            }

            // For edits, enforce 6-char minimum if password is provided
            if (editingUser && formData.password && formData.password.length < 6) {
                toast.error('Password must be at least 6 characters');
                return;
            }

            setSaving(true);

            if (editingUser) {
                const payload: any = {
                    fullName: formData.fullName,
                    username: formData.username,
                    email: formData.email,
                    roleName: formData.roleName,
                    licenseNumber: formData.licenseNumber,
                    specialization: formData.specialization,
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await api.put(`/users/${editingUser.id}`, payload);
                toast.success('User updated successfully');
            } else {
                const response = await api.post('/users', {
                    fullName: formData.fullName,
                    username: formData.username,
                    email: formData.email,
                    roleName: formData.roleName,
                    licenseNumber: formData.licenseNumber,
                    specialization: formData.specialization,
                });
                if (response.data.emailSent) {
                    toast.success('User created! Credentials sent to their email.');
                } else {
                    toast.success('User created, but the onboarding email could not be sent.');
                }
            }
            setIsDialogOpen(false);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error: any) {
            toast.error('Failed to delete user');
        }
    };

    const filteredUsers = users.filter((u) =>
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getRoleIcon = (roleName: string) => {
        switch (roleName.toUpperCase()) {
            case 'ADMIN': return <ShieldCheck className="w-3.5 h-3.5" />;
            case 'DOCTOR': return <Stethoscope className="w-3.5 h-3.5" />;
            case 'PHARMACIST': return <Pill className="w-3.5 h-3.5" />;
            case 'OPTICIAN': return <Glasses className="w-3.5 h-3.5" />;
            default: return <UserCog className="w-3.5 h-3.5" />;
        }
    };

    const getRoleBadgeColor = (roleName: string) => {
        switch (roleName.toUpperCase()) {
            case 'ADMIN': return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
            case 'DOCTOR': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'PHARMACIST': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'OPTICIAN': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'RECEPTIONIST': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground text-sm">Manage your professional team and system access.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-background/50 backdrop-blur pb-4 border-b">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, username, email or role..."
                        className="pl-9 h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="ghost" size="icon" onClick={fetchUsers} disabled={loading}>
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-[220px]">Full Name</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Loading users...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No users found matching your search.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/50 transition-colors group">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${getRoleBadgeColor(user.roleName)}`}>
                                                {user.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span>{user.fullName}</span>
                                                {user.doctor && (
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                        {user.doctor.specialization}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm font-mono">@{user.username}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-3 h-3" />
                                            {user.email}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`flex items-center gap-1.5 w-fit font-medium text-[11px] uppercase tracking-wide px-2 py-0.5 ${getRoleBadgeColor(user.roleName)}`}>
                                            {getRoleIcon(user.roleName)}
                                            {user.roleName}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-1.5 rounded-full bg-emerald-500"></div>
                                            <span className="text-xs font-medium">Active</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenDialog(user)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteUser(user.id)}>
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

            {/* Add / Edit User Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                        <DialogDescription>
                            {editingUser
                                ? 'Update this team member\'s information.'
                                : 'Create a new account. A temporary password will be auto-generated and emailed to the user.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Full Name</label>
                            <Input
                                className="col-span-3"
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Username</label>
                            <Input
                                className="col-span-3"
                                placeholder="johndoe"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                className="col-span-3"
                                placeholder="user@gmail.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        {/* Password field only shown when EDITING */}
                        {editingUser && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-sm font-medium">Password</label>
                                <Input
                                    type="password"
                                    placeholder="Min 6 chars (leave blank to keep)"
                                    className="col-span-3"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        )}

                        {/* Auto-password notice for new users */}
                        {!editingUser && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="col-start-2 col-span-3">
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                        <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            A secure 8-character password will be auto-generated and emailed to the user.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Role</label>
                            <Select
                                value={formData.roleName}
                                onValueChange={(val) => setFormData({ ...formData, roleName: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                                    <SelectItem value="OPTICIAN">Optician</SelectItem>
                                    <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.roleName === 'DOCTOR' && (
                            <div className="grid gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border animate-in fade-in slide-in-from-top-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Medical Profile</p>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label className="text-right text-sm font-medium">License</label>
                                    <Input
                                        className="col-span-3"
                                        placeholder="MED-12345"
                                        value={formData.licenseNumber}
                                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label className="text-right text-sm font-medium">Spec.</label>
                                    <Input
                                        className="col-span-3"
                                        placeholder="Retina Specialist"
                                        value={formData.specialization}
                                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSaveUser} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingUser ? 'Save Changes' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
