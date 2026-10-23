import { queryOptions } from '@tanstack/react-query'
import { crmOverviewApi } from '@/api/crm-overview/crm-overview.api'
import type {
    CrmTasksQuery,
    OverviewQuery,
} from '@/api/crm-overview/crm-overview.types'

export const crmOverviewQueryKeys = {
    all: ['crm-overview'] as const,
    me: ['crm-overview', 'me'] as const,
    tasks: (query: CrmTasksQuery) => ['crm-overview', 'tasks', query] as const,
    statistics: (query: OverviewQuery) =>
        ['crm-overview', 'statistics', query] as const,
}

export function crmOverviewQueryOptions() {
    return queryOptions({
        queryKey: crmOverviewQueryKeys.me,
        queryFn: ({ signal }) => crmOverviewApi.me({ signal }),
        staleTime: 15_000,
    })
}

export function crmStatisticsQueryOptions(query: OverviewQuery = {}) {
    return queryOptions({
        queryKey: crmOverviewQueryKeys.statistics(query),
        queryFn: ({ signal }) => crmOverviewApi.statistics(query, { signal }),
        staleTime: 15_000,
    })
}

export function crmTasksQueryOptions(query: CrmTasksQuery = {}) {
    return queryOptions({
        queryKey: crmOverviewQueryKeys.tasks(query),
        queryFn: ({ signal }) => crmOverviewApi.tasks(query, { signal }),
        staleTime: 15_000,
    })
}
