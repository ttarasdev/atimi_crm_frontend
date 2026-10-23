import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CreateStageTemplateDto,
    StageTemplate,
    StageTemplatesListResponse,
    StageTemplatesQuery,
    UpdateStageTemplateDto,
} from './stage-templates.types'

const BASE = '/stage-templates'

function templatePath(id: number): string {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        throw new RangeError('A positive stage template ID is required')
    }

    return `${BASE}/${id}`
}

export const stageTemplatesApi = {
    list: (query: StageTemplatesQuery = {}, options?: RequestOptions) =>
        http.get<StageTemplatesListResponse>(BASE, {
            ...options,
            query: { ...query },
        }),

    getById: (id: number, options?: RequestOptions) =>
        http.get<StageTemplate>(templatePath(id), options),

    create: (dto: CreateStageTemplateDto, options?: RequestOptions) =>
        http.post<StageTemplate>(BASE, dto, options),

    update: (
        id: number,
        dto: UpdateStageTemplateDto,
        options?: RequestOptions,
    ) => http.patch<StageTemplate>(templatePath(id), dto, options),
}
