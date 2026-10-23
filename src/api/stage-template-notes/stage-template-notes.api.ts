import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CreateStageTemplateNoteDto,
    StageTemplateNote,
    StageTemplateNotesListResponse,
    StageTemplateNotesQuery,
    UpdateStageTemplateNoteDto,
} from './stage-template-notes.types'

function notesPath(templateId: number, id?: number) {
    if (
        [templateId, ...(id === undefined ? [] : [id])].some(
            (value) =>
                !Number.isSafeInteger(value) || value < 1 || value > 2147483647,
        )
    )
        throw new RangeError(
            'Positive stage template and note IDs are required',
        )

    return `/stage-templates/${templateId}/notes${id === undefined ? '' : `/${id}`}`
}

export const stageTemplateNotesApi = {
    list: (
        templateId: number,
        query: StageTemplateNotesQuery = {},
        options?: RequestOptions,
    ) =>
        http.get<StageTemplateNotesListResponse>(notesPath(templateId), {
            ...options,
            query: { ...query },
        }),
    create: (
        templateId: number,
        dto: CreateStageTemplateNoteDto,
        options?: RequestOptions,
    ) => http.post<StageTemplateNote>(notesPath(templateId), dto, options),
    update: (
        templateId: number,
        id: number,
        dto: UpdateStageTemplateNoteDto,
        options?: RequestOptions,
    ) => http.patch<StageTemplateNote>(notesPath(templateId, id), dto, options),
    delete: (templateId: number, id: number, options?: RequestOptions) =>
        http.delete<{ success: boolean }>(notesPath(templateId, id), options),
}
