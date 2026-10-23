import { infiniteQueryOptions, skipToken } from '@tanstack/react-query'
import { stageTemplateNotesApi } from '@/api/stage-template-notes/stage-template-notes.api'
import type { StageTemplateNotesQuery } from '@/api/stage-template-notes/stage-template-notes.types'
import { stageTemplateDocumentsApi } from '@/api/stage-template-documents/stage-template-documents.api'
import type { StageTemplateDocumentsQuery } from '@/api/stage-template-documents/stage-template-documents.types'

export const stageTemplateNotesQueryKeys = {
    all: ['stage-template-notes'] as const,
    templateLists: (templateId: number) =>
        ['stage-template-notes', 'list', templateId] as const,
    infinite: (
        templateId: number | null,
        query: Omit<StageTemplateNotesQuery, 'page' | 'limit' | 'offset'>,
    ) =>
        [
            'stage-template-notes',
            'list',
            templateId,
            'infinite',
            query,
        ] as const,
}

export const stageTemplateDocumentsQueryKeys = {
    all: ['stage-template-documents'] as const,
    templateLists: (templateId: number) =>
        ['stage-template-documents', 'list', templateId] as const,
    infinite: (
        templateId: number | null,
        query: Omit<StageTemplateDocumentsQuery, 'page' | 'limit' | 'offset'>,
    ) =>
        [
            'stage-template-documents',
            'list',
            templateId,
            'infinite',
            query,
        ] as const,
}

export function infiniteStageTemplateNotesQueryOptions(
    templateId: number | null,
    query: Omit<StageTemplateNotesQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: stageTemplateNotesQueryKeys.infinite(templateId, query),
        initialPageParam: 1,
        queryFn:
            templateId === null
                ? skipToken
                : ({ signal, pageParam }) =>
                      stageTemplateNotesApi.list(
                          templateId,
                          { ...query, page: pageParam, limit: 20 },
                          { signal },
                      ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function infiniteStageTemplateDocumentsQueryOptions(
    templateId: number | null,
    query: Omit<StageTemplateDocumentsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: stageTemplateDocumentsQueryKeys.infinite(templateId, query),
        initialPageParam: 1,
        queryFn:
            templateId === null
                ? skipToken
                : ({ signal, pageParam }) =>
                      stageTemplateDocumentsApi.list(
                          templateId,
                          { ...query, page: pageParam, limit: 20 },
                          { signal },
                      ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
