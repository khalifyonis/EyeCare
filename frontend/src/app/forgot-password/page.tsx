'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft, Loader2, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await api.post('/auth/forgot-password', { email });
            setMessage(response.data.message);
        } catch (err: any) {
            console.error('Password reset request failed', err);
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950 px-6">
            <div className="w-full max-w-[420px] space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
                            <LinkIcon className="h-6 w-6 text-[#0EA5E9]" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                        Forgot Password?
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        No worries, we'll send you reset instructions.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] ml-0.5">
                            Email Address
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 transition-colors duration-200 group-focus-within:text-[#0EA5E9]">
                                <Mail className="h-4 w-4" />
                            </div>
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11 pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl text-sm"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className="p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                            {message}
                        </div>
                    )}

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
                                Sending...
                            </span>
                        ) : 'Reset Password'}
                    </Button>
                </form>

                {/* Back to Login */}
                <div className="text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#0EA5E9] transition-colors duration-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
