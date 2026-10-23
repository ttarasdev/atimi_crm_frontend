import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type { ClientNote } from '@/api/client-records/client-records.types'
import type {
    ClientStageNote,
    ClientStageScope,
} from '@/api/client-stage-records/client-stage-records.types'
import type {
    MentionPage,
    MentionRecipient,
    MentionNotificationPage,
} from './note-mentions.types'

export const noteMentionsApi = {
    recipients: (
        clientId: number,
        search: string,
        page: number,
        options?: RequestOptions,
    ) =>
        http.get<MentionPage<MentionRecipient>>(
            `/clients/${clientId}/note-mentions/recipients`,
            { ...options, query: { search, page, limit: 20 } },
        ),
    notifications: (page: number, options?: RequestOptions) =>
        http.get<MentionNotificationPage>('/note-mention-notifications', {
            ...options,
            query: { page, limit: 20 },
        }),
    read: (id: number, options?: RequestOptions) =>
        http.post<{ success: true }>(
            `/note-mention-notifications/${id}/read`,
            undefined,
            options,
        ),
    clientNote: (clientId: number, id: number, options?: RequestOptions) =>
        http.get<ClientNote>(`/clients/${clientId}/notes/${id}`, options),
    stageNote: (
        scope: ClientStageScope,
        id: number,
        options?: RequestOptions,
    ) =>
        http.get<ClientStageNote>(
            `/clients/${scope.clientId}/processes/${scope.processId}/stages/${scope.stageId}/notes/${id}`,
            options,
        ),
}
