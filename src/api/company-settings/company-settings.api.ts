import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CompanySettings,
    UpdateCompanySettingsDto,
} from './company-settings.types'

export const companySettingsApi = {
    get: (options?: RequestOptions) =>
        http.get<CompanySettings>('/company-settings', options),
    update: (dto: UpdateCompanySettingsDto, options?: RequestOptions) =>
        http.patch<CompanySettings>('/company-settings', dto, options),
}
