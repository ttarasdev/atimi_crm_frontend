export interface StageTemplateNote {
    id: number
    stageTemplateId: number
    body: string
    createdAt: string
    updatedAt: string
}

export interface StageTemplateNotesQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
}

export interface StageTemplateNotesListResponse {
    rows: StageTemplateNote[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateStageTemplateNoteDto {
    body: string
}

export type UpdateStageTemplateNoteDto = Partial<CreateStageTemplateNoteDto>
