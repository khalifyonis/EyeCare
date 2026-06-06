'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { DataTable } from '@/components/ui/data-table';
import { getUserColumns, type User } from './columns';
import { UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UserForm } from './user-form';
import { UserDetails } from './user-details';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'form' | 'details'>('list');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users', {
                params: { _ts: Date.now() },
                headers: {
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                },
            });
            setUsers(response.data);
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
        list.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            if (sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
            if (sortBy === 'name-desc') return (b.fullName || '').localeCompare(a.fullName || '');
            return 0;
        });
        return list;
    }, [users, search, roleFilter, sortBy]);

    const fetchUserDetails = async (userId: string) => {
        try {
            const response = await api.get(`/users/${userId}`, {
                params: { _ts: Date.now() },
                headers: {
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                },
            });
            return response.data;
        } catch (error) {
            toast.error('Failed to load user details');
            return null;
        }
    };

    const handleView = async (user: User) => {
        const details = await fetchUserDetails(user.id);
        if (!details) return;
        setEditingUser(details);
        setView('details');
    };

    const handleEdit = async (user: User) => {
        const details = await fetchUserDetails(user.id);
        if (!details) return;
        setEditingUser(details);
        setView('form');
    };
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('User deleted');
            fetchUsers();
        } catch (error) { toast.error('Delete failed'); }
    };

    const columns = useMemo(
        () => getUserColumns({ onView: handleView, onEdit: handleEdit, onDelete: handleDelete }),
        [handleView, handleEdit]
    );

    const handleFormSuccess = () => {
        setView('list');
        fetchUsers();
    };

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            {view === 'list' ? (
                <>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Users</h1>
                            <PageBreadcrumb current="Users" />
                        </div>
                        <Button onClick={() => { setEditingUser(null); setView('form'); }} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]">
                            <UserPlus className="w-4 h-4 mr-2" />
                            New User
                        </Button>
                    </div>

                    {/* Filter row: Search | Role | Sort By */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Search Users</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm focus-visible:ring-[#0EA5E9]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Role</label>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm focus:ring-[#0EA5E9]">
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                    <SelectItem value="all">All Roles</SelectItem>
                                    {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Sort By</label>
                             <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm focus:ring-[#0EA5E9]">
                                    <SelectValue placeholder="Newest First" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="min-w-0">
                        <DataTable
                            columns={columns}
                            data={filtered}
                            loading={loading}
                            onRefresh={fetchUsers}
                            itemLabel="users"
                            hideSearch
                            separateFooter
                        />
                    </div>
                </>
            ) : view === 'details' && editingUser ? (
                <UserDetails
                    user={editingUser}
                    onBack={() => setView('list')}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            ) : (
                <UserForm 
                    user={editingUser} 
                    onSuccess={handleFormSuccess} 
                    onCancel={() => setView('list')} 
                />
            )}
        </div>
    );
}
