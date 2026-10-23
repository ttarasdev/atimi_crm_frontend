import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CreateStageTemplateDocumentDto,
    StageTemplateDocument,
    StageTemplateDocumentsListResponse,
    StageTemplateDocumentsQuery,
    UpdateStageTemplateDocumentDto,
} from './stage-template-documents.types'

function documentsPath(templateId: number, id?: number) {
    if (
        [templateId, ...(id === undefined ? [] : [id])].some(
            (value) =>
                !Number.isSafeInteger(value) || value < 1 || value > 2147483647,
        )
    )
        throw new RangeError(
            'Positive stage template and document IDs are required',
        )

    return `/stage-templates/${templateId}/documents${id === undefined ? '' : `/${id}`}`
}

export const stageTemplateDocumentsApi = {
    list: (
        templateId: number,
        query: StageTemplateDocumentsQuery = {},
        options?: RequestOptions,
    ) =>
        http.get<StageTemplateDocumentsListResponse>(
            documentsPath(templateId),
            {
                ...options,
                query: { ...query },
            },
        ),
    getById: (templateId: number, id: number, options?: RequestOptions) =>
        http.get<StageTemplateDocument>(documentsPath(templateId, id), options),
    create: (
        templateId: number,
        dto: CreateStageTemplateDocumentDto,
        options?: RequestOptions,
    ) =>
        http.post<StageTemplateDocument>(
            documentsPath(templateId),
            dto,
            options,
        ),
    update: (
        templateId: number,
        id: number,
        dto: UpdateStageTemplateDocumentDto,
        options?: RequestOptions,
    ) =>
        http.patch<StageTemplateDocument>(
            documentsPath(templateId, id),
            dto,
            options,
        ),
    delete: (templateId: number, id: number, options?: RequestOptions) =>
        http.delete<{ success: boolean }>(
            documentsPath(templateId, id),
            options,
        ),
    download: (templateId: number, id: number, options?: RequestOptions) =>
        http.getBlob(`${documentsPath(templateId, id)}/file`, options),
}
