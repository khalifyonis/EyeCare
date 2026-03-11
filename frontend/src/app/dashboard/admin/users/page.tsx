'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { DataTable } from '@/components/ui/data-table';
import { getUserColumns, type User } from './columns';
import { UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UserDialog } from './user-dialog';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users?limit=1000');
            const body = response.data as { data?: User[]; total?: number };
            setUsers(Array.isArray(body?.data) ? body.data : []);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const roles = useMemo(() => {
        const r = new Set(users.map(u => u.roleName).filter(Boolean));
        return Array.from(r).sort();
    }, [users]);

    const filtered = useMemo(() => {
        let list = [...users];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(u =>
                u.fullName?.toLowerCase().includes(q) ||
                u.username?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
            );
        }
        if (roleFilter !== 'all') list = list.filter(u => u.roleName === roleFilter);
        if (statusFilter === 'active') list = list.filter(u => u.isActive !== false);
        if (statusFilter === 'inactive') list = list.filter(u => u.isActive === false);
        return list;
    }, [users, search, roleFilter, statusFilter]);

    const handleEdit = async (user: User) => {
        try {
            const response = await api.get(`/users/${user.id}`);
            setEditingUser(response.data);
            setIsDialogOpen(true);
        } catch (error) {
            toast.error('Failed to load user details');
        }
    };
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('User deleted');
            fetchUsers();
        } catch (error) { toast.error('Delete failed'); }
    };

    const columns = useMemo(() => getUserColumns({ onEdit: handleEdit, onDelete: handleDelete }), []);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            {/* Header with title + Add User on the right (like Doctors page) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">User Management</h1>
                    <PageBreadcrumb current="Users" />
                </div>
                <Button
                    onClick={() => { setEditingUser(null); setIsDialogOpen(true); }}
                    className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                </Button>
            </div>

            {/* Filter row: Search | Role | Status – rectangular pills like sample */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                <div className="relative w-full md:w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 w-full rounded-md border border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="min-w-0">
                <DataTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    onRefresh={fetchUsers}
                    itemLabel="users"
                    hideSearch
                    enableRowSelection
                />
            </div>

            <UserDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} user={editingUser} onSuccess={fetchUsers} />
        </div>
    );
}
