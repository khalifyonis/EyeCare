'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import {
    ShieldCheck, Save, RefreshCw, Stethoscope, UserCog,
    Pill, Glasses, Users, Trash2, Plus, Loader2, Lock, HelpCircle,
    ArrowLeft, CheckSquare, Square, MoreHorizontal, Eye, Edit2, ShieldAlert,
    Check, X, ChevronRight, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/* ── Types ── */
interface CustomRole {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
}

interface ModulePermission {
    id?: string;
    module: string;
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

type GroupedPermissions = Record<string, ModulePermission[]>;
type ViewMode = 'list' | 'edit';

/* ── Constants ── */
const ROLE_STATIC_ASSETS: Record<string, { title: string; color: string; icon: any }> = {
    SUPERADMIN: {
        title: 'Super Admin',
        color: 'from-rose-500 to-red-600',
        icon: ShieldCheck,
    },
    ADMIN: {
        title: 'Administrator',
        color: 'from-blue-500 to-indigo-600',
        icon: UserCog,
    },
    DOCTOR: {
        title: 'Doctor',
        color: 'from-emerald-500 to-teal-600',
        icon: Stethoscope,
    },
    RECEPTIONIST: {
        title: 'Receptionist',
        color: 'from-amber-500 to-orange-600',
        icon: Users,
    },
    PHARMACIST: {
        title: 'Pharmacist',
        color: 'from-pink-500 to-purple-600',
        icon: Pill,
    },
    OPTICIAN: {
        title: 'Optician',
        color: 'from-cyan-500 to-blue-500',
        icon: Glasses,
    },
};

const MODULE_LABELS: Record<string, { title: string; desc: string; group: string }> = {
    patients: { title: 'Patients', desc: 'Patient profiles and medical history', group: 'CLINICAL' },
    appointments: { title: 'Appointments', desc: 'Scheduling and check-ins', group: 'CLINICAL' },
    preliminary_exams: { title: 'Preliminary Exams', desc: 'Stage 1: Refraction & VA', group: 'CLINICAL' },
    clinical_exams: { title: 'Clinical Exams', desc: 'Stage 2: Fundus & Diagnosis', group: 'CLINICAL' },
    surgery: { title: 'Eye Surgery', desc: 'Surgical bookings and records', group: 'CLINICAL' },
    medicine_prescriptions: { title: 'Medicine Prescriptions', desc: 'Drug orders and dosages', group: 'CLINICAL' },
    optical_prescriptions: { title: 'Optical Prescriptions', desc: 'Glasses and lens specs', group: 'CLINICAL' },
    pharmacy: { title: 'Pharmacy', desc: 'Inventory and OTC sales', group: 'INVENTORY' },
    optical: { title: 'Optical Shop', desc: 'Frames and order tracking', group: 'INVENTORY' },
    billing: { title: 'Billing', desc: 'Invoices and payments', group: 'FINANCE' },
    reports_financial: { title: 'Financial Reports', desc: 'Revenue and income analytics', group: 'REPORTS' },
    reports_clinical: { title: 'Clinical Reports', desc: 'Exam outcomes and performance', group: 'REPORTS' },
    reports_appointments: { title: 'Appointment Reports', desc: 'Booking and arrival stats', group: 'REPORTS' },
    reports_patients: { title: 'Patient Reports', desc: 'Demographics and growth', group: 'REPORTS' },
    reports_inventory: { title: 'Inventory Reports', desc: 'Stock and expiry tracking', group: 'REPORTS' },
    reports_operational: { title: 'Operational Reports', desc: 'Branch and staff metrics', group: 'REPORTS' },
    users: { title: 'Staff', desc: 'User accounts and roles', group: 'ADMINISTRATION' },
    logs: { title: 'Logs', desc: 'Audit trails and history', group: 'ADMINISTRATION' },
    branches: { title: 'Branches', desc: 'Clinic settings and locations', group: 'ADMINISTRATION' },
};

const MODULE_GROUPS: Record<string, { label: string; icon: any }> = {
    CLINICAL: { label: 'Clinical Operations', icon: Stethoscope },
    INVENTORY: { label: 'Inventory', icon: Pill },
    FINANCE: { label: 'Finance', icon: ShieldCheck },
    REPORTS: { label: 'Reports', icon: Eye },
    ADMINISTRATION: { label: 'Administration', icon: UserCog },
};

/* ── UI Components ── */
const Panel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl", className)}>
        {children}
    </div>
);

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'outline' }) => (
    <span className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
        variant === 'default' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400",
        className
    )}>
        {children}
    </span>
);

