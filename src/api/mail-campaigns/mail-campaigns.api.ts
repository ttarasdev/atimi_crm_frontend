import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CampaignAudience,
    CampaignFilterOption,
    CampaignFilterOptionKind,
    CampaignFilters,
    CampaignList,
    CampaignRecipient,
    CampaignsQuery,
    CreateCampaignDto,
    MailCampaign,
} from './mail-campaigns.types'

export const mailCampaignsApi = {
    filterOptions: (
        kind: CampaignFilterOptionKind,
        page: number,
        options?: RequestOptions,
    ) =>
        http.get<CampaignList<CampaignFilterOption>>(
            '/mail-campaigns/filter-options',
            { ...options, query: { kind, page, limit: 100 } },
        ),
    audience: (filters: CampaignFilters, options?: RequestOptions) =>
        http.post<CampaignAudience>(
            '/mail-campaigns/audience',
            { filters },
            options,
        ),
    create: (dto: CreateCampaignDto, options?: RequestOptions) =>
        http.post<MailCampaign>('/mail-campaigns', dto, options),
    list: (query: CampaignsQuery, options?: RequestOptions) =>
        http.get<CampaignList<MailCampaign>>('/mail-campaigns', {
            ...options,
            query: { ...query },
        }),
    get: (id: number, options?: RequestOptions) =>
        http.get<MailCampaign>(`/mail-campaigns/${id}`, options),
    recipients: (id: number, page: number, options?: RequestOptions) =>
        http.get<CampaignList<CampaignRecipient>>(
            `/mail-campaigns/${id}/recipients`,
            { ...options, query: { page, limit: 20 } },
        ),
    cancel: (id: number, options?: RequestOptions) =>
        http.post<MailCampaign>(`/mail-campaigns/${id}/cancel`, {}, options),
}
