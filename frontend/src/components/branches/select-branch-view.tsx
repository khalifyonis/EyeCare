'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { MapPin, Building2, ArrowRight } from 'lucide-react'
import { getDefaultDashboardPath, readStoredUser, resolveRoleName, type BranchSummary, type StoredUser } from '@/lib/auth'
import { persistActiveBranch } from '@/lib/branches'

export function SelectBranchView() {
    const router = useRouter()
    const [branches, setBranches] = useState<BranchSummary[]>([])
    const [user, setUser] = useState<StoredUser | null>(null)

    useEffect(() => {
        const storedUser = readStoredUser()

        if (!storedUser) {
            router.replace('/login')
            return
        }

        const availableBranches = storedUser.branches || []

        if (!availableBranches.length) {
            router.replace('/login')
            return
        }

        setBranches(availableBranches)
        setUser(storedUser)
    }, [router])

    const handleSelect = (branchId: string) => {
        if (!user) return

        const { nextUser } = persistActiveBranch(user, branchId)
        const role = resolveRoleName(nextUser)
        router.push(getDefaultDashboardPath(role))
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Select Branch</h1>
                    <p className="text-muted-foreground">
                        Welcome back, {user?.fullName}. Please select a branch to continue.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {branches.map((branch) => (
                        <Card
                            key={branch.id}
                            className="group cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg"
                            onClick={() => handleSelect(branch.id)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div>
                                    <CardTitle className="text-lg font-bold">{branch.branchName}</CardTitle>
                                    {branch.address ? (
                                        <CardDescription className="mt-1 truncate">{branch.address}</CardDescription>
                                    ) : null}
                                </div>
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Building2 size={20} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-muted-foreground mt-2">
                                    <MapPin size={14} className="mr-1" />
                                    <span>{branch.address || 'Main Hospital Location'}</span>
                                </div>
                                {branch.isPrimary && (
                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary mt-4">
                                        Primary Branch
                                    </span>
                                )}
                                <div className="mt-6 flex items-center text-sm font-semibold text-primary">
                                    Enter Dashboard <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
