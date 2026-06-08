'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import {
    ShieldCheck, Save, RefreshCw, Stethoscope, UserCog,
    Pill, Glasses, Users, Trash2, Plus, Loader2, Lock, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

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

const ROLE_STATIC_ASSETS: Record<string, { title: string; color: string; icon: any }> = {
    SUPERADMIN: {
        title: 'Super Admin',
        color: 'from-rose-500 to-red-600 shadow-rose-500/20',
        icon: ShieldCheck,
    },
    ADMIN: {
        title: 'Administrator',
        color: 'from-[#0ea5e9] to-blue-600 shadow-blue-500/20',
        icon: UserCog,
    },
    DOCTOR: {
        title: 'Ophthalmologist / Doctor',
        color: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
        icon: Stethoscope,
    },
    RECEPTIONIST: {
        title: 'Receptionist',
        color: 'from-amber-500 to-orange-600 shadow-amber-500/20',
        icon: Users,
    },
    PHARMACIST: {
        title: 'Pharmacist',
        color: 'from-pink-500 to-purple-600 shadow-pink-500/20',
        icon: Pill,
    },
    OPTICIAN: {
        title: 'Optician',
        color: 'from-cyan-500 to-teal-600 shadow-cyan-500/20',
        icon: Glasses,
    },
};

const MODULE_LABELS: Record<string, { title: string; desc: string }> = {
    patients: { title: 'Patients Module', desc: 'Patient profiles, registrations, and medical history logs' },
    appointments: { title: 'Appointments Module', desc: 'Scheduling calendar, check-ins, and arrival tracking' },
    preliminary_exams: { title: 'Preliminary Examinations', desc: 'Stage 1 eye exams: visual acuity, IOP, refraction, and chief complaints' },
    clinical_exams: { title: 'Clinical Examinations', desc: 'Stage 2 clinical exams: anterior segment, fundus, diagnosis, and treatment plans' },
    surgery: { title: 'Eye Surgery Module', desc: 'Surgical bookings, schedule times, operating rooms, and surgeon allocations' },
    medicine_prescriptions: { title: 'Medicine Prescriptions', desc: 'Pharmaceutical medicine prescriptions, dosages, and dispensing records' },
    optical_prescriptions: { title: 'Optical Prescriptions', desc: 'Optical frame/lens prescriptions, PD measurements, and lens specifications' },
    reports_financial: { title: 'Financial Reports', desc: 'Revenue analytics, payment methods, and billing stats' },
    reports_clinical: { title: 'Clinical Reports', desc: 'Disease statistics, check-up outcomes, and clinical logs' },
    reports_appointments: { title: 'Appointment Reports', desc: 'Booking counts, cancellation logs, and arrival tracking statistics' },
    reports_patients: { title: 'Patient Reports', desc: 'New registration cohorts, demographic breakdowns, and logs' },
    reports_inventory: { title: 'Inventory Reports', desc: 'Pharmacy and optical stock levels, reorder alerts, and usage' },
    reports_operational: { title: 'Operational Reports', desc: 'Clinic statistics, staff logs, and general operating speed metrics' },
    pharmacy: { title: 'Pharmacy Inventory', desc: 'Medicines catalog, batch stock level tracking, and OTC sales' },
    optical: { title: 'Optical Shop Inventory', desc: 'Frames catalog, lens counts, order tracking, and stock refills' },
    billing: { title: 'Billing & Invoices', desc: 'Service bills, payments invoices, payment methods, and receipt printing' },
    users: { title: 'Staff & Users Management', desc: 'System log-ins, role changes, multi-branch allocations, and doctor specialties' },
    logs: { title: 'Logs & Compliance', desc: 'Activity logs, audit trail, change history, exports, and compliance monitoring' },
    branches: { title: 'Branches & Clinic Settings', desc: 'Clinic details, phone lines, active/inactive states, and addresses' },
};

