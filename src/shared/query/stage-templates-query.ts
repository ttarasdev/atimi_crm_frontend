import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { stageTemplatesApi } from '@/api/stage-templates/stage-templates.api'
import type { StageTemplatesQuery } from '@/api/stage-templates/stage-templates.types'
import { stageTemplateTasksApi } from '@/api/stage-template-tasks/stage-template-tasks.api'
import type { StageTemplateTasksQuery } from '@/api/stage-template-tasks/stage-template-tasks.types'

export const stageTemplatesQueryKeys = {
    all: ['stage-templates'] as const,
    lists: ['stage-templates', 'list'] as const,

    list: (query: StageTemplatesQuery = {}) =>
        ['stage-templates', 'list', query] as const,

    infinite: (query: Omit<StageTemplatesQuery, 'page' | 'limit' | 'offset'>) =>
        ['stage-templates', 'list', 'infinite', query] as const,

    details: ['stage-templates', 'detail'] as const,

    detail: (id: number | null) => ['stage-templates', 'detail', id] as const,
}

export const stageTemplateTasksQueryKeys = {
    all: ['stage-template-tasks'] as const,
    lists: ['stage-template-tasks', 'list'] as const,

    templateLists: (templateId: number | null) =>
        ['stage-template-tasks', 'list', templateId] as const,

    list: (templateId: number | null, query: StageTemplateTasksQuery = {}) =>
        ['stage-template-tasks', 'list', templateId, query] as const,

    infinite: (
        templateId: number | null,
        query: Omit<StageTemplateTasksQuery, 'page' | 'limit' | 'offset'>,
    ) =>
        [
            'stage-template-tasks',
            'list',
            templateId,
            'infinite',
            query,
        ] as const,
}

export function stageTemplatesQueryOptions(query: StageTemplatesQuery = {}) {
    return queryOptions({
        queryKey: stageTemplatesQueryKeys.list(query),
        queryFn: ({ signal }) => stageTemplatesApi.list(query, { signal }),
    })
}

export function stageTemplateQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: stageTemplatesQueryKeys.detail(id),

        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => stageTemplatesApi.getById(id, { signal }),
    })
}

export function infiniteStageTemplatesQueryOptions(
    query: Omit<StageTemplatesQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: stageTemplatesQueryKeys.infinite(query),
        initialPageParam: 1,

        queryFn: ({ signal, pageParam }) =>
            stageTemplatesApi.list(
                { ...query, page: pageParam, limit: 100 },
                { signal },
            ),

        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function stageTemplateTasksQueryOptions(
    templateId: number | null,
    query: StageTemplateTasksQuery = {},
) {
    return queryOptions({
        queryKey: stageTemplateTasksQueryKeys.list(templateId, query),

        queryFn:
            templateId === null
                ? skipToken
                : ({ signal }) =>
                      stageTemplateTasksApi.list(templateId, query, { signal }),
    })
}

export function infiniteStageTemplateTasksQueryOptions(
    templateId: number | null,
    query: Omit<StageTemplateTasksQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: stageTemplateTasksQueryKeys.infinite(templateId, query),
        initialPageParam: 1,

        queryFn:
            templateId === null
                ? skipToken
                : ({ signal, pageParam }) =>
                      stageTemplateTasksApi.list(
                          templateId,
                          { ...query, page: pageParam, limit: 100 },
                          { signal },
                      ),

        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
