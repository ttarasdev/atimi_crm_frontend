import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    AssetVisibility,
    CreatePrivateAssetDto,
    PrivateAsset,
    PrivateAssetsListResponse,
    PrivateAssetsQuery,
} from './private-assets.types'

export const privateAssetsApi = {
    list: (query: PrivateAssetsQuery = {}, options?: RequestOptions) =>
        http.get<PrivateAssetsListResponse>('/private-assets', {
            ...options,
            query: { ...query },
        }),
    get: (id: number, options?: RequestOptions) =>
        http.get<PrivateAsset>(`/private-assets/${id}`, options),
    create: (
        dto: CreatePrivateAssetDto,
        file: File,
        options?: RequestOptions,
    ) => {
        const body = new FormData()

        body.set('bucket', dto.bucket)

        body.set('originalName', dto.originalName.trim())

        body.set('visibility', dto.visibility ?? 'author')

        body.set('file', file)

        return http.post<PrivateAsset>('/private-assets', body, options)
    },
    setVisibility: (
        id: number,
        visibility: AssetVisibility,
        options?: RequestOptions,
    ) =>
        http.patch<PrivateAsset>(
            `/private-assets/${id}/visibility`,
            { visibility },
            options,
        ),
    delete: (id: number, options?: RequestOptions) =>
        http.delete<{ success: true }>(`/private-assets/${id}`, options),
    rename: (id: number, originalName: string, options?: RequestOptions) =>
        http.patch<PrivateAsset>(
            `/private-assets/${id}/name`,
            { originalName },
            options,
        ),
    download: (id: number, options?: RequestOptions) =>
        http.getBlob(`/private-assets/${id}/file`, options),
}
