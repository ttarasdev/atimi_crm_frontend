import type { Metadata } from 'next'
import { EmployeesPage } from '@/features/managers/employees-page/EmployeesPage'
import { RoleGuard } from '@/shared/guards/RoleGuard'

export const metadata: Metadata = { title: 'Pracownicy' }

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ managerId?: string | string[] }>
}) {
    const { managerId } = await searchParams

    const id =
        typeof managerId === 'string' &&
        /^[1-9]\d*$/.test(managerId) &&
        Number(managerId) <= 2147483647
            ? Number(managerId)
            : undefined

    return (
        <RoleGuard allowedRoles={['admin']}>
            <EmployeesPage key={id ?? 'list'} initialManagerId={id} />
        </RoleGuard>
    )
}
