import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    ProcessTemplate,
    ProcessTemplatesList,
    ProcessTemplatesQuery,
    SaveProcessTemplateDto,
} from './process-templates.types'

export const processTemplatesApi = {
    list: (query: ProcessTemplatesQuery = {}, options?: RequestOptions) =>
        http.get<ProcessTemplatesList>('/process-templates', {
            ...options,
            query: { ...query },
        }),
    get: (id: number, options?: RequestOptions) =>
        http.get<ProcessTemplate>(`/process-templates/${id}`, options),
    create: (dto: SaveProcessTemplateDto, options?: RequestOptions) =>
        http.post<ProcessTemplate>('/process-templates', dto, options),
    update: (
        id: number,
        dto: Partial<SaveProcessTemplateDto>,
        options?: RequestOptions,
    ) => http.patch<ProcessTemplate>(`/process-templates/${id}`, dto, options),
}
