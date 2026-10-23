import type { TaskType } from '@/api/task-types/task-types.types'

export interface StageTemplateTask {
    id: number
    stageTemplateId: number
    taskTypeId: number
    title: string
    description: string | null
    sortKey: number
    createdAt: string
    updatedAt: string
    taskType?: TaskType
}

export interface StageTemplateTasksQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
}

export interface StageTemplateTasksListResponse {
    rows: StageTemplateTask[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateStageTemplateTaskDto {
    title: string
    description?: string | null
    taskTypeId?: number
}

export type UpdateStageTemplateTaskDto = Partial<CreateStageTemplateTaskDto>

export interface ReorderStageTemplateTaskDto {
    direction: 'up' | 'down'
}
