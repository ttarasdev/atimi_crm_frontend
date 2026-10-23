import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type { PrivateVariant } from './private-variants.types'

export const privateVariantsApi = {
    getById: (id: number, options?: RequestOptions) =>
        http.get<PrivateVariant>(`/private-variants/${id}`, options),

    rename: (id: number, originalName: string, options?: RequestOptions) =>
        http.patch<PrivateVariant>(
            `/private-variants/${id}/name`,
            { originalName: originalName.trim() },
            options,
        ),
}
