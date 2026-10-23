import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CreateTaskTypeDto,
    TaskType,
    TaskTypesListResponse,
    TaskTypesQuery,
    UpdateTaskTypeDto,
} from './task-types.types'

const BASE = '/task-types'

function typePath(id: number): string {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        throw new RangeError('A positive task type ID is required')
    }

    return `${BASE}/${id}`
}

export const taskTypesApi = {
    list: (query: TaskTypesQuery = {}, options?: RequestOptions) =>
        http.get<TaskTypesListResponse>(BASE, {
            ...options,
            query: { ...query },
        }),

    create: (dto: CreateTaskTypeDto, options?: RequestOptions) =>
        http.post<TaskType>(BASE, dto, options),

    update: (id: number, dto: UpdateTaskTypeDto, options?: RequestOptions) =>
        http.patch<TaskType>(typePath(id), dto, options),
}
