import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    Client,
    ClientActivityList,
    DuplicateClientsQuery,
    DuplicateClientsResponse,
    ClientsListResponse,
    ClientsQuery,
    CreateClientDto,
    UpdateClientDto,
} from './clients.types'

const BASE = '/clients'

function clientPath(id: number): string {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        throw new RangeError('A positive client ID is required')
    }

    return `${BASE}/${id}`
}

export const clientsApi = {
    activity: (clientId: number, page: number, options?: RequestOptions) =>
        http.get<ClientActivityList>(`${clientPath(clientId)}/activity`, {
            ...options,
            query: { page, limit: 20 },
        }),
    duplicates: (query: DuplicateClientsQuery, options?: RequestOptions) =>
        http.get<DuplicateClientsResponse>('/clients/duplicates', {
            ...options,
            query: { ...query },
        }),
    list: (query: ClientsQuery = {}, options?: RequestOptions) =>
        http.get<ClientsListResponse>(BASE, {
            ...options,
            query: { ...query },
        }),

    getById: (id: number, options?: RequestOptions) =>
        http.get<Client>(clientPath(id), options),

    create: (dto: CreateClientDto, options?: RequestOptions) =>
        http.post<Client>(BASE, dto, options),

    update: (id: number, dto: UpdateClientDto, options?: RequestOptions) =>
        http.patch<Client>(clientPath(id), dto, options),

    archive: (id: number, archived: boolean, options?: RequestOptions) =>
        http.post<Client>(
            `${clientPath(id)}/${archived ? 'archive' : 'restore'}`,
            undefined,
            options,
        ),
}
