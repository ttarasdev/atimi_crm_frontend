import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type { SaveTaskDto, Task, TasksPage, TasksQuery } from './tasks.types'

export const tasksApi = {
    list: (query: TasksQuery = {}, options?: RequestOptions) =>
        http.get<TasksPage>('/tasks', { ...options, query: { ...query } }),
    get: (id: number, options?: RequestOptions) =>
        http.get<Task>(`/tasks/${id}`, options),
    create: (dto: SaveTaskDto, options?: RequestOptions) =>
        http.post<Task>('/tasks', dto, options),
    update: (id: number, dto: SaveTaskDto, options?: RequestOptions) =>
        http.patch<Task>(`/tasks/${id}`, dto, options),
    remove: (id: number, options?: RequestOptions) =>
        http.delete<{ success: true }>(`/tasks/${id}`, options),
}
