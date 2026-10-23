import { queryOptions } from '@tanstack/react-query'
import { companySettingsApi } from '@/api/company-settings/company-settings.api'

export const companySettingsQueryKey = ['company-settings'] as const

export function companySettingsQueryOptions() {
    return queryOptions({
        queryKey: companySettingsQueryKey,
        queryFn: ({ signal }) => companySettingsApi.get({ signal }),
    })
}
