'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, User, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', {
                username,
                password,
            });

            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            document.cookie = `token=${token}; path=/; max-age=3600; SameSite=Strict`;

            const userRole = user.role.toLowerCase();
            router.push(`/dashboard/${userRole}`);
        } catch (err: any) {
            console.error('Login failed', err);
            setError(err.response?.data?.message || 'Invalid credentials or server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full flex-col lg:flex-row overflow-hidden bg-white dark:bg-slate-950">
            {/* Branding Pane - Exact Brand orange  (##F7931E) */}
            <div className="relative flex w-full lg:w-1/2 flex-col items-center justify-center bg-[#F7931E] p-8 lg:p-12 text-white">
                <div className="relative z-10 flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-1000 ease-out">
                    {/* Al-Ixsaan Logo */}
                    <div className="group relative transition-all duration-500 hover:scale-[1.02]">
                        <img
                            src="/img/lg.png"
                            alt="Al-Ixsaan Eye Hospital"
                            className="h-64 lg:h-[480px] w-auto drop-shadow-2xl"
                        />
                    </div>
                </div>

                {/* Minimal Footer */}
                <div className="absolute bottom-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                    &copy; 2026 Al-Ixsaan Medical Group
                </div>
            </div>

            {/* Login Pane - Equal Width (50%) */}
            <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white dark:bg-slate-950 p-8 lg:p-16">
                <div className="w-full max-w-[400px] space-y-12 animate-in slide-in-from-right-8 duration-700 ease-out">
                    <div className="space-y-4 text-center lg:text-left">
                        <h2 className="text-5xl font-black tracking-tighter text-[#F7931E] dark:text-white">Login</h2>
                        <div className="h-2 w-16 bg-[#F7931E] rounded-full mx-auto lg:mx-0 shadow-lg shadow-orange-500/20" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1" htmlFor="username">
                                    Username
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-[#F7931E]">
                                        <User className="size-5" />
                                    </div>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="h-15 pl-12 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-orange-500/10 focus:border-[#F7931E] transition-all text-base rounded-2xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]" htmlFor="password">
                                        Password
                                    </label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-[#F7931E]">
                                        <Lock className="size-5" />
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-15 pl-12 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-orange-500/10 focus:border-[#F7931E] transition-all text-base rounded-2xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl animate-in shake-in duration-300">
                                <p className="flex items-center gap-3">
                                    <span className="size-2 rounded-full bg-red-600 block shrink-0" />
                                    {error}
                                </p>
                            </div>
                        )}

                        <Button
                            className="w-full h-15 bg-[#F7931E] hover:bg-[#D97706] text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.97] disabled:opacity-70"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="size-5 animate-spin" />
                                    <span>Logging in...</span>
                                </div>
                            ) : 'Login'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
