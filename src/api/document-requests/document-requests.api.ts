import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    CreateDocumentRequestDto,
    DocumentRequest,
    DocumentRequestLink,
    DocumentRequestPage,
    DocumentUploadNotificationsPage,
    PublicDocumentRequest,
} from './document-requests.types'

const base = (clientId: number) => `/clients/${clientId}/document-requests`

export const documentRequestsApi = {
    list: (clientId: number, page: number, options?: RequestOptions) =>
        http.get<DocumentRequestPage<DocumentRequest>>(base(clientId), {
            ...options,
            query: { page, limit: 20 },
        }),
    create: (
        clientId: number,
        dto: CreateDocumentRequestDto,
        options?: RequestOptions,
    ) => http.post<DocumentRequestLink>(base(clientId), dto, options),
    renew: (
        clientId: number,
        id: number,
        expiresInDays: number,
        options?: RequestOptions,
    ) =>
        http.post<DocumentRequestLink>(
            `${base(clientId)}/${id}/link`,
            { expiresInDays },
            options,
        ),
    revoke: (clientId: number, id: number, options?: RequestOptions) =>
        http.post<DocumentRequest>(
            `${base(clientId)}/${id}/revoke`,
            undefined,
            options,
        ),
    notifications: (page: number, options?: RequestOptions) =>
        http.get<DocumentUploadNotificationsPage>(
            '/document-upload-notifications',
            { ...options, query: { page, limit: 20 } },
        ),
    read: (id: number, options?: RequestOptions) =>
        http.post<{ success: true }>(
            `/document-upload-notifications/${id}/read`,
            undefined,
            options,
        ),
    view: (token: string, options?: RequestOptions) =>
        http.post<PublicDocumentRequest>(
            '/document-upload-requests/view',
            { token },
            { ...options, auth: false },
        ),
    upload: (token: string, file: File, options?: RequestOptions) => {
        const body = new FormData()

        body.set('token', token)

        body.set('file', file)

        return http.post<{ status: 'submitted' }>(
            '/document-upload-requests/upload',
            body,
            { ...options, auth: false },
        )
    },
}
