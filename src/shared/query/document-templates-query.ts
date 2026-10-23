import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { documentTemplatesApi } from '@/api/document-templates/document-templates.api'
import type {
    DocumentTemplatesQuery,
    DocumentType,
    DocumentField,
} from '@/api/document-templates/document-templates.types'

export const documentTemplatesQueryKeys = {
    all: ['document-templates'] as const,
    lists: ['document-templates', 'list'] as const,
    infinite: (
        query: Omit<DocumentTemplatesQuery, 'page' | 'limit' | 'offset'>,
    ) => ['document-templates', 'list', 'infinite', query] as const,
    detail: (id: number | null) =>
        ['document-templates', 'detail', id] as const,
    variables: ['document-templates', 'variables'] as const,
    types: ['document-templates', 'types'] as const,
    fields: ['document-templates', 'fields'] as const,
    preview: (id: number, clientId: number | null) =>
        ['document-templates', 'preview', id, clientId] as const,
}

export function infiniteDocumentTemplatesQueryOptions(
    query: Omit<DocumentTemplatesQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: documentTemplatesQueryKeys.infinite(query),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            documentTemplatesApi.list(
                { ...query, page: pageParam, limit: 20 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function documentTemplateQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: documentTemplatesQueryKeys.detail(id),
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => documentTemplatesApi.get(id, { signal }),
    })
}

export function documentTemplateVariablesQueryOptions() {
    return queryOptions({
        queryKey: documentTemplatesQueryKeys.variables,
        queryFn: ({ signal }) => documentTemplatesApi.variables({ signal }),
        staleTime: 300000,
    })
}

export function documentTypesQueryOptions() {
    return queryOptions({
        queryKey: documentTemplatesQueryKeys.types,
        queryFn: async ({ signal }) => {
            const rows: DocumentType[] = []

            let page = 1

            while (true) {
                const result = await documentTemplatesApi.types(
                    { page, limit: 100 },
                    { signal },
                )

                rows.push(...result.rows)

                if (!result.rows.length || rows.length >= result.total)
                    return rows

                page++
            }
        },
    })
}

export function documentFieldsQueryOptions() {
    return queryOptions({
        queryKey: documentTemplatesQueryKeys.fields,
        queryFn: async ({ signal }) => {
            const rows: DocumentField[] = []

            let page = 1

            while (true) {
                const result = await documentTemplatesApi.fields(
                    { page, limit: 100 },
                    { signal },
                )

                rows.push(...result.rows)

                if (!result.rows.length || rows.length >= result.total)
                    return rows

                page++
            }
        },
    })
}

export function documentPreviewQueryOptions(
    id: number,
    clientId: number | null,
) {
    return queryOptions({
        queryKey: documentTemplatesQueryKeys.preview(id, clientId),
        queryFn: ({ signal }) =>
            documentTemplatesApi.preview(id, clientId ?? undefined, { signal }),
        staleTime: 0,
    })
}
