'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { stageTemplateNotesApi } from '@/api/stage-template-notes/stage-template-notes.api'
import type {
    CreateStageTemplateNoteDto,
    StageTemplateNotesQuery,
    UpdateStageTemplateNoteDto,
} from '@/api/stage-template-notes/stage-template-notes.types'
import { stageTemplateDocumentsApi } from '@/api/stage-template-documents/stage-template-documents.api'
import type {
    CreateStageTemplateDocumentDto,
    StageTemplateDocumentsQuery,
    UpdateStageTemplateDocumentDto,
} from '@/api/stage-template-documents/stage-template-documents.types'
import {
    infiniteStageTemplateNotesQueryOptions,
    infiniteStageTemplateDocumentsQueryOptions,
    stageTemplateNotesQueryKeys,
    stageTemplateDocumentsQueryKeys,
} from '@/shared/query/stage-template-content-query'
import { stageTemplatesQueryKeys } from '@/shared/query/stage-templates-query'

function invalidateContent(
    cache: QueryClient,
    templateId: number,
    queryKey: readonly unknown[],
) {
    return Promise.all([
        cache.invalidateQueries({ queryKey }),
        cache.invalidateQueries({
            queryKey: stageTemplatesQueryKeys.detail(templateId),
        }),
        cache.invalidateQueries({ queryKey: stageTemplatesQueryKeys.lists }),
    ])
}

export function useInfiniteStageTemplateNotes(
    templateId: number | null,
    query: Omit<StageTemplateNotesQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(
        infiniteStageTemplateNotesQueryOptions(templateId, query),
    )
}

export function useInfiniteStageTemplateDocuments(
    templateId: number | null,
    query: Omit<StageTemplateDocumentsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(
        infiniteStageTemplateDocumentsQueryOptions(templateId, query),
    )
}

export function useCreateStageTemplateNote() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            templateId,
            dto,
            signal,
        }: {
            templateId: number
            dto: CreateStageTemplateNoteDto
            signal?: AbortSignal
        }) => stageTemplateNotesApi.create(templateId, dto, { signal }),
        onSuccess: (_, { templateId }) =>
            invalidateContent(
                cache,
                templateId,
                stageTemplateNotesQueryKeys.templateLists(templateId),
            ),
    })
}

export function useUpdateStageTemplateNote() {
    const cache = useQueryClient()

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
            dto: UpdateStageTemplateNoteDto
            signal?: AbortSignal
        }) => stageTemplateNotesApi.update(templateId, id, dto, { signal }),
        onSuccess: (_, { templateId }) =>
            invalidateContent(
                cache,
                templateId,
                stageTemplateNotesQueryKeys.templateLists(templateId),
            ),
    })
}

export function useDeleteStageTemplateNote() {
    const cache = useQueryClient()

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
        }) => stageTemplateNotesApi.delete(templateId, id, { signal }),
        onSuccess: (_, { templateId }) =>
            invalidateContent(
                cache,
                templateId,
                stageTemplateNotesQueryKeys.templateLists(templateId),
            ),
    })
}

export function useCreateStageTemplateDocument() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            templateId,
            dto,
            signal,
        }: {
            templateId: number
            dto: CreateStageTemplateDocumentDto
            signal?: AbortSignal
        }) => stageTemplateDocumentsApi.create(templateId, dto, { signal }),
        onSuccess: (_, { templateId }) =>
            invalidateContent(
                cache,
                templateId,
                stageTemplateDocumentsQueryKeys.templateLists(templateId),
            ),
    })
}

export function useUpdateStageTemplateDocument() {
    const cache = useQueryClient()

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
            dto: UpdateStageTemplateDocumentDto
            signal?: AbortSignal
        }) => stageTemplateDocumentsApi.update(templateId, id, dto, { signal }),
        onSuccess: (_, { templateId }) =>
            invalidateContent(
                cache,
                templateId,
                stageTemplateDocumentsQueryKeys.templateLists(templateId),
            ),
    })
}

export function useDeleteStageTemplateDocument() {
    const cache = useQueryClient()

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
        }) => stageTemplateDocumentsApi.delete(templateId, id, { signal }),
        onSuccess: (_, { templateId }) =>
            invalidateContent(
                cache,
                templateId,
                stageTemplateDocumentsQueryKeys.templateLists(templateId),
            ),
    })
}

export function useDownloadStageTemplateDocument() {
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
        }) => stageTemplateDocumentsApi.download(templateId, id, { signal }),
    })
}
