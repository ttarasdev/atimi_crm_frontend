import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    ConvertLeadDto,
    ConvertLeadResponse,
    CreateLeadDto,
    Lead,
    LeadsListResponse,
    LeadsQuery,
    UpdateLeadDto,
} from './leads.types'

function leadPath(id: number) {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647)
        throw new RangeError('A positive lead ID is required')

    return `/leads/${id}`
}

export const leadsApi = {
    list: (query: LeadsQuery = {}, options?: RequestOptions) =>
        http.get<LeadsListResponse>('/leads', {
            ...options,
            query: { ...query },
        }),
    getById: (id: number, options?: RequestOptions) =>
        http.get<Lead>(leadPath(id), options),
    create: (dto: CreateLeadDto, options?: RequestOptions) =>
        http.post<Lead>('/leads', dto, options),
    update: (id: number, dto: UpdateLeadDto, options?: RequestOptions) =>
        http.patch<Lead>(leadPath(id), dto, options),
    convert: (id: number, dto: ConvertLeadDto, options?: RequestOptions) =>
        http.post<ConvertLeadResponse>(`${leadPath(id)}/convert`, dto, options),
}
