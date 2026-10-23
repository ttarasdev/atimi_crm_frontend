'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
    skipToken,
} from '@tanstack/react-query'
import { processTemplatesApi } from '@/api/process-templates/process-templates.api'
import type {
    ProcessTemplatesQuery,
    SaveProcessTemplateDto,
} from '@/api/process-templates/process-templates.types'

export function useProcessTemplates(
    query: Omit<ProcessTemplatesQuery, 'page' | 'limit'> = {},
) {
    return useInfiniteQuery({
        queryKey: ['process-templates', 'list', query],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            processTemplatesApi.list(
                { ...query, page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useProcessTemplate(id: number | null) {
    return useQuery({
        queryKey: ['process-templates', 'detail', id],
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => processTemplatesApi.get(id, { signal }),
    })
}

export function useSaveProcessTemplate() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id?: number
            dto: SaveProcessTemplateDto
            signal?: AbortSignal
        }) =>
            id
                ? processTemplatesApi.update(id, dto, { signal })
                : processTemplatesApi.create(dto, { signal }),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ['process-templates'] }),
    })
}
