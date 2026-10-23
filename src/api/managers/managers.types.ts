export type ManagerRole = 'admin' | 'manager' | 'sender'

export interface Manager {
    id: number
    email: string
    name: string
    surname: string
    phone: string | null
    position: string | null
    avatarId: number | null
    status: 'pending' | 'active' | 'blocked' | 'archived'
    remindersEnabled: boolean
    lastLoginAt: string | null
    createdAt: string
    updatedAt: string
    roles: { id: number; name: ManagerRole }[]
}

export interface UpdateManagerDto {
    name?: string
    surname?: string
    phone?: string | null
    position?: string | null
    remindersEnabled?: boolean
    avatarId?: number
}

export interface CreateManagerDto {
    roleNames?: ManagerRole[]
    email: string
    password: string
    name: string
    surname: string
}

export interface CreateManagerResponse {
    id: number
    email: string
    status: Manager['status']
}

export interface ManagersQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    status?: Manager['status']
    roleId?: number
}

export interface ManagersPage {
    rows: Manager[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface RolesPage {
    rows: Manager['roles']
    total: number
    page: number
    limit: number
    offset: number
}
