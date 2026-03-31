'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarPlus, Calendar, Clock, Loader2 } from 'lucide-react';

type Apt = {
    id: string; appointmentDate: string; status: string;
    type?: string | null; bookingNumber?: string | null;
    patient?: { fullName?: string | null } | null;
    doctor?: { user?: { fullName?: string | null } | null } | null;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const pill: Record<string, string> = { CONFIRMED:'bg-emerald-100 text-emerald-700', COMPLETED:'bg-blue-100 text-blue-700', PENDING:'bg-amber-100 text-amber-700', SCHEDULED:'bg-slate-100 text-slate-600', CANCELLED:'bg-red-100 text-red-700' };
function dk(d: Date) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

export default function CalendarPage() {
    const router = useRouter();
    const today = useMemo(() => new Date(), []);
    const [cur, setCur] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [apts, setApts] = useState<Apt[]>([]);
    const [loading, setLoading] = useState(true);
    const [sel, setSel] = useState<string | null>(null);

    const y = cur.getFullYear(), m = cur.getMonth();
    const fd = new Date(y, m, 1).getDay();
    const dim = new Date(y, m+1, 0).getDate();
    const tk = dk(today);

    const fetchApts = useCallback(async () => {
        setLoading(true);
        const from = y + '-' + String(m+1).padStart(2,'0') + '-01';
        const to = y + '-' + String(m+1).padStart(2,'0') + '-' + String(dim).padStart(2,'0');
        try {
            const r = await api.get('/appointments', { params: { from, to, limit: 200 } });
            setApts(Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []);
        } catch { setApts([]); }
        finally { setLoading(false); }
    }, [y, m, dim]);

    useEffect(() => { fetchApts(); }, [fetchApts]);

    const grp = useMemo(() => {
        const map: Record<string, Apt[]> = {};
        apts.forEach(a => { const k = dk(new Date(a.appointmentDate)); if (!map[k]) map[k]=[]; map[k].push(a); });
        return map;
    }, [apts]);

    const stats = useMemo(() => {
        let total=0, confirmed=0, pending=0, cancelled=0;
        apts.forEach(a => { total++; const s=(a.status||'').toUpperCase(); if(s==='CONFIRMED')confirmed++; else if(s==='PENDING'||s==='SCHEDULED')pending++; else if(s==='CANCELLED')cancelled++; });
        return { total, confirmed, pending, cancelled };
    }, [apts]);

    const cells: (number|null)[] = [];
    for (let i=0; i<fd; i++) cells.push(null);
    for (let d=1; d<=dim; d++) cells.push(d);
    while (cells.length%7!==0) cells.push(null);

    const selApts = sel ? (grp[sel]||[]) : [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Calendar</h1>
                <p className="text-sm text-slate-400 mt-0.5">View and manage appointments in calendar format</p>
            </div>
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl px-6 py-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCur(new Date(y,m-1,1))} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={() => setCur(new Date(y,m+1,1))} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    <h2 className="text-lg font-bold text-white">{MONTHS[m]} {y}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-white border-white/40 bg-white/10 hover:bg-white/20 font-semibold text-xs h-8" onClick={() => { setCur(new Date(today.getFullYear(),today.getMonth(),1)); setSel(tk); }}>Today</Button>
                        <Button size="sm" className="bg-white text-blue-700 hover:bg-white/90 font-semibold text-xs h-8 gap-1.5" onClick={() => router.push('/dashboard/appointments/new')}><CalendarPlus className="w-3.5 h-3.5" /> New Appointment</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                    <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                        ) : (<>
                            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
                                {DAYS.map(d => <div key={d} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7">
                                {cells.map((day, i) => {
                                    if (day===null) return <div key={'e'+i} className="min-h-[100px] border-b border-r border-slate-50 dark:border-slate-800/50 bg-slate-50/30" />;
                                    const key = y + '-' + String(m+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
                                    const isToday = key===tk, isSel = key===sel;
                                    const da = grp[key]||[];
                                    return (
                                        <button key={key} onClick={() => { setSel(key); if(da.length===0) router.push('/dashboard/appointments/new'); }}
                                            className={'min-h-[100px] p-1.5 border-b border-r border-slate-50 dark:border-slate-800/50 text-left transition-all hover:bg-blue-50/50' + (isSel?' ring-2 ring-inset ring-blue-500':'')}>
                                            <div className="flex items-center gap-1 mb-1">
                                                <span className={'inline-flex items-center justify-center text-xs font-bold w-7 h-7 rounded-full ' + (isToday?'bg-blue-600 text-white':'text-slate-700 dark:text-slate-300')}>{day}</span>
                                                {da.length>0 && <span className="text-[10px] font-bold text-slate-400">{da.length}</span>}
                                            </div>
                                            <div className="space-y-0.5">
                                                {da.slice(0,2).map(a => {
                                                    const t=new Date(a.appointmentDate);
                                                    const tm=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
                                                    const nm=a.patient?.fullName?.split(' ')[0]||'';
                                                    const cls=pill[(a.status||'PENDING').toUpperCase()]||pill.PENDING;
                                                    return <div key={a.id} className={'text-[10px] font-semibold px-1.5 py-0.5 rounded truncate '+cls}>{tm} {nm.slice(0,6)}{nm.length>6?'...':''}</div>;
                                                })}
                                                {da.length>2 && <p className="text-[10px] text-slate-400 font-medium px-1">+{da.length-2} more</p>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-5 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"/><span className="text-xs text-slate-500 font-medium">Confirmed</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"/><span className="text-xs text-slate-500 font-medium">Pending</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"/><span className="text-xs text-slate-500 font-medium">Cancelled</span></div>
                            </div>
                        </>)}
                    </div>

                    <div className="space-y-5">
                        <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5"/><h3 className="text-sm font-bold">Select A Date</h3></div>
                            {sel && selApts.length>0 ? (
                                <div className="space-y-2 mt-3">
                                    {selApts.map(a => {
                                        const t=new Date(a.appointmentDate);
                                        return (
                                            <div key={a.id} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 space-y-1">
                                                <p className="text-xs font-bold">{a.patient?.fullName||'Unknown'}</p>
                                                <div className="flex items-center gap-1 text-[10px] text-white/80"><Clock className="w-3 h-3"/>{t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
                                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 uppercase">{a.status}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-6 opacity-80">
                                    <Calendar className="w-10 h-10 mb-2 opacity-50"/><p className="text-xs text-center">Click on a date to view appointments</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">This Month</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-emerald-600">{stats.total}</p><p className="text-xs font-medium text-slate-500 mt-1">Total</p></div>
                                <div className="bg-emerald-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-emerald-600">{stats.confirmed}</p><p className="text-xs font-medium text-slate-500 mt-1">Confirmed</p></div>
                                <div className="bg-amber-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-amber-600">{stats.pending}</p><p className="text-xs font-medium text-slate-500 mt-1">Pending</p></div>
                                <div className="bg-red-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-red-600">{stats.cancelled}</p><p className="text-xs font-medium text-slate-500 mt-1">Cancelled</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
