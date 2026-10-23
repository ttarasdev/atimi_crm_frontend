import { http } from '../http'
import type { RequestOptions } from '../http.types'
import type {
    Manager,
    ManagersPage,
    ManagersQuery,
    RolesPage,
    UpdateManagerDto,
    CreateManagerDto,
    CreateManagerResponse,
} from './managers.types'

export const managersApi = {
    create: (dto: CreateManagerDto, options?: RequestOptions) =>
        http.post<CreateManagerResponse>(
            '/manager-auth/managers',
            dto,
            options,
        ),
    list: (query: ManagersQuery = {}, options?: RequestOptions) =>
        http.get<ManagersPage>('/managers', {
            ...options,
            query: { ...query },
        }),

    getById: (id: number, options?: RequestOptions) =>
        http.get<Manager>(`/managers/${id}`, options),

    update: (id: number, dto: UpdateManagerDto, options?: RequestOptions) =>
        http.patch<Manager>(`/managers/${id}`, dto, options),

    setStatus: (
        id: number,
        status: Manager['status'],
        options?: RequestOptions,
    ) => http.patch<Manager>(`/managers/${id}/status`, { status }, options),

    setRoles: (id: number, roleIds: number[], options?: RequestOptions) =>
        http.patch<Manager>(`/managers/${id}/roles`, { roleIds }, options),

    roles: (options?: RequestOptions) =>
        http.get<RolesPage>('/roles', { ...options, query: { limit: 100 } }),

    getMe: (options?: RequestOptions) =>
        http.get<Manager>('/managers/me', options),

    updateMe: (dto: UpdateManagerDto, options?: RequestOptions) =>
        http.patch<Manager>('/managers/me', dto, options),

    uploadMyAvatar: (file: File, options?: RequestOptions) => {
        const form = new FormData()

        form.append('file', file)

        return http.post<Manager>('/managers/me/avatar', form, options)
    },

    removeMyAvatar: (options?: RequestOptions) =>
        http.delete<Manager>('/managers/me/avatar', options),
}
