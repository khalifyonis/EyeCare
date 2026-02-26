'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { username, password });
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            // Set cookie for middleware (7 days)
            document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;

            router.push(`/dashboard/${user.role.toLowerCase()}`);
        } catch (err: any) {
            console.error('Login failed', err);
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid h-screen w-full grid-cols-1 md:grid-cols-2 overflow-hidden bg-white dark:bg-slate-950">

            {/* ── Branding Pane ── */}
            <div className="relative hidden md:flex flex-col items-center justify-center mesh-gradient p-8 lg:p-12 text-white overflow-hidden animate-in fade-in slide-in-from-left-full duration-1000 ease-in-out">
                {/* Ambient glows */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(14,165,233,0.3)_0%,transparent_70%)] pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 size-[500px] bg-[#0EA5E9]/20 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[12000ms]" />
                <div className="absolute -top-32 -right-32 size-[500px] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />

                {/* Grid overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgY3g9IjEiIGN5PSIxIiByPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20 pointer-events-none" />

                {/* Logo */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl animate-in fade-in zoom-in duration-1200 ease-out">
                    <div className="group relative transition-all duration-1000 hover:scale-[1.02] flex items-center justify-center">
                        <div className="absolute inset-0 bg-white/10 blur-[100px] rounded-full group-hover:bg-white/20 transition-all duration-1000" />
                        <img
                            src="/logo.svg"
                            alt="Al-Ixsaan Eye Hospital"
                            className="h-auto max-h-[65vh] w-auto drop-shadow-[0_0_100px_rgba(14,165,233,0.4)] relative z-10"
                        />
                    </div>
                </div>

                {/* Footer — improved contrast + centering */}
                <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center py-5 border-t border-white/10">
                    <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.35em] text-center">
                        © 2026 Al-Ixsaan Medical Group
                    </p>
                </div>
            </div>

            {/* ── Login Pane ── */}
            <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-950 px-6 md:px-12 lg:px-20 animate-in fade-in slide-in-from-right-full duration-1000 ease-in-out">
                <div className="w-full max-w-[420px] space-y-8 mt-4">

                    {/* Mobile logo */}
                    <div className="flex md:hidden flex-col items-center justify-center mb-6 animate-in fade-in slide-in-from-top-4 duration-1000">
                        <img src="/logo.svg" alt="Al-Ixsaan Logo" className="h-28 w-auto mb-4" />
                        <div className="h-1 w-12 bg-[#0EA5E9] rounded-full shadow-lg shadow-blue-500/20" />
                    </div>

                    {/* Header */}
                    <div className="text-center lg:text-left">
                        <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0EA5E9]/10">
                                <ShieldCheck className="h-4 w-4 text-[#0EA5E9]" />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-[#0EA5E9]">
                                Secure Portal
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                            Welcome Back
                        </h1>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Username */}
                        <div className="space-y-1.5">
                            <label
                                className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] ml-0.5"
                                htmlFor="username"
                            >
                                Username
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 transition-colors duration-200 group-focus-within:text-[#0EA5E9]">
                                    <User className="h-4 w-4" />
                                </div>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="h-11 pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/40 focus-visible:border-[#0EA5E9] transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label
                                className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] ml-0.5"
                                htmlFor="password"
                            >
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 transition-colors duration-200 group-focus-within:text-[#0EA5E9]">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11 pl-10 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/40 focus-visible:border-[#0EA5E9] transition-all duration-200"
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

                        {/* Error message */}
                        {error && (
                            <div className="flex items-start gap-3 p-3.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Forgot password */}
                        <div className="flex justify-end -mt-1">
                            <Link
                                href="/forgot-password"
                                className="text-xs text-slate-400 hover:text-[#0EA5E9] font-medium transition-colors duration-200"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit button — gradient + shadow + loading state */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#0EA5E9] to-blue-600 hover:from-[#0c96d4] hover:to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Authenticating...
                                </span>
                            ) : (
                                'Login'
                            )}
                        </Button>
                    </form>

                </div>
            </div>
        </div>
    );
}
