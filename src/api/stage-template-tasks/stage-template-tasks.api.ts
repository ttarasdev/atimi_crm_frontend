import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CreateStageTemplateTaskDto,
    ReorderStageTemplateTaskDto,
    StageTemplateTask,
    StageTemplateTasksListResponse,
    StageTemplateTasksQuery,
    UpdateStageTemplateTaskDto,
} from './stage-template-tasks.types'

function tasksPath(templateId: number, id?: number): string {
    if (
        [templateId, ...(id === undefined ? [] : [id])].some(
            (value) =>
                !Number.isSafeInteger(value) || value < 1 || value > 2147483647,
        )
    ) {
        throw new RangeError(
            'Positive stage template and task IDs are required',
        )
    }

    return `/stage-templates/${templateId}/tasks${id === undefined ? '' : `/${id}`}`
}

export const stageTemplateTasksApi = {
    list: (
        templateId: number,
        query: StageTemplateTasksQuery = {},
        options?: RequestOptions,
    ) =>
        http.get<StageTemplateTasksListResponse>(tasksPath(templateId), {
            ...options,
            query: { ...query },
        }),

    create: (
        templateId: number,
        dto: CreateStageTemplateTaskDto,
        options?: RequestOptions,
    ) => http.post<StageTemplateTask>(tasksPath(templateId), dto, options),

    update: (
        templateId: number,
        id: number,
        dto: UpdateStageTemplateTaskDto,
        options?: RequestOptions,
    ) => http.patch<StageTemplateTask>(tasksPath(templateId, id), dto, options),

    delete: (templateId: number, id: number, options?: RequestOptions) =>
        http.delete<{ success: boolean }>(tasksPath(templateId, id), options),

    reorder: (
        templateId: number,
        id: number,
        dto: ReorderStageTemplateTaskDto,
        options?: RequestOptions,
    ) =>
        http.patch<StageTemplateTask[]>(
            `${tasksPath(templateId, id)}/order`,
            dto,
            options,
        ),
}
