import { apiUrl, http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CreatePublicAssetDto,
    PublicAsset,
    PublicAssetsListResponse,
    PublicAssetsQuery,
    TogglePublicAssetPopularResponse,
} from './public-assets.types'

const BASE = '/public-assets'

function assetPath(id: number): string {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        throw new RangeError('A positive public asset ID is required')
    }

    return `${BASE}/${id}`
}

export const publicAssetsApi = {
    create: (
        dto: CreatePublicAssetDto,
        file: File,
        options?: RequestOptions,
    ) => {
        const form = new FormData()

        form.append('bucket', dto.bucket)

        form.append('originalName', dto.originalName.trim())

        form.append('file', file)

        return http.post<PublicAsset>(BASE, form, options)
    },

    list: (query: PublicAssetsQuery = {}, options?: RequestOptions) =>
        http.get<PublicAssetsListResponse>(BASE, {
            ...options,
            query: { ...query },
        }),

    getById: (id: number, options?: RequestOptions) =>
        http.get<PublicAsset>(assetPath(id), options),

    rename: (id: number, originalName: string, options?: RequestOptions) =>
        http.patch<PublicAsset>(
            `${assetPath(id)}/name`,
            { originalName: originalName.trim() },
            options,
        ),

    togglePopular: (id: number, options?: RequestOptions) =>
        http.patch<TogglePublicAssetPopularResponse>(
            `${assetPath(id)}/toggle-popular`,
            undefined,
            options,
        ),

    delete: (id: number, options?: RequestOptions) =>
        http.delete<{ success: true }>(assetPath(id), options),

    fileUrl: (id: number, options?: Pick<RequestOptions, 'baseUrl'>) =>
        apiUrl(`${assetPath(id)}/file`, options),
}