/* ── Main Page ── */
export default function PermissionsPage() {
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [permissions, setPermissions] = useState<GroupedPermissions>({});
    const [selectedRole, setSelectedRole] = useState<string>('ADMIN');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [creatingRole, setCreatingRole] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                api.get('/roles'),
                api.get('/permissions'),
            ]);
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);

            const exists = rolesRes.data.some((r: any) => r.name === selectedRole);
            if (!exists && rolesRes.data.length > 0) {
                setSelectedRole(rolesRes.data[0].name);
            }
        } catch {
            toast.error('Failed to load permissions');
        } finally {
            setLoading(false);
        }
    }, [selectedRole]);

    useEffect(() => {
        fetchData();
    }, []);

    const handleCheckToggle = (module: string, action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete') => {
        if (selectedRole === 'SUPERADMIN') return;
        setPermissions(prev => {
            const rolePerms = [...(prev[selectedRole] || [])];
            const idx = rolePerms.findIndex(p => p.module === module);
            if (idx > -1) {
                rolePerms[idx] = { ...rolePerms[idx], [action]: !rolePerms[idx][action] };
            }
            return { ...prev, [selectedRole]: rolePerms };
        });
    };

    const handleGrantAllForModule = (module: string, grant: boolean = true) => {
        if (selectedRole === 'SUPERADMIN') return;
        setPermissions(prev => {
            const rolePerms = [...(prev[selectedRole] || [])];
            const idx = rolePerms.findIndex(p => p.module === module);
            if (idx > -1) {
                rolePerms[idx] = {
                    ...rolePerms[idx],
                    canRead: grant, canCreate: grant, canUpdate: grant, canDelete: grant
                };
            }
            return { ...prev, [selectedRole]: rolePerms };
        });
    };

    const handleGrantAllForRole = (grant: boolean) => {
        setPermissions(prev => {
            const rolePerms = (prev[selectedRole] || []).map(p => ({
                ...p,
                canRead: grant, canCreate: grant, canUpdate: grant, canDelete: grant
            }));
            return { ...prev, [selectedRole]: rolePerms };
        });
    };

    const handleSave = async () => {
        if (selectedRole === 'SUPERADMIN') return;
        setSaving(true);
        try {
            const rolePerms = permissions[selectedRole] || [];
            await api.put('/permissions', {
                role: selectedRole,
                permissions: rolePerms,
            });
            toast.success(`Updated ${selectedRole} permissions`);

            // Sync own session
            const rawUser = localStorage.getItem('user');
            if (rawUser && JSON.parse(rawUser).role === selectedRole) {
                const perms = await api.get('/permissions/mine');
                localStorage.setItem('permissions', JSON.stringify(perms.data));
                window.dispatchEvent(new Event('storage'));
            }
            setViewMode('list');
        } catch {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newRoleName.trim().toUpperCase().replace(/\s+/g, '_');
        if (!name) return toast.error('Name required');

        setCreatingRole(true);
        try {
            await api.post('/roles', { name, description: newRoleDesc.trim() });
            toast.success('Role created');
            setShowCreateModal(false);
            setNewRoleName('');
            setNewRoleDesc('');
            await fetchData();
            setSelectedRole(name);
            setViewMode('edit');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error');
        } finally {
            setCreatingRole(false);
        }
    };

    const handleDeleteRole = async (roleName: string) => {
        const role = roles.find(r => r.name === roleName);
        if (!role || role.isSystem) return;
        if (!confirm(`Delete ${roleName}?`)) return;

        setDeleting(true);
        try {
            await api.delete(`/roles/${role.id}`);
            toast.success('Role deleted');
            setSelectedRole('ADMIN');
            await fetchData();
        } catch {
            toast.error('Failed to delete');
        } finally {
            setDeleting(false);
        }
    };

    const filteredRoles = useMemo(() =>
        roles.filter(r =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        , [roles, searchQuery]);

    const activeRole = roles.find(r => r.name === selectedRole);

    /* ── Main Render ── */
    return (
        <div className="w-full min-w-0 animate-in fade-in duration-300">
            {viewMode === 'list' ? (
                <div className="p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Roles Management</h1>
                            <PageBreadcrumb current="Permissions" />
                        </div>
                        <Button onClick={() => setShowCreateModal(true)} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white rounded-xl shadow-lg shadow-blue-500/20 px-6 font-bold">
                            <Plus className="size-4 mr-2" /> Create Role
                        </Button>
                    </div>

                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                            placeholder="Search roles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 rounded-xl border-slate-200 dark:border-slate-800"
                        />
                    </div>

                    <Panel className="overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="p-20 flex flex-col items-center gap-3">
                                <Loader2 className="size-8 animate-spin text-[#0EA5E9]" />
                                <p className="text-sm font-medium text-slate-400">Loading roles...</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50">
                                        <TableHead className="w-[200px] font-bold text-[11px] uppercase tracking-wider">Role</TableHead>
                                        <TableHead className="font-bold text-[11px] uppercase tracking-wider">Description</TableHead>
                                        <TableHead className="font-bold text-[11px] uppercase tracking-wider">Type</TableHead>
                                        <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRoles.map(r => (
                                        <TableRow key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <TableCell className="font-bold text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "size-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br",
                                                        ROLE_STATIC_ASSETS[r.name]?.color || "from-slate-500 to-slate-700"
                                                    )}>
                                                        {React.createElement(ROLE_STATIC_ASSETS[r.name]?.icon || ShieldCheck, { className: "size-4" })}
                                                    </div>
                                                    {ROLE_STATIC_ASSETS[r.name]?.title || r.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 italic max-w-md truncate">
                                                {r.description || 'Custom configured staff role.'}
                                            </TableCell>
                                            <TableCell>
                                                {r.isSystem ? <Badge variant="outline">System</Badge> : <Badge>Custom</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10 font-bold"
                                                        onClick={() => { setSelectedRole(r.name); setViewMode('edit'); }}
                                                    >
                                                        <Edit2 className="size-3.5 mr-2" /> Edit Permissions
                                                    </Button>
                                                    {!r.isSystem && (
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteRole(r.name)}>
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Panel>
                </div>
            ) : (
                <div className="p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} className="rounded-full hover:bg-slate-100">
                                <ArrowLeft className="size-5" />
                            </Button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Permissions</h1>
                                    <Badge className={cn("bg-gradient-to-r text-white border-none px-3", ROLE_STATIC_ASSETS[selectedRole]?.color)}>
                                        {ROLE_STATIC_ASSETS[selectedRole]?.title || selectedRole}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-500">Configure access levels for each system module</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {selectedRole !== 'SUPERADMIN' && (
                                <>
                                    <Button variant="outline" onClick={() => handleGrantAllForRole(false)} className="rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50">Revoke All</Button>
                                    <Button variant="outline" onClick={() => handleGrantAllForRole(true)} className="rounded-xl font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50">Grant All</Button>
                                    <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white rounded-xl font-bold px-6">
                                        {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />} Save Changes
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {selectedRole === 'SUPERADMIN' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                            <ShieldAlert className="size-5 shrink-0" />
                            <p className="text-sm font-medium">Super Admin permissions are hardcoded system-wide and cannot be modified.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        {Object.entries(MODULE_GROUPS).map(([groupKey, group]) => {
                            const groupModules = Object.entries(MODULE_LABELS).filter(([, m]) => m.group === groupKey);
                            const currPerms = permissions[selectedRole] || [];
                            return (
                                <Panel key={groupKey} className="overflow-hidden">
                                    <div className="bg-slate-50/80 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            {React.createElement(group.icon, { className: "size-4 text-slate-400" })}
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{group.label}</h3>
                                        </div>
                                        {selectedRole !== 'SUPERADMIN' && (
                                            <div className="flex gap-3">
                                                <button onClick={() => groupModules.forEach(([mk]) => handleGrantAllForModule(mk, true))} className="text-[10px] font-bold text-[#0EA5E9] hover:underline uppercase tracking-tighter">Grant Section</button>
                                                <button onClick={() => groupModules.forEach(([mk]) => handleGrantAllForModule(mk, false))} className="text-[10px] font-bold text-slate-400 hover:underline uppercase tracking-tighter">Clear Section</button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-slate-900">
                                            <div className="col-span-6">Module</div>
                                            <div className="col-span-1 text-center">Read</div>
                                            <div className="col-span-1 text-center">Create</div>
                                            <div className="col-span-1 text-center">Update</div>
                                            <div className="col-span-1 text-center">Delete</div>
                                            <div className="col-span-2 text-center">Actions</div>
                                        </div>
                                        {groupModules.map(([mk, meta]) => {
                                            const p = currPerms.find(x => x.module === mk) || { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
                                            const allChecked = p.canRead && p.canCreate && p.canUpdate && p.canDelete;
                                            return (
                                                <div key={mk} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/30 transition-colors">
                                                    <div className="col-span-1 md:col-span-6 space-y-0.5">
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{meta.title}</h4>
                                                        <p className="text-xs text-slate-500">{meta.desc}</p>
                                                    </div>
                                                    {(['canRead', 'canCreate', 'canUpdate', 'canDelete'] as const).map(action => (
                                                        <div key={action} className="col-span-1 flex justify-center items-center">
                                                            <Checkbox
                                                                disabled={selectedRole === 'SUPERADMIN'}
                                                                checked={selectedRole === 'SUPERADMIN' ? true : p[action]}
                                                                onChange={() => handleCheckToggle(mk, action)}
                                                                className="size-5 rounded-md"
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="col-span-2 flex justify-center">
                                                        {selectedRole !== 'SUPERADMIN' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleGrantAllForModule(mk, !allChecked)}
                                                                className={cn(
                                                                    "h-7 text-[10px] font-bold uppercase rounded-lg px-2",
                                                                    allChecked ? "text-slate-400" : "text-[#0EA5E9]"
                                                                )}
                                                            >
                                                                {allChecked ? 'Clear' : 'Select All'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Panel>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create Role Modal is always rendered in fixed position */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <Panel className="max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                <Plus className="size-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Create Custom Role</h3>
                                <p className="text-xs text-slate-500">Define a new staff permission group</p>
                            </div>
                        </div>
                        <form onSubmit={handleCreateRole} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Role Name</label>
                                <Input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="e.g. LAB_MANAGER" className="h-11 rounded-xl uppercase" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                <Textarea value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} placeholder="What is this role for?" rows={3} className="rounded-xl resize-none" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-xl font-bold">Cancel</Button>
                                <Button type="submit" disabled={creatingRole} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white rounded-xl px-6 font-bold shadow-lg shadow-blue-500/20">
                                    {creatingRole ? <Loader2 className="size-4 animate-spin" /> : 'Create Role'}
                                </Button>
                            </div>
                        </form>
                    </Panel>
                </div>
            )}
        </div>
    );
}
