'use client'

import { useParams } from 'next/navigation'
import { DashboardHome } from '../_components/dashboard-home'
import { DoctorDashboard } from '../_components/doctor-dashboard'
import { ReceptionistDashboard } from '../_components/receptionist-dashboard'
import { PharmacistDashboard } from '../_components/pharmacist-dashboard'
import { OpticianDashboard } from '../_components/optician-dashboard'

const dashboardMap: Record<string, React.ComponentType> = {
    doctor: DoctorDashboard,
    receptionist: ReceptionistDashboard,
    pharmacist: PharmacistDashboard,
    optician: OpticianDashboard,
}

export default function RoleDashboardPage() {
    const params = useParams()
    const role = typeof params.role === 'string' ? params.role.toLowerCase() : ''
    const Component = dashboardMap[role] ?? DashboardHome

    return <Component />
}
