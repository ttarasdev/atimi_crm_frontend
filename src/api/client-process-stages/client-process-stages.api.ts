import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    ClientProcessStage,
    ClientProcessStagesListResponse,
    ClientProcessStagesQuery,
    ClientProcessStageStatus,
    CreateClientProcessStageDto,
    UpdateClientProcessStageDto,
} from './client-process-stages.types'

function stagesPath(clientId: number, processId: number, id?: number): string {
    if (
        [clientId, processId, ...(id === undefined ? [] : [id])].some(
            (value) =>
                !Number.isSafeInteger(value) || value < 1 || value > 2147483647,
        )
    ) {
        throw new RangeError(
            'Positive client, process and stage IDs are required',
        )
    }

    return `/clients/${clientId}/processes/${processId}/stages${id === undefined ? '' : `/${id}`}`
}

export const clientProcessStagesApi = {
    list: (
        clientId: number,
        processId: number,
        query: ClientProcessStagesQuery = {},
        options?: RequestOptions,
    ) =>
        http.get<ClientProcessStagesListResponse>(
            stagesPath(clientId, processId),
            { ...options, query: { ...query } },
        ),

    getById: (
        clientId: number,
        processId: number,
        id: number,
        options?: RequestOptions,
    ) =>
        http.get<ClientProcessStage>(
            stagesPath(clientId, processId, id),
            options,
        ),

    create: (
        clientId: number,
        processId: number,
        dto: CreateClientProcessStageDto,
        options?: RequestOptions,
    ) =>
        http.post<ClientProcessStage>(
            stagesPath(clientId, processId),
            dto,
            options,
        ),

    update: (
        clientId: number,
        processId: number,
        id: number,
        dto: UpdateClientProcessStageDto,
        options?: RequestOptions,
    ) =>
        http.patch<ClientProcessStage>(
            stagesPath(clientId, processId, id),
            dto,
            options,
        ),

    setStatus: (
        clientId: number,
        processId: number,
        id: number,
        status: ClientProcessStageStatus,
        options?: RequestOptions,
    ) =>
        http.patch<ClientProcessStage>(
            `${stagesPath(clientId, processId, id)}/status`,
            { status },
            options,
        ),

    reorder: (
        clientId: number,
        processId: number,
        id: number,
        direction: 'up' | 'down',
        options?: RequestOptions,
    ) =>
        http.patch<ClientProcessStage[]>(
            `${stagesPath(clientId, processId, id)}/order`,
            { direction },
            options,
        ),

    delete: (
        clientId: number,
        processId: number,
        id: number,
        options?: RequestOptions,
    ) =>
        http.delete<{ success: true }>(
            stagesPath(clientId, processId, id),
            options,
        ),
}
