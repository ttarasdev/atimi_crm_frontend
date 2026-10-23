import type { PublicAsset } from '@/api/public-assets/public-assets.types'

export interface TaskType {
    id: number
    name: string
    iconId: number
    color: string
    reminderMinutes: number[]
    isActive: boolean
    isDefault: boolean
    createdAt: string
    updatedAt: string
    icon?: PublicAsset
}

export interface TaskTypesQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    isActive?: boolean
}

export interface TaskTypesListResponse {
    rows: TaskType[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateTaskTypeDto {
    name: string
    iconId: number
    color: string
    reminderMinutes: number[]
    isActive?: boolean
}

export type UpdateTaskTypeDto = Partial<CreateTaskTypeDto>
