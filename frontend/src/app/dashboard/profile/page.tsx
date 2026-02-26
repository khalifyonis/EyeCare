'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, Mail, User, ShieldCheck, Loader2, Check, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter(); // Initialize useRouter

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
        router.push('/login');
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/auth/me');
                const userData = {
                    ...response.data,
                    role: response.data.role?.name || response.data.role // Handle both nested and flat role
                };
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
            } catch (error: any) {
                console.error('Failed to fetch profile', error);

                if (error.response?.status === 404 || error.response?.status === 401) {
                    toast.error('Session invalid. Please login again.');
                    handleLogout();
                } else {
                    // Fallback only for network errors, not for "Not Found"
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
            toast.error('Only JPG and PNG images are allowed');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const response = await api.post(`/users/${user.id}/profile-image`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const updatedUser = { ...user, profileImage: response.data.profileImage };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));

            toast.success('Profile picture updated!');

            // Refresh the page to ensure sidebar and header reflect the change immediately
            setTimeout(() => {
                window.location.reload();
            }, 800);
        } catch (error: any) {
            console.error('Upload failed', error);
            toast.error(error.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
            </div>
        );
    }

    if (!user) return null;

    const initials = user.fullName?.charAt(0)?.toUpperCase() || 'U';
    const profileImageUrl = user.profileImage
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${user.profileImage}`
        : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Profile</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your personal information and profile picture.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Avatar Card */}
                <Card className="md:col-span-1 overflow-hidden shadow-xl border-blue-100/50 dark:border-slate-800">
                    <CardContent className="pt-8 pb-6 text-center space-y-4">
                        <div className="relative inline-block group">
                            <div className="size-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] shadow-2xl flex items-center justify-center">
                                {profileImageUrl ? (
                                    <img src={profileImageUrl} alt={user.fullName} className="size-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-white">{initials}</span>
                                )}
                            </div>
                            <button
                                onClick={handleUploadClick}
                                disabled={uploading}
                                className="absolute bottom-1 right-1 p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-[#0EA5E9] hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-200 active:scale-90 disabled:opacity-50"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/png, image/jpeg, image/jpg"
                            />
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{user.fullName}</h2>
                            <p className="text-xs font-black uppercase tracking-widest text-[#0EA5E9]">{user.role}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: User Info */}
                <Card className="md:col-span-2 shadow-xl border-blue-100/50 dark:border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Personal Information</CardTitle>
                        <CardDescription>View and manage your account details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                                    <User className="w-4 h-4 text-[#0EA5E9]" />
                                    <span className="text-sm font-medium">{user.fullName}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Username</label>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                                    <ShieldCheck className="w-4 h-4 text-[#0EA5E9]" />
                                    <span className="text-sm font-medium">{user.username}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                                    <Mail className="w-4 h-4 text-[#0EA5E9]" />
                                    <span className="text-sm font-medium">{user.email}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</label>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 uppercase tracking-tight">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-bold text-emerald-600">{user.role}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <Button variant="outline" className="rounded-xl" onClick={() => toast.info('Profile editing is restricted to admin')}>
                                Request Data Update
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
