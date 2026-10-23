import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    ClientProcess,
    ClientProcessesListResponse,
    ClientProcessesQuery,
    ClientProcessStatus,
    CreateClientProcessDto,
    UpdateClientProcessDto,
} from './client-processes.types'

function processesPath(clientId: number, id?: number): string {
    if (
        !Number.isSafeInteger(clientId) ||
        clientId < 1 ||
        clientId > 2147483647 ||
        (id !== undefined &&
            (!Number.isSafeInteger(id) || id < 1 || id > 2147483647))
    ) {
        throw new RangeError('Positive client and process IDs are required')
    }

    return `/clients/${clientId}/processes${id === undefined ? '' : `/${id}`}`
}

export const clientProcessesApi = {
    list: (
        clientId: number,
        query: ClientProcessesQuery = {},
        options?: RequestOptions,
    ) =>
        http.get<ClientProcessesListResponse>(processesPath(clientId), {
            ...options,
            query: { ...query },
        }),

    getById: (clientId: number, id: number, options?: RequestOptions) =>
        http.get<ClientProcess>(processesPath(clientId, id), options),

    create: (
        clientId: number,
        dto: CreateClientProcessDto,
        options?: RequestOptions,
    ) => http.post<ClientProcess>(processesPath(clientId), dto, options),

    update: (
        clientId: number,
        id: number,
        dto: UpdateClientProcessDto,
        options?: RequestOptions,
    ) => http.patch<ClientProcess>(processesPath(clientId, id), dto, options),

    setStatus: (
        clientId: number,
        id: number,
        status: ClientProcessStatus,
        options?: RequestOptions,
    ) =>
        http.patch<ClientProcess>(
            `${processesPath(clientId, id)}/status`,
            { status },
            options,
        ),
}
