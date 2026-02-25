'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { DataTable } from '@/components/ui/data-table';
import { getUserColumns, type User } from './columns';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserDialog } from './user-dialog';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('User deleted');
            fetchUsers();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const columns = useMemo(() => getUserColumns({
        onEdit: handleEdit,
        onDelete: handleDelete
    }), []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">User Management</h1>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-[0.2em] opacity-60">Control access and platform roles</p>
                </div>
                <Button onClick={() => { setEditingUser(null); setIsDialogOpen(true); }} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]">
                    <UserPlus className="w-4 h-4 mr-2" />
                    New User
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={users}
                loading={loading}
                onRefresh={fetchUsers}
                searchPlaceholder="Search by name, username, email..."
                itemLabel="users"
            />

            <UserDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={editingUser}
                onSuccess={fetchUsers}
            />
        </div>
    );
}
