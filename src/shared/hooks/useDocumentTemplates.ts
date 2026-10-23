'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { documentTemplatesApi } from '@/api/document-templates/document-templates.api'
import type {
    CreateDocumentTemplateDto,
    CreateDocumentTypeDto,
    UpdateDocumentTypeDto,
    CreateDocumentFieldDto,
    UpdateDocumentFieldDto,
    DocumentTemplatesQuery,
    GenerateDocumentDto,
    UpdateDocumentTemplateDto,
} from '@/api/document-templates/document-templates.types'
import {
    documentTemplateQueryOptions,
    documentTypesQueryOptions,
    documentFieldsQueryOptions,
    documentPreviewQueryOptions,
    documentTemplatesQueryKeys,
    documentTemplateVariablesQueryOptions,
    infiniteDocumentTemplatesQueryOptions,
} from '@/shared/query/document-templates-query'
import { privateAssetsQueryKeys } from '@/shared/query/private-assets-query'
import { clientsQueryKeys } from '@/shared/query/clients-query'

export function useInfiniteDocumentTemplates(
    query: Omit<DocumentTemplatesQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(infiniteDocumentTemplatesQueryOptions(query))
}

export function useDocumentTemplate(id: number | null) {
    return useQuery(documentTemplateQueryOptions(id))
}

export function useDocumentTemplateVariables() {
    return useQuery(documentTemplateVariablesQueryOptions())
}

export function useCreateDocumentTemplate() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateDocumentTemplateDto
            signal?: AbortSignal
        }) => documentTemplatesApi.create(dto, { signal }),
        onSuccess: () =>
            cache.invalidateQueries({
                queryKey: documentTemplatesQueryKeys.lists,
            }),
    })
}

export function useUpdateDocumentTemplate() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateDocumentTemplateDto
            signal?: AbortSignal
        }) => documentTemplatesApi.update(id, dto, { signal }),
        onSuccess: (_, { id }) =>
            Promise.all([
                cache.invalidateQueries({
                    queryKey: documentTemplatesQueryKeys.detail(id),
                }),
                cache.invalidateQueries({
                    queryKey: documentTemplatesQueryKeys.lists,
                }),
            ]),
    })
}

export function useGenerateDocument() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: GenerateDocumentDto
            signal?: AbortSignal
        }) => documentTemplatesApi.generate(id, dto, { signal }),
        onSuccess: async (asset, { dto }) => {
            cache.setQueryData(privateAssetsQueryKeys.detail(asset.id), asset)

            await Promise.all([
                cache.invalidateQueries({
                    queryKey: privateAssetsQueryKeys.lists,
                }),
                ...(dto.clientId
                    ? [
                          cache.invalidateQueries({
                              queryKey: clientsQueryKeys.records(
                                  dto.clientId,
                                  'documents',
                              ),
                          }),
                      ]
                    : []),
            ])
        },
    })
}

export function useDocumentTypes() {
    return useQuery(documentTypesQueryOptions())
}

export function useDocumentFields() {
    return useQuery(documentFieldsQueryOptions())
}

export function useDocumentPreview(id: number, clientId: number | null) {
    return useQuery(documentPreviewQueryOptions(id, clientId))
}

export function useSaveDocumentType() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: (
            | { id?: undefined; dto: CreateDocumentTypeDto }
            | { id: number; dto: UpdateDocumentTypeDto }
        ) & { signal?: AbortSignal }) =>
            id !== undefined
                ? documentTemplatesApi.updateType(id, dto, { signal })
                : documentTemplatesApi.createType(dto, { signal }),
        onSuccess: () =>
            cache.invalidateQueries({
                queryKey: documentTemplatesQueryKeys.all,
            }),
    })
}

export function useSaveDocumentField() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: (
            | { id?: undefined; dto: CreateDocumentFieldDto }
            | { id: number; dto: UpdateDocumentFieldDto }
        ) & { signal?: AbortSignal }) =>
            id !== undefined
                ? documentTemplatesApi.updateField(id, dto, { signal })
                : documentTemplatesApi.createField(dto, { signal }),
        onSuccess: () =>
            cache.invalidateQueries({
                queryKey: documentTemplatesQueryKeys.all,
            }),
    })
}

export function useAnalyzeDocumentTemplateSource() {
    return useMutation({
        retry: false,
        mutationFn: ({
            privateAssetId,
            signal,
        }: {
            privateAssetId: number
            signal?: AbortSignal
        }) => documentTemplatesApi.analyze(privateAssetId, { signal }),
    })
}
