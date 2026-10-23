'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { stageTemplatesApi } from '@/api/stage-templates/stage-templates.api'
import type {
    CreateStageTemplateDto,
    StageTemplatesQuery,
    UpdateStageTemplateDto,
} from '@/api/stage-templates/stage-templates.types'
import { stageTemplateTasksApi } from '@/api/stage-template-tasks/stage-template-tasks.api'
import type {
    CreateStageTemplateTaskDto,
    ReorderStageTemplateTaskDto,
    StageTemplateTasksQuery,
    UpdateStageTemplateTaskDto,
} from '@/api/stage-template-tasks/stage-template-tasks.types'
import {
    infiniteStageTemplatesQueryOptions,
    infiniteStageTemplateTasksQueryOptions,
    stageTemplateQueryOptions,
    stageTemplatesQueryKeys,
    stageTemplatesQueryOptions,
    stageTemplateTasksQueryKeys,
    stageTemplateTasksQueryOptions,
} from '@/shared/query/stage-templates-query'

async function invalidateTemplate(
    queryClient: QueryClient,
    templateId: number,
) {
    await Promise.all([
        queryClient.invalidateQueries({
            queryKey: stageTemplatesQueryKeys.lists,
        }),
        queryClient.invalidateQueries({
            queryKey: stageTemplatesQueryKeys.detail(templateId),
        }),
        queryClient.invalidateQueries({
            queryKey: stageTemplateTasksQueryKeys.templateLists(templateId),
        }),
    ])
}

export function useStageTemplates(query: StageTemplatesQuery = {}) {
    return useQuery(stageTemplatesQueryOptions(query))
}

export function useInfiniteStageTemplates(
    query: Omit<StageTemplatesQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(infiniteStageTemplatesQueryOptions(query))
}

export function useStageTemplate(id: number | null) {
    return useQuery(stageTemplateQueryOptions(id))
}

export function useStageTemplateTasks(
    templateId: number | null,
    query: StageTemplateTasksQuery = {},
) {
    return useQuery(stageTemplateTasksQueryOptions(templateId, query))
}

export function useInfiniteStageTemplateTasks(
    templateId: number | null,
    query: Omit<StageTemplateTasksQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(
        infiniteStageTemplateTasksQueryOptions(templateId, query),
    )
}

export function useCreateStageTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateStageTemplateDto
            signal?: AbortSignal
        }) => stageTemplatesApi.create(dto, { signal }),

        onSuccess: async (template) => {
            queryClient.setQueryData(
                stageTemplatesQueryKeys.detail(template.id),
                template,
            )

            await queryClient.invalidateQueries({
                queryKey: stageTemplatesQueryKeys.lists,
            })
        },
    })
}

export function useUpdateStageTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateStageTemplateDto
            signal?: AbortSignal
        }) => stageTemplatesApi.update(id, dto, { signal }),

        onSuccess: async (template, { id }) => {
            queryClient.setQueryData(
                stageTemplatesQueryKeys.detail(id),
                template,
            )

            await invalidateTemplate(queryClient, id)
        },
    })
}

export function useCreateStageTemplateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            templateId,
            dto,
            signal,
        }: {
            templateId: number
            dto: CreateStageTemplateTaskDto
            signal?: AbortSignal
        }) => stageTemplateTasksApi.create(templateId, dto, { signal }),

        onSuccess: (_, { templateId }) =>
            invalidateTemplate(queryClient, templateId),
    })
}

export function useUpdateStageTemplateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            templateId,
            id,
            dto,
            signal,
        }: {
            templateId: number
            id: number
            dto: UpdateStageTemplateTaskDto
            signal?: AbortSignal
        }) => stageTemplateTasksApi.update(templateId, id, dto, { signal }),

        onSuccess: (_, { templateId }) =>
            invalidateTemplate(queryClient, templateId),
    })
}

export function useDeleteStageTemplateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            templateId,
            id,
            signal,
        }: {
            templateId: number
            id: number
            signal?: AbortSignal
        }) => stageTemplateTasksApi.delete(templateId, id, { signal }),

        onSuccess: (_, { templateId }) =>
            invalidateTemplate(queryClient, templateId),
    })
}

export function useReorderStageTemplateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            templateId,
            id,
            direction,
            signal,
        }: {
            templateId: number
            id: number
            direction: ReorderStageTemplateTaskDto['direction']
            signal?: AbortSignal
        }) =>
            stageTemplateTasksApi.reorder(
                templateId,
                id,
                { direction },
                { signal },
            ),

        onSuccess: (_, { templateId }) =>
            invalidateTemplate(queryClient, templateId),
    })
}
