'use client'

import { useQuery } from '@tanstack/react-query'
import type {
    CrmTasksQuery,
    OverviewQuery,
} from '@/api/crm-overview/crm-overview.types'
import {
    crmOverviewQueryOptions,
    crmTasksQueryOptions,
    crmStatisticsQueryOptions,
} from '@/shared/query/crm-overview-query'

export function useCrmOverview() {
    return useQuery(crmOverviewQueryOptions())
}

export function useCrmStatistics(query: OverviewQuery = {}, enabled = true) {
    return useQuery({ ...crmStatisticsQueryOptions(query), enabled })
}

export function useCrmTasks(query: CrmTasksQuery = {}) {
    return useQuery(crmTasksQueryOptions(query))
}
