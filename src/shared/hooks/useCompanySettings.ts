'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companySettingsApi } from '@/api/company-settings/company-settings.api'
import type { UpdateCompanySettingsDto } from '@/api/company-settings/company-settings.types'
import {
    companySettingsQueryKey,
    companySettingsQueryOptions,
} from '@/shared/query/company-settings-query'

export function useCompanySettings() {
    return useQuery(companySettingsQueryOptions())
}

export function useUpdateCompanySettings() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: UpdateCompanySettingsDto
            signal?: AbortSignal
        }) => companySettingsApi.update(dto, { signal }),
        onSuccess: (company) =>
            cache.setQueryData(companySettingsQueryKey, company),
    })
}
