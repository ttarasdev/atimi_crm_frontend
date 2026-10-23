import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    MailPreset,
    MailPresetsQuery,
    MailPresetsList,
    CreateMailPresetDto,
    UpdateMailPresetDto,
} from '@/api/mail/mail.types'

export const mailPresetsApi = {
    get: (id: number, options?: RequestOptions) =>
        http.get<MailPreset>(`/mail-presets/${id}`, options),
    list: (query: MailPresetsQuery = {}, options?: RequestOptions) =>
        http.get<MailPresetsList>('/mail-presets', {
            ...options,
            query: { ...query },
        }),
    create: (dto: CreateMailPresetDto, options?: RequestOptions) =>
        http.post<MailPreset>('/mail-presets', dto, options),
    update: (id: number, dto: UpdateMailPresetDto, options?: RequestOptions) =>
        http.patch<MailPreset>(`/mail-presets/${id}`, dto, options),
    delete: (id: number, options?: RequestOptions) =>
        http.delete<{ success: true }>(`/mail-presets/${id}`, options),
}
