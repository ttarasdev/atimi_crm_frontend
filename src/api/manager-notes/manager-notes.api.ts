import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CreateManagerNoteDto,
    ManagerNote,
    ManagerNotesListResponse,
    ManagerNotesQuery,
    UpdateManagerNoteDto,
} from './manager-notes.types'

export const managerNotesApi = {
    list: (query: ManagerNotesQuery = {}, options?: RequestOptions) =>
        http.get<ManagerNotesListResponse>('/manager-notes', {
            ...options,
            query: { ...query },
        }),
    get: (id: number, options?: RequestOptions) =>
        http.get<ManagerNote>(`/manager-notes/${id}`, options),
    create: (dto: CreateManagerNoteDto, options?: RequestOptions) =>
        http.post<ManagerNote>('/manager-notes', dto, options),
    update: (id: number, dto: UpdateManagerNoteDto, options?: RequestOptions) =>
        http.patch<ManagerNote>(`/manager-notes/${id}`, dto, options),
    delete: (id: number, options?: RequestOptions) =>
        http.delete<{ success: true }>(`/manager-notes/${id}`, options),
}
