export type SearchType =
    | 'client'
    | 'case'
    | 'stage'
    | 'document'
    | 'note'
    | 'lead'
    | 'partner'
    | 'template'
    | 'employee'
    | 'section'

export interface SearchItem {
    type: SearchType
    id: number
    kind: string
    title: string
    subtitle: string
    clientId?: number
    processId?: number
    stageId?: number
    assetId?: number
    key?: string
}

export interface SearchGroup {
    type: SearchType
    items: SearchItem[]
    hasMore: boolean
}

export interface SearchResponse {
    query: string
    mode: 'suggestions' | 'results'
    groups: SearchGroup[]
}

export interface SearchPage {
    rows: SearchItem[]
    total: number
    page: number
    limit: number
    offset: number
}
