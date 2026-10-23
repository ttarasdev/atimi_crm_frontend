import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    ClientRelation,
    DocumentCard,
    DocumentCardType,
    LegalizationList,
    LegalizationProfile,
    SaveDocumentCardDto,
} from './legalization.types'

const clientPath = (clientId: number) => `/clients/${clientId}`

export const legalizationApi = {
    get: (clientId: number, options?: RequestOptions) =>
        http.get<LegalizationProfile>(
            `${clientPath(clientId)}/legalization`,
            options,
        ),
    update: (
        clientId: number,
        dto: Partial<LegalizationProfile>,
        options?: RequestOptions,
    ) =>
        http.patch<LegalizationProfile>(
            `${clientPath(clientId)}/legalization`,
            dto,
            options,
        ),
    types: (options?: RequestOptions) =>
        http.get<LegalizationList<DocumentCardType>>('/document-card-types', {
            ...options,
            query: { limit: 100 },
        }),
    updateType: (
        id: number,
        dto: Pick<
            DocumentCardType,
            'reminderMonths' | 'reminderTime' | 'notificationEmail'
        >,
        options?: RequestOptions,
    ) =>
        http.patch<DocumentCardType>(
            `/document-card-types/${id}`,
            dto,
            options,
        ),
    cards: (clientId: number, page: number, options?: RequestOptions) =>
        http.get<LegalizationList<DocumentCard>>(
            `${clientPath(clientId)}/document-cards`,
            { ...options, query: { page, limit: 20 } },
        ),
    createCard: (
        clientId: number,
        dto: SaveDocumentCardDto,
        options?: RequestOptions,
    ) =>
        http.post<DocumentCard>(
            `${clientPath(clientId)}/document-cards`,
            dto,
            options,
        ),
    updateCard: (
        clientId: number,
        id: number,
        dto: Partial<SaveDocumentCardDto>,
        options?: RequestOptions,
    ) =>
        http.patch<DocumentCard>(
            `${clientPath(clientId)}/document-cards/${id}`,
            dto,
            options,
        ),
    relations: (clientId: number, page: number, options?: RequestOptions) =>
        http.get<LegalizationList<ClientRelation>>(
            `${clientPath(clientId)}/relations`,
            { ...options, query: { page, limit: 20 } },
        ),
    createRelation: (
        clientId: number,
        dto: Pick<ClientRelation, 'relatedClientId' | 'type'>,
        options?: RequestOptions,
    ) =>
        http.post<ClientRelation>(
            `${clientPath(clientId)}/relations`,
            dto,
            options,
        ),
    deleteRelation: (clientId: number, id: number, options?: RequestOptions) =>
        http.delete<void>(`${clientPath(clientId)}/relations/${id}`, options),
}
