'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const router = useRouter();
    const params = useParams();
    const token = params.token as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);

        try {
            await api.post(`/auth/reset-password/${token}`, { password });
            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            console.error('Password reset failed', err);
            setError(err.response?.data?.message || 'Token is invalid or has expired.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950 px-6">
                <div className="w-full max-w-[420px] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                            Password Reset!
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Your password has been successfully updated. Redirecting to login...
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push('/login')}
                        className="w-full h-11 rounded-xl font-bold bg-[#0EA5E9] text-white"
                    >
                        Go to Login Now
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950 px-6">
            <div className="w-full max-w-[420px] space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
                            <ShieldCheck className="h-6 w-6 text-[#0EA5E9]" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                        Create New Password
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Ensure your new password is secure.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] ml-0.5">
                            New Password
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 transition-colors duration-200 group-focus-within:text-[#0EA5E9]">
                                <Lock className="h-4 w-4" />
                            </div>
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11 pl-10 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0EA5E9] transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] ml-0.5">
                            Confirm Password
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 transition-colors duration-200 group-focus-within:text-[#0EA5E9]">
                                <Lock className="h-4 w-4" />
                            </div>
                            <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="h-11 pl-10 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0EA5E9] transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#0EA5E9] to-blue-600 shadow-lg shadow-blue-500/25"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Updating...
                            </span>
                        ) : 'Reset Password'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
