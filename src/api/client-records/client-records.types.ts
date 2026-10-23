import type { NoteMention } from '@/api/note-mentions/note-mentions.types'
import type { PrivateAsset } from '@/api/private-assets/private-assets.types'

export interface ClientRecordQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
}

export interface ClientRecordsList<T> {
    rows: T[]
    total: number
    page: number
    limit: number
    offset: number
}

export type ContactType = 'phone' | 'email' | 'whatsapp' | 'telegram'

export interface ClientContact {
    id: number
    clientId: number
    type: ContactType
    value: string
    label: string | null
    isPrimary: boolean
    createdAt: string
    updatedAt: string
}

export interface ClientPreference {
    id: number
    clientId: number
    title: string
    propertyType: string | null
    budgetMin: string | null
    budgetMax: string | null
    currency: string
    areaMin: string | null
    areaMax: string | null
    roomsMin: number | null
    roomsMax: number | null
    locations: string | null
    desiredBy: string | null
    requirements: string | null
    createdAt: string
    updatedAt: string
}

export interface ClientNote {
    mentions?: NoteMention[] | null
    id: number
    clientId: number
    title: string | null
    body: string
    isPinned: boolean
    createdByManagerId: number
    createdAt: string
}

export interface ClientDocument {
    id: number
    clientId: number
    title: string
    category: string | null
    privateAssetId: number
    asset?: PrivateAsset
    createdByManagerId: number
    createdAt: string
    updatedAt: string
}

export interface ClientSource {
    id: number
    name: string
    isActive: boolean
}

export type CreateClientContactDto = Pick<ClientContact, 'type' | 'value'> &
    Partial<Pick<ClientContact, 'label' | 'isPrimary'>>

export type CreateClientPreferenceDto = Pick<ClientPreference, 'title'> &
    Partial<
        Omit<
            ClientPreference,
            'id' | 'clientId' | 'title' | 'createdAt' | 'updatedAt'
        >
    >

export type CreateClientNoteDto = Pick<ClientNote, 'body'> &
    Partial<Pick<ClientNote, 'title' | 'isPinned'>> & {
        mentionedManagerIds?: number[]
    }

export type CreateClientDocumentDto = Pick<
    ClientDocument,
    'title' | 'privateAssetId'
> &
    Partial<Pick<ClientDocument, 'category'>>

export interface ClientRecordDtos {
    contacts: CreateClientContactDto
    preferences: CreateClientPreferenceDto
    notes: CreateClientNoteDto
    documents: CreateClientDocumentDto
}

export type SaveClientRecordVariables = {
    [K in keyof ClientRecordDtos]: {
        kind: K
        clientId: number
        id?: number
        dto: ClientRecordDtos[K]
        signal?: AbortSignal
    }
}[keyof ClientRecordDtos]
