'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Building2, ArrowRight } from 'lucide-react';

interface BranchSelectorDialogProps {
    open: boolean;
    branches: any[];
    onSelect: (branch: any) => void;
}

export function BranchSelectorDialog({ open, branches, onSelect }: BranchSelectorDialogProps) {
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

    const handleConfirm = () => {
        const branch = branches.find(b => b.id === selectedBranchId);
        if (branch) {
            onSelect(branch);
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[450px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-[#0EA5E9] to-blue-700 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Building2 size={120} />
                    </div>
                    <DialogHeader className="relative z-10 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
                                <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                                Workplace Selection
                            </span>
                        </div>
                        <DialogTitle className="text-3xl font-black leading-none tracking-tight">Select Branch</DialogTitle>
                        <DialogDescription className="text-white/80 font-medium text-sm">
                            Choose the clinic branch you are working from today.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 bg-white dark:bg-slate-950">
                    <div className="space-y-3 mb-8">
                        {branches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranchId(branch.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 group ${selectedBranchId === branch.id
                                        ? 'border-[#0EA5E9] bg-blue-50/50 shadow-md shadow-blue-500/5'
                                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200 ${selectedBranchId === branch.id
                                            ? 'bg-[#0EA5E9] text-white'
                                            : 'bg-slate-100 dark:bg-slate-900 text-slate-400 group-hover:text-slate-600'
                                        }`}>
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-bold transition-colors ${selectedBranchId === branch.id ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'
                                            }`}>
                                            {branch.branchName}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                                            {branch.address}
                                        </p>
                                    </div>
                                </div>
                                {selectedBranchId === branch.id && (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0EA5E9] text-white animate-in zoom-in duration-300">
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedBranchId}
                        className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-gradient-to-r from-[#0EA5E9] to-blue-600 hover:from-[#0c96d4] hover:to-blue-700 shadow-xl shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                    >
                        Continue to Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
