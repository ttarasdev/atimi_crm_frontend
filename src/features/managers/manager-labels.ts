import type { Manager } from '@/api/managers/managers.types'

export function managerRoleTitle(role: string) {
    return role === 'admin'
        ? 'Administrator'
        : role === 'manager'
          ? 'Doradca'
          : role === 'sender'
            ? 'Sender'
            : role
}

export const managerStatusLabels: Record<Manager['status'], string> = {
    pending: 'Oczekuje na potwierdzenie',
    active: 'Aktywny',
    blocked: 'Zablokowany',
    archived: 'Archiwalny',
}

export const managerStatusColors: Record<Manager['status'], string> = {
    pending: '#B18B4E',
    active: '#508B77',
    blocked: '#B46F7C',
    archived: '#718095',
}
