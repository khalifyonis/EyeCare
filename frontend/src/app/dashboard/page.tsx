'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRoot() {
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
            return;
        }

        try {
            const user = JSON.parse(storedUser);
            const role = (user.roleName || user.role || 'user').toLowerCase();

            // Map common roles to their dashboard paths
            // If the role-based dashboard is at /dashboard/[role]/page.tsx,
            // we redirect to /dashboard/admin, /dashboard/doctor, etc.
            router.replace(`/dashboard/${role}`);
        } catch (error) {
            console.error('Failed to parse user for redirection', error);
            router.push('/login');
        }
    }, [router]);

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0EA5E9] border-t-transparent"></div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                    Loading your dashboard...
                </p>
            </div>
        </div>
    );
}
