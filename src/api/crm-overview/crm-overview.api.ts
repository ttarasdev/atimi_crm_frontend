import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CrmOverview,
    CrmTasksPage,
    CrmTasksQuery,
    CrmStatistics,
    OverviewQuery,
} from './crm-overview.types'

export const crmOverviewApi = {
    tasks: (query: CrmTasksQuery = {}, options?: RequestOptions) =>
        http.get<CrmTasksPage>('/crm-overview/tasks', {
            ...options,
            query: { ...query },
        }),
    me: (options?: RequestOptions) =>
        http.get<CrmOverview>('/crm-overview/me', options),
    statistics: (query: OverviewQuery = {}, options?: RequestOptions) =>
        http.get<CrmStatistics>('/crm-overview/statistics', {
            ...options,
            query: { ...query },
        }),
}
