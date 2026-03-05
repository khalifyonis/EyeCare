'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Building2, ArrowRight } from 'lucide-react'

interface Branch {
    id: string
    branchName: string
    isPrimary: boolean
}

export default function SelectBranchPage() {
    const router = useRouter()
    const [branches, setBranches] = useState<Branch[]>([])
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const storedBranches = localStorage.getItem('branches')
        const storedUser = localStorage.getItem('user')

        if (!storedBranches || !storedUser) {
            router.push('/login')
            return
        }

        setBranches(JSON.parse(storedBranches))
        setUser(JSON.parse(storedUser))
    }, [router])

    const handleSelect = (branchId: string) => {
        // In a real app, you might want to call an API to update the active branch in the session
        // For now, we update local storage and redirect
        localStorage.setItem('activeBranchId', branchId)
        const dashboardPath = user.roleName.toLowerCase()
        router.push(`/dashboard/${dashboardPath}`)
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
                                <CardTitle className="text-lg font-bold">{branch.branchName}</CardTitle>
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Building2 size={20} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-muted-foreground mt-2">
                                    <MapPin size={14} className="mr-1" />
                                    <span>Main Hospital Location</span>
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
