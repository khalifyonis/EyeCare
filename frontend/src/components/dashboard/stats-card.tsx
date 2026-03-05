import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose';
    trend?: {
        value: string;
        isUp: boolean;
    };
}

const colorStyles = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
};

export function StatsCard({ title, value, icon: Icon, color, trend }: StatsCardProps) {
    return (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300">
            <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
                        {trend && (
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${colorStyles[color]}`}>
                                    {trend.value}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300 ${colorStyles[color]}`}>
                        <Icon strokeWidth={2.5} size={20} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