export default function PermissionsPage() {
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [permissions, setPermissions] = useState<GroupedPermissions>({});
    const [selectedRole, setSelectedRole] = useState<string>('ADMIN');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Modal / Creation State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [creatingRole, setCreatingRole] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                api.get('/roles'),
                api.get('/permissions'),
            ]);
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);
            
            // Check if selectedRole still exists, otherwise default to first available
            const exists = rolesRes.data.some((r: any) => r.name === selectedRole);
            if (!exists && rolesRes.data.length > 0) {
                setSelectedRole(rolesRes.data[0].name);
            }
        } catch (error) {
            toast.error('Failed to load roles and permissions matrix');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleToggle = (module: string, action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete') => {
        if (selectedRole === 'SUPERADMIN') return;

        setPermissions(prev => {
            const rolePerms = [...(prev[selectedRole] || [])];
            const idx = rolePerms.findIndex(p => p.module === module);
            if (idx > -1) {
                rolePerms[idx] = {
                    ...rolePerms[idx],
                    [action]: !rolePerms[idx][action],
                };
            }
            return {
                ...prev,
                [selectedRole]: rolePerms,
            };
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
            toast.success(`Permissions for ${ROLE_STATIC_ASSETS[selectedRole]?.title || selectedRole} saved successfully!`);

            // If editing own role, refresh stored session permissions
            const rawUser = localStorage.getItem('user');
            if (rawUser) {
                try {
                    const user = JSON.parse(rawUser);
                    if (user.role === selectedRole) {
                        const refreshRes = await api.get('/permissions/mine');
                        localStorage.setItem('permissions', JSON.stringify(refreshRes.data));
                        window.dispatchEvent(new Event('storage'));
                    }
                } catch (e) {
                    console.error('Failed to sync permissions:', e);
                }
            }
        } catch (error) {
            toast.error('Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        const formattedName = newRoleName.trim().toUpperCase().replace(/\s+/g, '_');

        if (!formattedName) {
            toast.error('Role name is required');
            return;
        }

        if (!/^[A-Z0-9_]+$/.test(formattedName)) {
            toast.error('Role name can only contain letters, numbers, and underscores');
            return;
        }

        setCreatingRole(true);
        try {
            const res = await api.post('/roles', {
                name: formattedName,
                description: newRoleDesc.trim(),
            });

            toast.success('Custom role created successfully!');
            setShowCreateModal(false);
            setNewRoleName('');
            setNewRoleDesc('');
            
            // Reload roles and permissions
            await fetchData();
            setSelectedRole(formattedName);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create role');
        } finally {
            setCreatingRole(false);
        }
    };

    const handleDeleteRole = async () => {
        const activeRoleObj = roles.find(r => r.name === selectedRole);
        if (!activeRoleObj || selectedRole === 'SUPERADMIN') return;

        if (!confirm(`Are you sure you want to delete the custom role "${selectedRole}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(true);
        try {
            await api.delete(`/roles/${activeRoleObj.id}`);
            toast.success(`Role "${selectedRole}" has been deleted.`);
            
            // Fallback selection to ADMIN
            setSelectedRole('ADMIN');
            await fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete role');
        } finally {
            setDeleting(false);
        }
    };

    const currentRolePerms = permissions[selectedRole] || [];
    const activeRoleObj = roles.find(r => r.name === selectedRole);
    const isSuperadminSelected = selectedRole === 'SUPERADMIN';
    const isSystemRole = activeRoleObj?.isSystem ?? true;
    
    // Icon and styles configuration
    const roleAssets = ROLE_STATIC_ASSETS[selectedRole] || {
        title: selectedRole.replace(/_/g, ' '),
        color: 'from-blue-500 to-indigo-600 shadow-indigo-500/20',
        icon: ShieldCheck,
    };
    const RoleIcon = roleAssets.icon;

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Roles & Permissions</h1>
                    <PageBreadcrumb current="Permissions" />
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 font-bold px-4 rounded-xl shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Role
                    </Button>
                    {!isSuperadminSelected && (
                        <Button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                        >
                            {saving ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    )}
                </div>
            </div>

            {/* Layout: Sidebar Roles | Permissions Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Roles Selector Sidebar */}
                <div className="lg:col-span-4 space-y-3">
                    <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Clinic User Roles</h2>
                    <div className="space-y-2.5">
                        {roles.map((roleObj) => {
                            const isSelected = selectedRole === roleObj.name;
                            const staticAsset = ROLE_STATIC_ASSETS[roleObj.name] || {
                                title: roleObj.name.replace(/_/g, ' '),
                                color: 'from-blue-500 to-indigo-600 shadow-indigo-500/20',
                                icon: ShieldCheck,
                            };
                            const IconComponent = staticAsset.icon;
                            return (
                                <div
                                    key={roleObj.id}
                                    onClick={() => setSelectedRole(roleObj.name)}
                                    className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-300 relative overflow-hidden ${
                                        isSelected
                                            ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/40 border-slate-200 dark:border-slate-800 shadow-md ring-1 ring-slate-100 dark:ring-slate-950'
                                            : 'bg-white/40 dark:bg-slate-900/10 border-slate-150 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                >
                                    {/* Left Accent Bar */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-all duration-300 ${
                                        isSelected ? 'bg-[#0EA5E9]' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-700'
                                    }`} />

                                    <div className="flex gap-3.5 items-start">
                                        <div className={`rounded-xl p-2.5 bg-gradient-to-br text-white shadow-md ${staticAsset.color} shrink-0`}>
                                            <IconComponent className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] truncate mr-2">{staticAsset.title}</h3>
                                                {roleObj.isSystem ? (
                                                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-1.5 py-0.5 rounded shrink-0">System</span>
                                                ) : (
                                                    <span className="text-[9px] uppercase tracking-wider font-bold text-[#0EA5E9] bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded shrink-0">Custom</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal line-clamp-2 mt-0.5">{roleObj.description || 'Custom configured staff role.'}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Permissions Table Matrix */}
                <div className="lg:col-span-8">
                    {loading ? (
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="w-8 h-8 text-[#0EA5E9] animate-spin" />
                            <p className="text-slate-500 text-sm font-semibold">Loading permissions data...</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-500">
                            
                            {/* Role Banner */}
                            <div className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`rounded-xl p-2 bg-gradient-to-br text-white shadow ${roleAssets.color}`}>
                                        <RoleIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                            {roleAssets.title} Permissions Matrix
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {isSuperadminSelected ? 'All options locked to Read/Write' : 'Configure functional rights'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSuperadminSelected && (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20 rounded-full text-xs font-bold">
                                            <Lock className="w-3.5 h-3.5" /> Read-Only System Matrix
                                        </div>
                                    )}
                                    {!isSuperadminSelected && (
                                        <Button
                                            onClick={handleDeleteRole}
                                            disabled={deleting}
                                            variant="destructive"
                                            className="h-8 px-3 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-red-600 dark:text-red-400 border border-red-200/50 hover:border-red-300"
                                        >
                                            {deleting ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3 h-3 mr-1" />
                                            )}
                                            Delete Role
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Permissions List */}
                            <div className="divide-y divide-slate-150 dark:divide-slate-800/80">
                                {Object.keys(MODULE_LABELS).map((moduleKey) => {
                                    const moduleData = MODULE_LABELS[moduleKey];
                                    const permRecord = currentRolePerms.find(p => p.module === moduleKey) || {
                                        canRead: isSuperadminSelected,
                                        canCreate: isSuperadminSelected,
                                        canUpdate: isSuperadminSelected,
                                        canDelete: isSuperadminSelected,
                                    };

                                    return (
                                        <div key={moduleKey} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                                            <div className="space-y-0.5 max-w-sm">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight">{moduleData.title}</h3>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal">{moduleData.desc}</p>
                                            </div>

                                            {/* Checklist Switches */}
                                            <div className="grid grid-cols-4 gap-4 sm:gap-6 md:gap-8 justify-items-center bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 md:bg-transparent md:border-none md:p-0">
                                                {/* Read */}
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Read</span>
                                                    <button
                                                        type="button"
                                                        disabled={isSuperadminSelected}
                                                        onClick={() => handleToggle(moduleKey, 'canRead')}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-[#0EA5E9] disabled:opacity-50 disabled:cursor-default ${
                                                            permRecord.canRead ? 'bg-[#0EA5E9]' : 'bg-slate-200 dark:bg-slate-700'
                                                        }`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            permRecord.canRead ? 'translate-x-4' : 'translate-x-0'
                                                        }`} />
                                                    </button>
                                                </div>

                                                {/* Create */}
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Create</span>
                                                    <button
                                                        type="button"
                                                        disabled={isSuperadminSelected}
                                                        onClick={() => handleToggle(moduleKey, 'canCreate')}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-[#0EA5E9] disabled:opacity-50 disabled:cursor-default ${
                                                            permRecord.canCreate ? 'bg-[#0EA5E9]' : 'bg-slate-200 dark:bg-slate-700'
                                                        }`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            permRecord.canCreate ? 'translate-x-4' : 'translate-x-0'
                                                        }`} />
                                                    </button>
                                                </div>

                                                {/* Update */}
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Update</span>
                                                    <button
                                                        type="button"
                                                        disabled={isSuperadminSelected}
                                                        onClick={() => handleToggle(moduleKey, 'canUpdate')}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-[#0EA5E9] disabled:opacity-50 disabled:cursor-default ${
                                                            permRecord.canUpdate ? 'bg-[#0EA5E9]' : 'bg-slate-200 dark:bg-slate-700'
                                                        }`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            permRecord.canUpdate ? 'translate-x-4' : 'translate-x-0'
                                                        }`} />
                                                    </button>
                                                </div>

                                                {/* Delete */}
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Delete</span>
                                                    <button
                                                        type="button"
                                                        disabled={isSuperadminSelected}
                                                        onClick={() => handleToggle(moduleKey, 'canDelete')}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-[#0EA5E9] disabled:opacity-50 disabled:cursor-default ${
                                                            permRecord.canDelete ? 'bg-[#0EA5E9]' : 'bg-slate-200 dark:bg-slate-700'
                                                        }`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            permRecord.canDelete ? 'translate-x-4' : 'translate-x-0'
                                                        }`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Help Banner */}
                            <div className="bg-blue-50/40 dark:bg-blue-950/10 border-t border-slate-200 dark:border-slate-800 p-4 sm:px-6 flex items-start gap-3">
                                <HelpCircle className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-xs">Helpful Hint</h4>
                                    <p className="text-[11px] text-blue-700/80 dark:text-blue-400 leading-normal">
                                        Modifying role permissions affects all active clinic staff belonging to that role group. Changes apply dynamically upon save, but logged-in staff might need to refresh their window or log back in if they have cached views open.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Custom Dialog for Creating Roles */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        <div className="px-6 py-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-3">
                            <div className="bg-[#0EA5E9]/10 rounded-xl p-2 shrink-0">
                                <Plus className="w-5 h-5 text-[#0EA5E9]" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Create Custom Role</h3>
                                <p className="text-xs text-slate-500">Define a new functional group for clinic staff</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateRole} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role Name</label>
                                <Input
                                    placeholder="e.g. LAB_TECHNICIAN"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    required
                                    className="h-10 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9] text-sm uppercase placeholder:normal-case"
                                />
                                <p className="text-[10px] text-slate-400">Uppercase letters, numbers, and underscores only.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                                <Textarea
                                    placeholder="Enter what this role will be responsible for..."
                                    value={newRoleDesc}
                                    onChange={(e) => setNewRoleDesc(e.target.value)}
                                    rows={3}
                                    className="rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9] text-sm"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    className="h-10 px-5 rounded-xl text-sm font-medium border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={creatingRole}
                                    className="h-10 px-6 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                                >
                                    {creatingRole ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Create Role'
                                    )}
                                </Button>
                            </div>
                        </form>

                    </div>
                </div>
            )}
        </div>
    );
}
