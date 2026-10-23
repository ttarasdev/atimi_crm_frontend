import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    Partner,
    PartnersQuery,
    PartnersList,
    CreatePartnerDto,
    UpdatePartnerDto,
} from './partners.types'

export const partnersApi = {
    get: (id: number, options?: RequestOptions) =>
        http.get<Partner>(`/partners/${id}`, options),
    list: (query: PartnersQuery = {}, options?: RequestOptions) =>
        http.get<PartnersList>('/partners', {
            ...options,
            query: { ...query },
        }),
    create: (dto: CreatePartnerDto, options?: RequestOptions) =>
        http.post<Partner>('/partners', dto, options),
    update: (id: number, dto: UpdatePartnerDto, options?: RequestOptions) =>
        http.patch<Partner>(`/partners/${id}`, dto, options),
}
